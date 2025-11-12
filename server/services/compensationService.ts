/**
 * Compensation & Award Service
 * Handles valuation, LOI, award generation, finance approval, and payment tracking
 */

import { storage } from "../storage";
import { workflowService } from "./workflowService";
import { pdfService } from "./pdfService";
import { notificationService } from "./notificationService";
import { InsertValuation, InsertAward, InsertPayment } from "@shared/schema";
import { LAMS_ROLES } from "@shared/roles";

export class CompensationService {
  /**
   * Calculate compensation amount based on valuation inputs
   */
  calculateCompensation(
    circleRate: number,
    areaSqM: number,
    multipliers: Record<string, number> = {}
  ): number {
    // Base calculation: circle_rate * area
    let amount = circleRate * areaSqM;

    // Apply multipliers
    Object.values(multipliers).forEach(multiplier => {
      amount *= multiplier;
    });

    return Math.round(amount * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Create valuation for a parcel
   */
  async createValuation(
    valuationData: Omit<InsertValuation, 'computedAmount'>,
    userId: number
  ): Promise<any> {
    try {
      // Verify parcel exists
      const parcel = await storage.getParcel(valuationData.parcelId);
      if (!parcel) {
        throw new Error('Parcel not found');
      }

      // Calculate compensation
      const multipliers = valuationData.factorMultipliersJson as Record<string, number> || {};
      const computedAmount = this.calculateCompensation(
        Number(valuationData.circleRate),
        Number(parcel.areaSqM),
        multipliers
      );

      // Create valuation with area from parcel and created_by
      const valuation = await storage.createValuation({
        ...valuationData,
        areaSqM: parcel.areaSqM ? Number(parcel.areaSqM).toFixed(2) : '0.00',
        circleRate: valuationData.circleRate ? String(valuationData.circleRate) : valuationData.circleRate,
        computedAmount: computedAmount.toFixed(2),
        createdBy: userId,
      });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'create_valuation',
        resourceType: 'valuation',
        resourceId: valuation.id,
        details: { parcelId: valuationData.parcelId, computedAmount },
      });

      return valuation;
    } catch (error) {
      console.error('Error creating valuation:', error);
      throw error;
    }
  }

  /**
   * Generate LOI number (LOI-YYYY-XXX)
   */
  private async generateLoiNo(): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await storage.getNextSequenceValue('LOI');
    return `LOI-${year}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Generate Award number (AWARD-YYYY-XXX)
   */
  private async generateAwardNo(): Promise<string> {
    const year = new Date().getFullYear();
    const sequence = await storage.getNextSequenceValue('AWARD');
    return `AWARD-${year}-${sequence.toString().padStart(3, '0')}`;
  }

  /**
   * Create award (with LOI generation)
   */
  async createAward(
    awardData: Omit<InsertAward, 'awardNo' | 'loiNo' | 'status'>,
    userId: number
  ): Promise<any> {
    try {
      // Verify parcel and owner exist
      const parcel = await storage.getParcel(awardData.parcelId);
      if (!parcel) {
        throw new Error('Parcel not found');
      }

      const owner = await storage.getOwner(awardData.ownerId);
      if (!owner) {
        throw new Error('Owner not found');
      }

      // Verify or create parcel-owner relationship
      let parcelOwners = await storage.getParcelOwners(awardData.parcelId);
      let ownerShare = parcelOwners.find(po => po.ownerId === awardData.ownerId);
      
      if (!ownerShare) {
        // If parcel has no owners, create relationship with 100% share
        if (parcelOwners.length === 0) {
          await storage.createParcelOwner({
            parcelId: awardData.parcelId,
            ownerId: awardData.ownerId,
            sharePct: '100.00',
          });
          parcelOwners = await storage.getParcelOwners(awardData.parcelId);
          ownerShare = parcelOwners.find(po => po.ownerId === awardData.ownerId);
        } else {
          // If parcel has owners but this owner is not one of them, try to add them
          // Calculate total share
          const totalShare = parcelOwners.reduce((sum, po) => sum + Number(po.sharePct), 0);
          const remainingShare = 100 - totalShare;
          
          if (remainingShare > 0) {
            // Add owner with remaining share
            await storage.createParcelOwner({
              parcelId: awardData.parcelId,
              ownerId: awardData.ownerId,
              sharePct: remainingShare.toFixed(2),
            });
            parcelOwners = await storage.getParcelOwners(awardData.parcelId);
            ownerShare = parcelOwners.find(po => po.ownerId === awardData.ownerId);
          } else {
            throw new Error('Owner does not have a share in this parcel. Parcel ownership is already fully allocated.');
          }
        }
      }

      // Get valuation
      const valuation = await storage.getValuationByParcel(awardData.parcelId);
      if (!valuation) {
        throw new Error('Valuation not found for this parcel');
      }

      // Calculate owner's share of compensation
      if (!ownerShare) {
        throw new Error('Owner share not found for this parcel');
      }
      const ownerAmount = (Number(valuation.computedAmount) * Number(ownerShare.sharePct)) / 100;

      // Generate LOI and Award numbers
      const loiNo = await this.generateLoiNo();
      const awardNo = await this.generateAwardNo();

      // Create award
      const award = await storage.createAward({
        ...awardData,
        awardNo,
        loiNo,
        amount: ownerAmount.toFixed(2),
        status: 'draft',
        createdBy: userId,
      });

      // Generate LOI PDF
      // Note: generateLoiPdf only accepts bankDetails as optional 6th param, not mode/breakdown
      const { filePath: loiPath, hash: loiHash } = await pdfService.generateLoiPdf(
        award.id,
        loiNo,
        owner.name,
        parcel.parcelNo,
        ownerAmount
      );

      // Update award with LOI path
      const updatedAward = await storage.updateAward(award.id, {
        loiPdfPath: loiPath,
      });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'create_award',
        resourceType: 'award',
        resourceId: award.id,
        details: { awardNo, loiNo, amount: ownerAmount },
      });

      return { ...updatedAward, loiHash };
    } catch (error) {
      console.error('Error creating award:', error);
      throw error;
    }
  }

  /**
   * Submit award for finance review
   */
  async submitForFinanceReview(awardId: number, userId: number): Promise<any> {
    try {
      const award = await storage.getAward(awardId);
      if (!award) {
        throw new Error('Award not found');
      }

      if (award.status !== 'draft') {
        throw new Error('Only draft awards can be submitted for finance review');
      }

      // Transition to finance review state
      await workflowService.transitionAwardState(awardId, 'fin_review', userId);
      const updated = await storage.updateAward(awardId, {
        status: 'fin_review',
      });

      // Create tasks for finance officers
      const financeOfficers = await storage.getAllUsers();
      const officers = financeOfficers.filter(
        u => u.role === LAMS_ROLES.FINANCE_OFFICER || u.role === LAMS_ROLES.ADMIN
      );

      for (const officer of officers) {
        await storage.createTask({
          assigneeId: officer.id,
          requestType: 'award',
          requestId: awardId,
          taskType: 'approval',
          title: `Finance Review Required - ${award.awardNo}`,
          description: `Please review and approve award ${award.awardNo} for payment processing.`,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours SLA
        });

        await notificationService.createNotification({
          userId: officer.id,
          title: 'Finance Review Required',
          message: `Award ${award.awardNo} requires your finance review`,
          type: 'approval_needed',
          relatedType: 'award',
          relatedId: awardId,
        });
      }

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'submit_finance_review',
        resourceType: 'award',
        resourceId: awardId,
        details: { awardNo: award.awardNo },
      });

      return updated;
    } catch (error) {
      console.error('Error submitting for finance review:', error);
      throw error;
    }
  }

  /**
   * Approve award (finance officer)
   */
  async approveAward(awardId: number, approverId: number, comments?: string): Promise<any> {
    try {
      const award = await storage.getAward(awardId);
      if (!award) {
        throw new Error('Award not found');
      }

      if (award.status !== 'fin_review') {
        throw new Error('Award must be in finance review status to be approved');
      }

      // Check user role
      const user = await storage.getUser(approverId);
      if (user?.role !== LAMS_ROLES.FINANCE_OFFICER && user?.role !== LAMS_ROLES.ADMIN) {
        throw new Error('Only finance officers can approve awards');
      }

      // Get parcel and owner details for PDF generation
      const parcel = await storage.getParcel(award.parcelId);
      const owner = await storage.getOwner(award.ownerId);
      const valuation = await storage.getValuationByParcel(award.parcelId);

      // Generate Award PDF
      const { filePath: awardPath, hash: awardHash } = await pdfService.generateAwardPdf(
        awardId,
        award.awardNo || '',
        owner?.name || 'Unknown',
        parcel?.parcelNo || 'Unknown',
        Number(award.amount),
        award.mode as 'cash' | 'pooling' | 'hybrid',
        valuation ? {
          circleRate: Number(valuation.circleRate),
          area: Number(parcel?.areaSqM || 0),
          multipliers: valuation.factorMultipliersJson as any,
        } : undefined
      );

      // Transition to issued state
      await workflowService.transitionAwardState(awardId, 'issued', approverId);
      const updated = await storage.updateAward(awardId, {
        status: 'issued',
        awardPdfPath: awardPath,
        awardDate: new Date(),
        approvedBy: approverId,
      } as Partial<InsertAward>);

      // Notify case officer
      await notificationService.createNotification({
        userId: award.createdBy || 0,
        title: 'Award Approved',
        message: `Award ${award.awardNo} has been approved and issued`,
        type: 'status_update',
        relatedType: 'award',
        relatedId: awardId,
      });

      // Notify owner if they have a user account
      if (owner) {
        // Check if owner has a user account (by phone or aadhaar)
        const ownerUser = owner.phone
          ? await storage.getUserByEmail(owner.phone) // This might need adjustment based on your user lookup
          : null;

        if (ownerUser) {
          await notificationService.createNotification({
            userId: ownerUser.id,
            title: 'Award Issued',
            message: `Your award ${award.awardNo} has been issued. Amount: ₹${award.amount}`,
            type: 'status_update',
            relatedType: 'award',
            relatedId: awardId,
          });
        }
      }

      // Create audit log
      await storage.createAuditLog({
        userId: approverId,
        action: 'approve_award',
        resourceType: 'award',
        resourceId: awardId,
        details: { awardNo: award.awardNo, comments, hash: awardHash },
      });

      return { ...updated, awardHash };
    } catch (error) {
      console.error('Error approving award:', error);
      throw error;
    }
  }

  /**
   * Record payment
   */
  async recordPayment(
    paymentData: Omit<InsertPayment, 'status'>,
    userId: number
  ): Promise<any> {
    try {
      const award = await storage.getAward(paymentData.awardId);
      if (!award) {
        throw new Error('Award not found');
      }

      if (award.status !== 'issued') {
        throw new Error('Payment can only be recorded for issued awards');
      }

      // Create payment
      const payment = await storage.createPayment({
        ...paymentData,
        amount: paymentData.amount ? String(paymentData.amount) : paymentData.amount,
        status: 'initiated',
      });

      // Get owner for receipt
      const owner = await storage.getOwner(award.ownerId);
      
      // Generate payment receipt PDF
      const { filePath: receiptPath, hash: receiptHash } = await pdfService.generatePaymentReceipt(
        payment.id,
        award.awardNo || '',
        owner?.name || 'Unknown',
        Number(payment.amount),
        payment.mode as 'neft' | 'upi' | 'pfms',
        payment.referenceNo || '',
        new Date()
      );

      // Update payment with receipt path
      const updatedPayment = await storage.updatePayment(payment.id, {
        receiptPdfPath: receiptPath,
      });

      // If payment is successful, update award status
      // Note: paymentData doesn't have status since it's Omit<InsertPayment, 'status'>
      // Status is set to 'initiated' when creating payment, check payment.status instead
      if (payment.status === 'success') {
        await storage.updatePayment(payment.id, {
          status: 'success',
          paidOn: new Date(),
        } as Partial<InsertPayment>);

        // Check if all payments for this award are complete
        const allPayments = await storage.getPaymentsByAward(paymentData.awardId);
        const totalPaid = allPayments
          .filter(p => p.status === 'success')
          .reduce((sum, p) => sum + Number(p.amount), 0);

        if (totalPaid >= Number(award.amount)) {
          // All payments complete - mark award as paid
          await workflowService.transitionAwardState(paymentData.awardId, 'paid', userId);
          await storage.updateAward(paymentData.awardId, {
            status: 'paid',
          });

          // Update parcel status
          const parcel = await storage.getParcel(award.parcelId);
          if (parcel) {
            await storage.updateParcel(award.parcelId, {
              status: 'awarded',
            });
          }
        }
      }

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'record_payment',
        resourceType: 'payment',
        resourceId: payment.id,
        details: { awardId: paymentData.awardId, amount: paymentData.amount, hash: receiptHash },
      });

      return { ...updatedPayment, receiptHash };
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  }

  /**
   * Get award with related data
   */
  async getAwardWithDetails(awardId: number): Promise<any> {
    try {
      const award = await storage.getAward(awardId);
      if (!award) {
        throw new Error('Award not found');
      }

      const parcel = await storage.getParcel(award.parcelId);
      const owner = await storage.getOwner(award.ownerId);
      const valuation = await storage.getValuationByParcel(award.parcelId);
      const payments = await storage.getPaymentsByAward(awardId);

      const totalPaid = payments
        .filter(p => p.status === 'success')
        .reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        ...award,
        parcel,
        owner,
        valuation,
        payments,
        totalPaid,
        remainingAmount: Number(award.amount) - totalPaid,
        isFullyPaid: totalPaid >= Number(award.amount),
      };
    } catch (error) {
      console.error('Error getting award details:', error);
      throw error;
    }
  }

  /**
   * Get all awards with filters
   */
  async getAwards(filters?: { parcelId?: number; ownerId?: number; status?: string }): Promise<any[]> {
    return await storage.getAwards(filters);
  }

  /**
   * Close award
   */
  async closeAward(awardId: number, userId: number): Promise<any> {
    try {
      const award = await storage.getAward(awardId);
      if (!award) {
        throw new Error('Award not found');
      }

      if (award.status !== 'paid') {
        throw new Error('Award can only be closed after payment is complete');
      }

      await workflowService.transitionAwardState(awardId, 'closed', userId);
      const updated = await storage.updateAward(awardId, {
        status: 'closed',
      });

      // Create audit log
      await storage.createAuditLog({
        userId,
        action: 'close_award',
        resourceType: 'award',
        resourceId: awardId,
        details: { awardNo: award.awardNo },
      });

      return updated;
    } catch (error) {
      console.error('Error closing award:', error);
      throw error;
    }
  }
}

export const compensationService = new CompensationService();

