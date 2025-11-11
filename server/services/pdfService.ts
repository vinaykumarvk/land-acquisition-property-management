/**
 * PDF Generation Service for LAMS
 * 
 * Generates PDFs for:
 * - SIA Reports
 * - Sec 11/19 Notices
 * - LOIs (Letters of Intent)
 * - Award Orders
 * - Payment Receipts
 * - Possession Certificates
 */

import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface PDFGenerationOptions {
  includeQR?: boolean;
  includeHash?: boolean;
  template?: string;
}

export class PDFService {
  private outputDir: string;

  constructor() {
    // Create PDFs directory if it doesn't exist
    this.outputDir = path.join(process.cwd(), 'pdfs');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate SIA Report PDF
   */
  async generateSiaReport(
    siaId: number,
    title: string,
    description: string,
    feedbackCount: number,
    hearingDate?: Date,
    summary?: any
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Social Impact Assessment Report', 105, 20, { align: 'center' });
    
    // Title
    doc.setFontSize(16);
    doc.text(title, 105, 35, { align: 'center' });
    
    // Content
    doc.setFontSize(12);
    let yPos = 50;
    
    // Description
    const descriptionLines = doc.splitTextToSize(description, 180);
    doc.text('Description:', 15, yPos);
    yPos += 10;
    doc.text(descriptionLines, 15, yPos);
    yPos += descriptionLines.length * 7;
    
    // Statistics
    yPos += 10;
    doc.text(`Feedback Received: ${feedbackCount}`, 15, yPos);
    yPos += 10;
    
    if (hearingDate) {
      doc.text(`Hearing Date: ${hearingDate.toLocaleDateString()}`, 15, yPos);
      yPos += 10;
    }
    
    // Summary (if provided)
    if (summary) {
      yPos += 10;
      doc.text('Summary:', 15, yPos);
      yPos += 10;
      const summaryText = JSON.stringify(summary, null, 2);
      const summaryLines = doc.splitTextToSize(summaryText, 180);
      doc.text(summaryLines, 15, yPos);
    }
    
    // Footer with hash and QR
    const hash = this.generateHash(doc.output('arraybuffer'));
    const filePath = path.join(this.outputDir, `sia-report-${siaId}-${Date.now()}.pdf`);
    
    // Add hash to footer
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: 'center' });
    doc.text(`Generated: ${new Date().toISOString()}`, 105, 285, { align: 'center' });
    
    // Save PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filePath, pdfBuffer);
    
    return { filePath, hash };
  }

  /**
   * Generate Sec 11/19 Notice PDF
   */
  async generateNotificationPdf(
    notificationId: number,
    type: 'sec11' | 'sec19',
    refNo: string,
    title: string,
    bodyHtml: string,
    parcels: Array<{ parcelNo: string; village: string; area: number }>,
    publishDate: Date
  ): Promise<{ filePath: string; hash: string; qrCode?: string }> {
    const doc = new jsPDF();
    
    // Government Header
    doc.setFontSize(18);
    doc.text('GOVERNMENT NOTIFICATION', 105, 20, { align: 'center' });
    
    // Section and Reference Number
    doc.setFontSize(14);
    const sectionText = type === 'sec11' ? 'Section 11' : 'Section 19';
    doc.text(`${sectionText} - ${refNo}`, 105, 35, { align: 'center' });
    
    // Title
    doc.setFontSize(12);
    doc.text(title, 15, 50);
    
    // Body (simplified - in production, parse HTML properly)
    const bodyText = this.stripHtml(bodyHtml);
    const bodyLines = doc.splitTextToSize(bodyText, 180);
    let yPos = 65;
    doc.text(bodyLines, 15, yPos);
    yPos += bodyLines.length * 7;
    
    // Affected Parcels Table
    yPos += 10;
    doc.setFontSize(10);
    doc.text('Affected Parcels:', 15, yPos);
    yPos += 10;
    
    // Table header
    doc.setFont('helvetica', 'bold');
    doc.text('Parcel No.', 15, yPos);
    doc.text('Village', 60, yPos);
    doc.text('Area (sq m)', 120, yPos);
    yPos += 8;
    
    // Table rows
    doc.setFont('helvetica', 'normal');
    parcels.forEach(parcel => {
      doc.text(parcel.parcelNo, 15, yPos);
      doc.text(parcel.village, 60, yPos);
      doc.text(parcel.area.toString(), 120, yPos);
      yPos += 7;
    });
    
    // Publish Date
    yPos += 10;
    doc.text(`Published: ${publishDate.toLocaleDateString()}`, 15, yPos);
    
    // Generate hash and QR code
    const hash = this.generateHash(doc.output('arraybuffer'));
    const verifyUrl = `${process.env.APP_URL || 'http://localhost:5000'}/verify/notification/${notificationId}`;
    
    // Footer
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: 'center' });
    doc.text(`Verify: ${verifyUrl}`, 105, 285, { align: 'center' });
    
    // Save PDF
    const filePath = path.join(this.outputDir, `notification-${type}-${notificationId}-${Date.now()}.pdf`);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filePath, pdfBuffer);
    
    return { filePath, hash, qrCode: verifyUrl };
  }

  /**
   * Generate Award Order PDF
   */
  async generateAwardPdf(
    awardId: number,
    awardNo: string,
    ownerName: string,
    parcelNo: string,
    amount: number,
    mode: 'cash' | 'pooling' | 'hybrid',
    valuationBreakdown?: any
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('AWARD ORDER', 105, 20, { align: 'center' });
    
    // Award Number
    doc.setFontSize(14);
    doc.text(`Award No: ${awardNo}`, 105, 35, { align: 'center' });
    
    // Content
    doc.setFontSize(12);
    let yPos = 50;
    
    doc.text(`Owner: ${ownerName}`, 15, yPos);
    yPos += 10;
    doc.text(`Parcel: ${parcelNo}`, 15, yPos);
    yPos += 10;
    doc.text(`Amount: ₹${amount.toLocaleString('en-IN')}`, 15, yPos);
    yPos += 10;
    doc.text(`Mode: ${mode}`, 15, yPos);
    yPos += 10;
    
    // Valuation Breakdown
    if (valuationBreakdown) {
      yPos += 10;
      doc.text('Valuation Breakdown:', 15, yPos);
      yPos += 10;
      const breakdownText = JSON.stringify(valuationBreakdown, null, 2);
      const breakdownLines = doc.splitTextToSize(breakdownText, 180);
      doc.text(breakdownLines, 15, yPos);
    }
    
    // Footer
    const hash = this.generateHash(doc.output('arraybuffer'));
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: 'center' });
    doc.text(`Generated: ${new Date().toISOString()}`, 105, 285, { align: 'center' });
    
    // Save PDF
    const filePath = path.join(this.outputDir, `award-${awardId}-${Date.now()}.pdf`);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filePath, pdfBuffer);
    
    return { filePath, hash };
  }

  /**
   * Generate LOI (Letter of Intent) PDF
   */
  async generateLoiPdf(
    awardId: number,
    loiNo: string,
    ownerName: string,
    parcelNo: string,
    amount: number,
    bankDetails?: { ifsc: string; account: string }
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('LETTER OF INTENT', 105, 20, { align: 'center' });
    
    // LOI Number
    doc.setFontSize(14);
    doc.text(`LOI No: ${loiNo}`, 105, 35, { align: 'center' });
    
    // Content
    doc.setFontSize(12);
    let yPos = 50;
    
    doc.text(`To: ${ownerName}`, 15, yPos);
    yPos += 15;
    
    doc.text(`This is to inform you that an award of ₹${amount.toLocaleString('en-IN')} has been approved for parcel ${parcelNo}.`, 15, yPos);
    yPos += 15;
    
    if (bankDetails) {
      doc.text(`Payment will be processed to:`, 15, yPos);
      yPos += 10;
      doc.text(`IFSC: ${bankDetails.ifsc}`, 15, yPos);
      yPos += 10;
      doc.text(`Account: ${bankDetails.account}`, 15, yPos);
    }
    
    // Footer
    const hash = this.generateHash(doc.output('arraybuffer'));
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: 'center' });
    
    // Save PDF
    const filePath = path.join(this.outputDir, `loi-${awardId}-${Date.now()}.pdf`);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filePath, pdfBuffer);
    
    return { filePath, hash };
  }

  /**
   * Generate Possession Certificate PDF
   */
  async generatePossessionCertificate(
    possessionId: number,
    parcelNo: string,
    scheduleDate: Date,
    photos: Array<{ path: string; lat?: number; lng?: number }>,
    remarks?: string
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('POSSESSION CERTIFICATE', 105, 20, { align: 'center' });
    
    // Content
    doc.setFontSize(12);
    let yPos = 40;
    
    doc.text(`Parcel: ${parcelNo}`, 15, yPos);
    yPos += 10;
    doc.text(`Possession Date: ${scheduleDate.toLocaleDateString()}`, 15, yPos);
    yPos += 10;
    
    if (remarks) {
      yPos += 10;
      doc.text(`Remarks: ${remarks}`, 15, yPos);
      yPos += 10;
    }
    
    // Photos info
    yPos += 10;
    doc.text(`Evidence Photos: ${photos.length}`, 15, yPos);
    yPos += 10;
    
    photos.forEach((photo, index) => {
      doc.text(`Photo ${index + 1}:`, 15, yPos);
      if (photo.lat && photo.lng) {
        doc.text(`GPS: ${photo.lat}, ${photo.lng}`, 30, yPos);
      }
      yPos += 7;
    });
    
    // Footer
    const hash = this.generateHash(doc.output('arraybuffer'));
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: 'center' });
    doc.text(`Generated: ${new Date().toISOString()}`, 105, 285, { align: 'center' });
    
    // Save PDF
    const filePath = path.join(this.outputDir, `possession-${possessionId}-${Date.now()}.pdf`);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filePath, pdfBuffer);
    
    return { filePath, hash };
  }

  /**
   * Generate Payment Receipt PDF
   */
  async generatePaymentReceipt(
    paymentId: number,
    awardNo: string,
    ownerName: string,
    amount: number,
    mode: string,
    referenceNo: string,
    paidOn: Date
  ): Promise<{ filePath: string; hash: string }> {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(18);
    doc.text('PAYMENT RECEIPT', 105, 20, { align: 'center' });
    
    // Content
    doc.setFontSize(12);
    let yPos = 40;
    
    doc.text(`Award No: ${awardNo}`, 15, yPos);
    yPos += 10;
    doc.text(`Payee: ${ownerName}`, 15, yPos);
    yPos += 10;
    doc.text(`Amount: ₹${amount.toLocaleString('en-IN')}`, 15, yPos);
    yPos += 10;
    doc.text(`Payment Mode: ${mode}`, 15, yPos);
    yPos += 10;
    doc.text(`Reference No: ${referenceNo}`, 15, yPos);
    yPos += 10;
    doc.text(`Paid On: ${paidOn.toLocaleDateString()}`, 15, yPos);
    
    // Footer
    const hash = this.generateHash(doc.output('arraybuffer'));
    doc.setFontSize(8);
    doc.text(`Document Hash: ${hash}`, 105, 280, { align: 'center' });
    
    // Save PDF
    const filePath = path.join(this.outputDir, `payment-${paymentId}-${Date.now()}.pdf`);
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    fs.writeFileSync(filePath, pdfBuffer);
    
    return { filePath, hash };
  }

  /**
   * Generate SHA-256 hash of PDF content
   */
  private generateHash(pdfBuffer: ArrayBuffer): string {
    const buffer = Buffer.from(pdfBuffer);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Strip HTML tags from text (simple implementation)
   */
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }

  /**
   * Verify PDF integrity using hash
   */
  async verifyPdf(filePath: string, expectedHash: string): Promise<boolean> {
    if (!fs.existsSync(filePath)) {
      return false;
    }
    
    const fileBuffer = fs.readFileSync(filePath);
    const actualHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    
    return actualHash === expectedHash;
  }
}

export const pdfService = new PDFService();

