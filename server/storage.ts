import { 
  users, investmentRequests, cashRequests, approvals, tasks, documents, 
  documentCategories, documentCategoryAssociations,
  notifications, templates, auditLogs, approvalWorkflows, backgroundJobs,
  documentQueries, crossDocumentQueries, webSearchQueries, sequences, investmentRationales,
  // LAMS tables
  parcels, owners, parcelOwners, sia, siaFeedback, siaHearings, siaReports,
  landNotifications, notificationParcels, objections, valuations, awards, payments, possession, possessionMedia,
  // PMS tables
  parties, schemes, properties, ownership, applications, allotments,
  transfers, mortgages, modifications, nocs, conveyanceDeeds,
  demandNotes, pmsPayments, receipts, refunds, ledgers, serviceRequests,
  // Phase 6 tables
  inspections, demarcationRequests, dpcRequests, occupancyCertificates, completionCertificates, deviations,
  // Phase 7 tables
  waterConnections, sewerageConnections, connectionInspections, meterReadings,
  // Phase 8 tables - Registration
  registrationCases, deeds, encumbrances, registrationSlots, kycVerifications,
  type User, type InsertUser, type InvestmentRequest, type InsertInvestmentRequest,
  type CashRequest, type InsertCashRequest, type Approval, type InsertApproval,
  type Task, type InsertTask, type Document, type InsertDocument,
  type DocumentCategory, type InsertDocumentCategory,
  type Notification, type InsertNotification, type Template, type InsertTemplate,
  type BackgroundJob, type InsertBackgroundJob, type DocumentQuery, type InsertDocumentQuery,
  type CrossDocumentQuery, type InsertCrossDocumentQuery, type WebSearchQuery, type InsertWebSearchQuery,
  type Sequence, type InsertSequence, type InvestmentRationale, type InsertInvestmentRationale,
  // LAMS types
  type Parcel, type InsertParcel, type Owner, type InsertOwner, type ParcelOwner, type InsertParcelOwner,
  type Sia, type InsertSia, type SiaFeedback, type InsertSiaFeedback, type SiaHearing, type InsertSiaHearing,
  type SiaReport, type InsertSiaReport, type LandNotification, type InsertLandNotification,
  type NotificationParcel, type InsertNotificationParcel, type Objection, type InsertObjection,
  type Valuation, type InsertValuation, type Award, type InsertAward, type Payment, type InsertPayment,
  type Possession, type InsertPossession, type PossessionMedia, type InsertPossessionMedia,
  // PMS types
  type Party, type InsertParty, type Scheme, type InsertScheme, type Property, type InsertProperty,
  type Ownership, type InsertOwnership, type Application, type InsertApplication, type Allotment, type InsertAllotment,
  type Transfer, type InsertTransfer, type Mortgage, type InsertMortgage, type Modification, type InsertModification,
  type NOC, type InsertNOC, type ConveyanceDeed, type InsertConveyanceDeed,
  type DemandNote, type InsertDemandNote, type PmsPayment, type InsertPayment, type Receipt, type InsertReceipt,
  type Refund, type InsertRefund, type Ledger, type InsertLedger,
  type RegistrationCase, type InsertRegistrationCase, type Deed, type InsertDeed,
  type Encumbrance, type InsertEncumbrance, type RegistrationSlot, type InsertRegistrationSlot,
  type KycVerification, type InsertKycVerification,
  type ServiceRequest, type InsertServiceRequest,
  // Phase 6 types
  type Inspection, type InsertInspection,
  // Phase 7 types
  type WaterConnection, type InsertWaterConnection,
  type SewerageConnection, type InsertSewerageConnection,
  type ConnectionInspection, type InsertConnectionInspection,
  type MeterReading, type InsertMeterReading,
  // Phase 9 types
  type Grievance, type InsertGrievance,
  type LegalCase, type InsertLegalCase,
  type CaseHearing, type InsertCaseHearing,
  type CourtOrder, type InsertCourtOrder,
  type DemarcationRequest, type InsertDemarcationRequest,
  type DpcRequest, type InsertDpcRequest,
  type OccupancyCertificate, type InsertOccupancyCertificate,
  type CompletionCertificate, type InsertCompletionCertificate,
  type Deviation, type InsertDeviation
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, sql, ne, isNotNull, max } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  
  // Investment operations
  getInvestmentRequest(id: number): Promise<InvestmentRequest | undefined>;
  getInvestmentRequestByRequestId(requestId: string): Promise<InvestmentRequest | undefined>;
  createInvestmentRequest(request: InsertInvestmentRequest): Promise<InvestmentRequest>;
  updateInvestmentRequest(id: number, request: Partial<InsertInvestmentRequest>): Promise<InvestmentRequest>;
  getInvestmentRequests(filters?: { userId?: number; status?: string }): Promise<InvestmentRequest[]>;
  softDeleteInvestmentRequest(id: number, userId: number): Promise<boolean>;
  
  // Cash request operations
  getCashRequest(id: number): Promise<CashRequest | undefined>;
  getCashRequestByRequestId(requestId: string): Promise<CashRequest | undefined>;
  createCashRequest(request: InsertCashRequest): Promise<CashRequest>;
  updateCashRequest(id: number, request: Partial<InsertCashRequest>): Promise<CashRequest>;
  getCashRequests(filters?: { userId?: number; status?: string }): Promise<CashRequest[]>;
  
  // Approval operations
  createApproval(approval: InsertApproval): Promise<Approval>;
  updateApproval(id: number, approval: Partial<InsertApproval>): Promise<Approval>;
  deleteApproval(id: number): Promise<void>;
  getApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getCurrentCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getAllCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getApprovalsByUser(userId: number): Promise<Approval[]>;
  markPreviousCycleApprovalsAsInactive(requestType: string, requestId: number): Promise<void>;
  incrementApprovalCycle(requestType: string, requestId: number): Promise<number>;
  
  // Task operations
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  getTasksByUser(userId: number): Promise<Task[]>;
  getTaskById(id: number): Promise<Task | undefined>;
  
  // Document operations
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
  getDocumentsByRequest(requestType: string, requestId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByAnalysisStatus(status: string): Promise<Document[]>;
  getDocumentAnalysis(id: number): Promise<any>;
  
  // Document category operations
  getDocumentCategories(): Promise<DocumentCategory[]>;
  createDocumentCategory(category: InsertDocumentCategory): Promise<DocumentCategory>;
  getDocumentsByCategory(categoryId?: number): Promise<Document[]>;
  
  // Multiple categories per document operations
  createDocumentCategoryAssociation(documentId: number, categoryId: number, customCategoryName?: string): Promise<any>;
  getDocumentCategoryAssociations(documentId: number): Promise<any[]>;
  deleteDocumentCategoryAssociation(documentId: number, categoryId: number): Promise<void>;
  
  // Notification operations
  createNotification(notification: InsertNotification): Promise<Notification>;
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(id: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;
  
  // Template operations
  createTemplate(template: InsertTemplate): Promise<Template>;
  getTemplatesByType(type: string): Promise<Template[]>;
  getTemplate(id: number): Promise<Template | undefined>;
  deleteTemplate(id: number): Promise<void>;
  
  // Investment rationale operations
  createInvestmentRationale(rationale: InsertInvestmentRationale): Promise<InvestmentRationale>;
  getInvestmentRationales(investmentId: number): Promise<InvestmentRationale[]>;
  updateInvestmentRationale(id: number, rationale: Partial<InsertInvestmentRationale>): Promise<InvestmentRationale>;
  deleteInvestmentRationale(id: number): Promise<void>;
  
  // Audit trail operations
  getCurrentCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  getAllCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]>;
  incrementApprovalCycle(requestType: string, requestId: number): Promise<number>;
  
  // Dashboard stats
  getDashboardStats(userId: number): Promise<{
    pendingApprovals: number;
    activeInvestments: number;
    cashRequests: number;
    slaBreaches: number;
  }>;

  // Enhanced dashboard metrics
  getEnhancedDashboardStats(userId: number): Promise<{
    proposalSummary: {
      investment: {
        draft: { count: number; value: number };
        pendingManager: { count: number; value: number };
        pendingCommittee: { count: number; value: number };
        pendingFinance: { count: number; value: number };
        approved: { count: number; value: number };
        rejected: { count: number; value: number };
        total: { count: number; value: number };
      };
      cash: {
        draft: { count: number; value: number };
        pendingManager: { count: number; value: number };
        pendingCommittee: { count: number; value: number };
        pendingFinance: { count: number; value: number };
        approved: { count: number; value: number };
        rejected: { count: number; value: number };
        total: { count: number; value: number };
      };
    };
    riskProfile: {
      low: { count: number; value: number };
      medium: { count: number; value: number };
      high: { count: number; value: number };
    };
    valueDistribution: {
      small: { count: number; value: number }; // 0-1M
      medium: { count: number; value: number }; // 1-5M
      large: { count: number; value: number }; // 5-10M
      extraLarge: { count: number; value: number }; // 10M+
    };
    decisionSupport: {
      urgentApprovals: number;
      overdueItems: number;
      avgProcessingTime: number;
      complianceAlerts: number;
    };
  }>;
  
  // Recent requests
  getRecentRequests(limit?: number, userId?: number): Promise<Array<{
    id: number;
    requestId: string;
    type: 'investment' | 'cash_request';
    amount: string;
    status: string;
    createdAt: Date;
    requester: { firstName: string; lastName: string };
  }>>;
  
  // Background job operations
  createBackgroundJob(job: InsertBackgroundJob): Promise<BackgroundJob>;
  getBackgroundJobsByDocument(documentId: number): Promise<BackgroundJob[]>;
  getBackgroundJob(id: number): Promise<BackgroundJob | undefined>;
  updateBackgroundJob(id: number, job: Partial<InsertBackgroundJob>): Promise<BackgroundJob>;

  // Document query operations
  saveDocumentQuery(query: InsertDocumentQuery): Promise<DocumentQuery>;
  getDocumentQueries(documentId: number): Promise<any[]>;
  
  // Cross-document query operations
  saveCrossDocumentQuery(query: InsertCrossDocumentQuery): Promise<CrossDocumentQuery>;
  getCrossDocumentQueries(requestType: string, requestId: number): Promise<CrossDocumentQuery[]>;
  getLastResponseId(requestType: string, requestId: number, userId: number): Promise<string | null>;
  
  // Web search query operations
  saveWebSearchQuery(query: InsertWebSearchQuery): Promise<WebSearchQuery>;
  getWebSearchQueries(requestType: string, requestId: number): Promise<WebSearchQuery[]>;
  getLastWebSearchResponseId(requestType: string, requestId: number, userId: number): Promise<string | null>;
  
  // Sequence operations
  getNextSequenceValue(sequenceName: string): Promise<number>;

  // ============================================================================
  // LAMS Operations
  // ============================================================================

  // Parcel operations
  getParcel(id: number): Promise<Parcel | undefined>;
  getParcelByParcelNo(parcelNo: string): Promise<Parcel | undefined>;
  createParcel(parcel: InsertParcel): Promise<Parcel>;
  updateParcel(id: number, parcel: Partial<InsertParcel>): Promise<Parcel>;
  getParcels(filters?: { status?: string; district?: string }): Promise<Parcel[]>;

  // Owner operations
  getOwner(id: number): Promise<Owner | undefined>;
  createOwner(owner: InsertOwner): Promise<Owner>;
  updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner>;
  getOwners(filters?: { name?: string }): Promise<Owner[]>;

  // Parcel-Owner operations
  createParcelOwner(parcelOwner: InsertParcelOwner): Promise<ParcelOwner>;
  getParcelOwners(parcelId: number): Promise<ParcelOwner[]>;
  deleteParcelOwner(id: number): Promise<void>;

  // SIA operations
  getSia(id: number): Promise<Sia | undefined>;
  getSiaByNoticeNo(noticeNo: string): Promise<Sia | undefined>;
  createSia(sia: InsertSia): Promise<Sia>;
  updateSia(id: number, sia: Partial<InsertSia>): Promise<Sia>;
  getSias(filters?: { status?: string; createdBy?: number }): Promise<Sia[]>;

  // SIA Feedback operations
  createSiaFeedback(feedback: InsertSiaFeedback): Promise<SiaFeedback>;
  getSiaFeedbacks(siaId: number): Promise<SiaFeedback[]>;
  updateSiaFeedback(id: number, feedback: Partial<InsertSiaFeedback>): Promise<SiaFeedback>;

  // SIA Hearing operations
  createSiaHearing(hearing: InsertSiaHearing): Promise<SiaHearing>;
  getSiaHearing(id: number): Promise<SiaHearing | undefined>;
  getSiaHearings(siaId: number): Promise<SiaHearing[]>;
  updateSiaHearing(id: number, hearing: Partial<InsertSiaHearing>): Promise<SiaHearing>;

  // SIA Report operations
  createSiaReport(report: InsertSiaReport): Promise<SiaReport>;
  getSiaReports(siaId: number): Promise<SiaReport[]>;
  getSiaReport(id: number): Promise<SiaReport | undefined>;

  // Land Notification operations
  getLandNotification(id: number): Promise<LandNotification | undefined>;
  getLandNotificationByRefNo(refNo: string): Promise<LandNotification | undefined>;
  createLandNotification(notification: InsertLandNotification): Promise<LandNotification>;
  updateLandNotification(id: number, notification: Partial<InsertLandNotification>): Promise<LandNotification>;
  getLandNotifications(filters?: { type?: string; status?: string }): Promise<LandNotification[]>;

  // Notification-Parcel operations
  createNotificationParcel(notificationParcel: InsertNotificationParcel): Promise<NotificationParcel>;
  getNotificationParcels(notificationId: number): Promise<NotificationParcel[]>;
  deleteNotificationParcel(id: number): Promise<void>;

  // Objection operations
  getObjection(id: number): Promise<Objection | undefined>;
  createObjection(objection: InsertObjection): Promise<Objection>;
  updateObjection(id: number, objection: Partial<InsertObjection>): Promise<Objection>;
  getObjections(filters?: { notificationId?: number; status?: string }): Promise<Objection[]>;
  getUnresolvedObjections(notificationId: number): Promise<Objection[]>;

  // Valuation operations
  getValuation(id: number): Promise<Valuation | undefined>;
  createValuation(valuation: InsertValuation): Promise<Valuation>;
  updateValuation(id: number, valuation: Partial<InsertValuation>): Promise<Valuation>;
  getValuations(filters?: { parcelId?: number }): Promise<Valuation[]>;
  getValuationByParcel(parcelId: number): Promise<Valuation | undefined>;

  // Award operations
  getAward(id: number): Promise<Award | undefined>;
  getAwardByAwardNo(awardNo: string): Promise<Award | undefined>;
  getAwardByLoiNo(loiNo: string): Promise<Award | undefined>;
  createAward(award: InsertAward): Promise<Award>;
  updateAward(id: number, award: Partial<InsertAward>): Promise<Award>;
  getAwards(filters?: { parcelId?: number; ownerId?: number; status?: string }): Promise<Award[]>;

  // Payment operations
  getPayment(id: number): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment>;
  getPayments(filters?: { awardId?: number; status?: string }): Promise<Payment[]>;
  getPaymentsByAward(awardId: number): Promise<Payment[]>;

  // Possession operations
  getPossession(id: number): Promise<Possession | undefined>;
  createPossession(possession: InsertPossession): Promise<Possession>;
  updatePossession(id: number, possession: Partial<InsertPossession>): Promise<Possession>;
  getPossessions(filters?: { parcelId?: number; status?: string }): Promise<Possession[]>;
  getPossessionByParcel(parcelId: number): Promise<Possession | undefined>;

  // Possession Media operations
  createPossessionMedia(media: InsertPossessionMedia): Promise<PossessionMedia>;
  getPossessionMedia(possessionId: number): Promise<PossessionMedia[]>;
  deletePossessionMedia(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updateUser: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(updateUser).where(eq(users.id, id)).returning();
    return user;
  }

  async getInvestmentRequest(id: number): Promise<InvestmentRequest | undefined> {
    const [request] = await db.select().from(investmentRequests).where(
      and(
        eq(investmentRequests.id, id),
        sql`${investmentRequests.deletedAt} IS NULL`
      )
    );
    return request || undefined;
  }

  async getInvestmentRequestByRequestId(requestId: string): Promise<InvestmentRequest | undefined> {
    const [request] = await db.select().from(investmentRequests).where(
      and(
        eq(investmentRequests.requestId, requestId),
        sql`${investmentRequests.deletedAt} IS NULL`
      )
    );
    return request || undefined;
  }

  async createInvestmentRequest(request: InsertInvestmentRequest): Promise<InvestmentRequest> {
    const [created] = await db.insert(investmentRequests).values(request).returning();
    return created;
  }

  async updateInvestmentRequest(id: number, request: Partial<InsertInvestmentRequest>): Promise<InvestmentRequest> {
    const [updated] = await db.update(investmentRequests).set(request).where(eq(investmentRequests.id, id)).returning();
    return updated;
  }

  async softDeleteInvestmentRequest(id: number, userId: number): Promise<boolean> {
    try {
      // Get the request without the deletedAt filter to check current state
      const [request] = await db.select().from(investmentRequests).where(eq(investmentRequests.id, id));
      if (!request || request.requesterId !== userId) {
        return false;
      }

      // Check if already deleted
      if (request.deletedAt) {
        return false; // Already deleted
      }

      // Check if the request can be deleted (business rules)
      const canDelete = this.canDeleteInvestmentRequest(request.status);
      if (!canDelete) {
        return false;
      }

      // Soft delete by setting deletedAt timestamp
      await db.update(investmentRequests)
        .set({ deletedAt: new Date() })
        .where(eq(investmentRequests.id, id));
      
      return true;
    } catch (error) {
      console.error('Error soft deleting investment request:', error);
      return false;
    }
  }

  private canDeleteInvestmentRequest(status: string): boolean {
    // Define which statuses allow deletion
    const deletableStatuses = ['draft', 'rejected', 'admin_rejected', 'changes_requested', 'opportunity'];
    
    // Allow deletion of pending requests only if no approvals have started
    if (status === 'new') {
      return true; // We'll check for approvals in the API layer
    }
    
    return deletableStatuses.includes(status);
  }

  async getInvestmentRequests(filters?: { userId?: number; status?: string }): Promise<InvestmentRequest[]> {
    let query = db.select().from(investmentRequests);
    
    const conditions: any[] = [];
    
    // Always filter out soft-deleted records
    conditions.push(sql`${investmentRequests.deletedAt} IS NULL`);
    
    if (filters?.userId) {
      conditions.push(eq(investmentRequests.requesterId, filters.userId));
    }
    
    if (filters?.status) {
      conditions.push(eq(investmentRequests.status, filters.status));
    }
    
    query = query.where(and(...conditions));
    
    const results = await query.orderBy(desc(investmentRequests.createdAt));
    return results;
  }

  async getCashRequest(id: number): Promise<CashRequest | undefined> {
    const [request] = await db.select().from(cashRequests).where(eq(cashRequests.id, id));
    return request || undefined;
  }

  async getCashRequestByRequestId(requestId: string): Promise<CashRequest | undefined> {
    const [request] = await db.select().from(cashRequests).where(eq(cashRequests.requestId, requestId));
    return request || undefined;
  }

  async createCashRequest(request: InsertCashRequest): Promise<CashRequest> {
    const [created] = await db.insert(cashRequests).values(request).returning();
    return created;
  }

  async updateCashRequest(id: number, request: Partial<InsertCashRequest>): Promise<CashRequest> {
    const [updated] = await db.update(cashRequests).set(request).where(eq(cashRequests.id, id)).returning();
    return updated;
  }

  async getCashRequests(filters?: { userId?: number; status?: string }): Promise<CashRequest[]> {
    let query = db.select().from(cashRequests);
    
    const conditions: any[] = [];
    
    if (filters?.userId) {
      conditions.push(eq(cashRequests.requesterId, filters.userId));
    }
    
    if (filters?.status) {
      conditions.push(eq(cashRequests.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(conditions.length === 1 ? conditions[0] : and(...conditions));
    }
    
    const results = await query.orderBy(desc(cashRequests.createdAt));
    return results;
  }

  async createApproval(approval: InsertApproval): Promise<Approval> {
    const [created] = await db.insert(approvals).values(approval).returning();
    return created;
  }

  async updateApproval(id: number, approval: Partial<InsertApproval>): Promise<Approval> {
    const [updated] = await db.update(approvals).set(approval).where(eq(approvals.id, id)).returning();
    return updated;
  }

  async deleteApproval(id: number): Promise<void> {
    await db.delete(approvals).where(eq(approvals.id, id));
  }

  async getApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(and(
        eq(approvals.requestType, requestType),
        eq(approvals.requestId, requestId)
      ))
      .orderBy(approvals.stage);
  }

  async getCurrentCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(and(
        eq(approvals.requestType, requestType),
        eq(approvals.requestId, requestId),
        eq(approvals.isCurrentCycle, true)
      ))
      .orderBy(approvals.stage);
  }

  async getAllCycleApprovalsByRequest(requestType: string, requestId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(and(
        eq(approvals.requestType, requestType),
        eq(approvals.requestId, requestId)
      ))
      .orderBy(desc(approvals.approvalCycle), approvals.stage);
  }

  async markPreviousCycleApprovalsAsInactive(requestType: string, requestId: number): Promise<void> {
    await db.update(approvals)
      .set({ isCurrentCycle: false })
      .where(and(
        eq(approvals.requestType, requestType),
        eq(approvals.requestId, requestId),
        eq(approvals.isCurrentCycle, true)
      ));
  }

  async incrementApprovalCycle(requestType: string, requestId: number): Promise<number> {
    // First mark previous cycle as inactive
    await this.markPreviousCycleApprovalsAsInactive(requestType, requestId);
    
    // Get the maximum cycle number for this request
    const [maxCycle] = await db.select({ 
      maxCycle: sql<number>`COALESCE(MAX(${approvals.approvalCycle}), 0)` 
    })
    .from(approvals)
    .where(and(
      eq(approvals.requestType, requestType),
      eq(approvals.requestId, requestId)
    ));
    
    const newCycle = (maxCycle?.maxCycle || 0) + 1;
    
    // Update the investment request's current cycle
    if (requestType === 'investment') {
      await db.update(investmentRequests)
        .set({ currentApprovalCycle: newCycle })
        .where(eq(investmentRequests.id, requestId));
    }
    
    return newCycle;
  }

  async getApprovalsByUser(userId: number): Promise<Approval[]> {
    return await db.select().from(approvals)
      .where(eq(approvals.approverId, userId))
      .orderBy(desc(approvals.createdAt));
  }

  async createTask(task: InsertTask): Promise<Task> {
    const [created] = await db.insert(tasks).values(task).returning();
    return created;
  }

  async updateTask(id: number, task: Partial<InsertTask>): Promise<Task> {
    const [updated] = await db.update(tasks).set(task).where(eq(tasks.id, id)).returning();
    return updated;
  }

  async getTasksByUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(eq(tasks.assigneeId, userId))
      .orderBy(desc(tasks.createdAt));
  }

  async getTasksByRequest(requestType: string, requestId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(and(
        eq(tasks.requestType, requestType),
        eq(tasks.requestId, requestId)
      ))
      .orderBy(desc(tasks.createdAt));
  }

  async getTaskById(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [created] = await db.insert(documents).values(document).returning();
    return created;
  }

  async getDocumentsByRequest(requestType: string, requestId: number): Promise<Document[]> {
    return await db.select().from(documents)
      .where(and(
        eq(documents.requestType, requestType),
        eq(documents.requestId, requestId)
      ))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document> {
    const [updated] = await db.update(documents).set(document).where(eq(documents.id, id)).returning();
    return updated;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async getDocumentsByAnalysisStatus(status: string): Promise<Document[]> {
    return await db.select().from(documents)
      .where(eq(documents.analysisStatus, status))
      .orderBy(desc(documents.createdAt));
  }

  async getDocumentAnalysis(id: number): Promise<any> {
    const document = await this.getDocument(id);
    
    if (!document || !document.analysisResult) {
      return null;
    }
    
    try {
      return JSON.parse(document.analysisResult);
    } catch (error) {
      console.error('Failed to parse document analysis:', error);
      return null;
    }
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications).set({ isRead: true }).where(eq(notifications.id, id));
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [created] = await db.insert(templates).values(template).returning();
    return created;
  }

  async getTemplatesByType(type: string): Promise<Template[]> {
    return await db.select().from(templates)
      .where(and(eq(templates.type, type), eq(templates.isActive, true)))
      .orderBy(desc(templates.createdAt));
  }

  async getTemplate(id: number): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template || undefined;
  }

  async getDashboardStats(userId: number): Promise<{
    pendingApprovals: number;
    activeInvestments: number;
    cashRequests: number;
    slaBreaches: number;
  }> {
    const [pendingApprovals] = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.assigneeId, userId), eq(tasks.status, 'pending')));

    const [activeInvestments] = await db.select({ count: sql<number>`count(*)` })
      .from(investmentRequests)
      .where(eq(investmentRequests.status, 'approved'));

    const [cashRequestsCount] = await db.select({ count: sql<number>`count(*)` })
      .from(cashRequests)
      .where(eq(cashRequests.status, 'pending'));

    const [slaBreaches] = await db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .where(and(eq(tasks.status, 'overdue')));

    return {
      pendingApprovals: pendingApprovals.count,
      activeInvestments: activeInvestments.count,
      cashRequests: cashRequestsCount.count,
      slaBreaches: slaBreaches.count,
    };
  }

  async getEnhancedDashboardStats(userId: number): Promise<{
    proposalSummary: {
      investment: {
        draft: { count: number; value: number };
        pendingManager: { count: number; value: number };
        pendingCommittee: { count: number; value: number };
        pendingFinance: { count: number; value: number };
        approved: { count: number; value: number };
        rejected: { count: number; value: number };
        total: { count: number; value: number };
      };
      cash: {
        draft: { count: number; value: number };
        pendingManager: { count: number; value: number };
        pendingCommittee: { count: number; value: number };
        pendingFinance: { count: number; value: number };
        approved: { count: number; value: number };
        rejected: { count: number; value: number };
        total: { count: number; value: number };
      };
    };
    riskProfile: {
      low: { count: number; value: number };
      medium: { count: number; value: number };
      high: { count: number; value: number };
    };
    valueDistribution: {
      small: { count: number; value: number }; // 0-1M
      medium: { count: number; value: number }; // 1-5M
      large: { count: number; value: number }; // 5-10M
      extraLarge: { count: number; value: number }; // 10M+
    };
    decisionSupport: {
      urgentApprovals: number;
      overdueItems: number;
      avgProcessingTime: number;
      complianceAlerts: number;
    };
  }> {
    try {
      // Get current user to determine role-based filtering
      const currentUser = await this.getUser(userId);
      const userRole = currentUser?.role;
      
      // Use existing working methods to get basic data with role-based filtering
      let investmentData = [];
      let cashData = [];
      
      if (userRole === 'analyst') {
        // Analysts can only see their own proposals
        investmentData = await this.getInvestmentRequests({ userId: userId });
        cashData = await this.getCashRequests({ userId: userId });
      } else {
        // Managers, committee members, finance, and admin can see all non-draft proposals
        investmentData = await this.getInvestmentRequests();
        cashData = await this.getCashRequests();
        
        // Filter out draft proposals for non-analysts (except admin)
        if (userRole !== 'admin') {
          investmentData = investmentData.filter(item => item.status !== 'draft');
          cashData = cashData.filter(item => item.status !== 'draft');
        }
      }

      // Process investment proposal statistics
      const investmentStats = this.processProposalStats(investmentData, 'investment');
      const cashStats = this.processProposalStats(cashData, 'cash');

      // Process risk profile distribution
      const riskStats = this.processRiskProfileStats(investmentData);

      // Process value distribution
      const valueStats = this.processValueDistributionStats(investmentData);

      // Get decision support metrics
      const decisionStats = await this.getDecisionSupportStats(userId, userRole);

      return {
        proposalSummary: {
          investment: investmentStats,
          cash: cashStats,
        },
        riskProfile: riskStats,
        valueDistribution: valueStats,
        decisionSupport: decisionStats,
      };
    } catch (error) {
      console.error('Error in getEnhancedDashboardStats:', error);
      
      // Return default/empty stats on error
      return {
        proposalSummary: {
          investment: {
            draft: { count: 0, value: 0 },
            pendingManager: { count: 0, value: 0 },
            pendingCommittee: { count: 0, value: 0 },
            pendingFinance: { count: 0, value: 0 },
            approved: { count: 0, value: 0 },
            rejected: { count: 0, value: 0 },
            total: { count: 0, value: 0 },
          },
          cash: {
            draft: { count: 0, value: 0 },
            pendingManager: { count: 0, value: 0 },
            pendingCommittee: { count: 0, value: 0 },
            pendingFinance: { count: 0, value: 0 },
            approved: { count: 0, value: 0 },
            rejected: { count: 0, value: 0 },
            total: { count: 0, value: 0 },
          },
        },
        riskProfile: {
          low: { count: 0, value: 0 },
          medium: { count: 0, value: 0 },
          high: { count: 0, value: 0 },
        },
        valueDistribution: {
          small: { count: 0, value: 0 },
          medium: { count: 0, value: 0 },
          large: { count: 0, value: 0 },
          extraLarge: { count: 0, value: 0 },
        },
        decisionSupport: {
          urgentApprovals: 0,
          overdueItems: 0,
          avgProcessingTime: 24,
          complianceAlerts: 0,
        },
      };
    }
  }

  private processProposalStats(data: any[], type: 'investment' | 'cash'): {
    draft: { count: number; value: number };
    pendingManager: { count: number; value: number };
    pendingCommittee: { count: number; value: number };
    pendingFinance: { count: number; value: number };
    approved: { count: number; value: number };
    rejected: { count: number; value: number };
    total: { count: number; value: number };
  } {
    const amountField = 'amount'; // Both investment and cash requests use 'amount' column
    
    const stats = {
      draft: { count: 0, value: 0 },
      pendingManager: { count: 0, value: 0 },
      pendingCommittee: { count: 0, value: 0 },
      pendingFinance: { count: 0, value: 0 },
      approved: { count: 0, value: 0 },
      rejected: { count: 0, value: 0 },
      total: { count: 0, value: 0 },
    };

    data.forEach(item => {
      const status = item.status;
      const value = item[amountField] || 0;

      // Map database status to dashboard categories
      if (status === 'draft') {
        stats.draft.count++;
        stats.draft.value += value;
      } else if (status === 'pending' || status === 'Manager pending' || status === 'New') {
        stats.pendingManager.count++;
        stats.pendingManager.value += value;
      } else if (status === 'Manager approved' || status === 'Committee pending') {
        stats.pendingCommittee.count++;
        stats.pendingCommittee.value += value;
      } else if (status === 'Committee approved' || status === 'Finance pending') {
        stats.pendingFinance.count++;
        stats.pendingFinance.value += value;
      } else if (status === 'approved') {
        stats.approved.count++;
        stats.approved.value += value;
      } else if (status.includes('rejected') || status === 'rejected') {
        stats.rejected.count++;
        stats.rejected.value += value;
      }

      stats.total.count++;
      stats.total.value += value;
    });

    return stats;
  }

  private processRiskProfileStats(data: any[]): {
    low: { count: number; value: number };
    medium: { count: number; value: number };
    high: { count: number; value: number };
  } {
    const stats = {
      low: { count: 0, value: 0 },
      medium: { count: 0, value: 0 },
      high: { count: 0, value: 0 },
    };

    data.forEach(item => {
      const riskLevel = item.riskLevel?.toLowerCase();
      const value = item.amount || 0;

      if (riskLevel === 'low') {
        stats.low.count++;
        stats.low.value += value;
      } else if (riskLevel === 'medium') {
        stats.medium.count++;
        stats.medium.value += value;
      } else if (riskLevel === 'high') {
        stats.high.count++;
        stats.high.value += value;
      }
    });

    return stats;
  }

  private processValueDistributionStats(data: any[]): {
    small: { count: number; value: number };
    medium: { count: number; value: number };
    large: { count: number; value: number };
    extraLarge: { count: number; value: number };
  } {
    const stats = {
      small: { count: 0, value: 0 },
      medium: { count: 0, value: 0 },
      large: { count: 0, value: 0 },
      extraLarge: { count: 0, value: 0 },
    };

    data.forEach(item => {
      const amount = item.amount || 0;

      if (amount <= 1000000) { // 0-1M
        stats.small.count++;
        stats.small.value += amount;
      } else if (amount <= 5000000) { // 1-5M
        stats.medium.count++;
        stats.medium.value += amount;
      } else if (amount <= 10000000) { // 5-10M
        stats.large.count++;
        stats.large.value += amount;
      } else { // 10M+
        stats.extraLarge.count++;
        stats.extraLarge.value += amount;
      }
    });

    return stats;
  }

  private async getDecisionSupportStats(userId: number, userRole?: string): Promise<{
    urgentApprovals: number;
    overdueItems: number;
    avgProcessingTime: number;
    complianceAlerts: number;
  }> {
    try {
      // Simplified approach - return dummy data for now to avoid SQL errors
      // TODO: Implement proper queries once table structure is confirmed
      
      // For now, return basic stats to get the dashboard working
      const urgentApprovals = 0;
      const overdueItems = 0;
      const avgProcessingTime = 24; // 24 hours default
      const complianceAlerts = 0;

      return {
        urgentApprovals,
        overdueItems,
        avgProcessingTime,
        complianceAlerts,
      };
    } catch (error) {
      console.error('Error in getDecisionSupportStats:', error);
      // Return default values on error
      return {
        urgentApprovals: 0,
        overdueItems: 0,
        avgProcessingTime: 24,
        complianceAlerts: 0,
      };
    }
  }

  async getRecentRequests(limit = 10, userId?: number): Promise<Array<{
    id: number;
    requestId: string;
    type: 'investment' | 'cash_request';
    amount: string;
    status: string;
    createdAt: Date;
    requester: { firstName: string; lastName: string };
    investmentType?: string;
    targetCompany?: string;
    expectedReturn?: string;
    riskLevel?: string;
    description?: string;
  }>> {
    try {
      // Get investment requests first
      const investmentRequestsQuery = userId 
        ? db.select().from(investmentRequests).where(eq(investmentRequests.requesterId, userId)).orderBy(desc(investmentRequests.createdAt)).limit(limit)
        : db.select().from(investmentRequests).orderBy(desc(investmentRequests.createdAt)).limit(limit);

      const investmentResults = await investmentRequestsQuery;

      // Get user information for each request
      const resultsWithUsers = await Promise.all(
        investmentResults.map(async (request) => {
          const [user] = await db.select().from(users).where(eq(users.id, request.requesterId));
          return {
            id: request.id,
            requestId: request.requestId,
            type: 'investment' as const,
            amount: request.amount,
            status: request.status,
            createdAt: request.createdAt || new Date(),
            requester: {
              firstName: user.firstName,
              lastName: user.lastName,
            },
            investmentType: request.investmentType,
            targetCompany: request.targetCompany,
            expectedReturn: request.expectedReturn,
            riskLevel: request.riskLevel,
            description: request.investmentRationale,
          };
        })
      );

      return resultsWithUsers;
    } catch (error) {
      console.error('Error in getRecentRequests:', error);
      return [];
    }
  }

  // Background job operations
  async createBackgroundJob(job: InsertBackgroundJob): Promise<BackgroundJob> {
    const [created] = await db.insert(backgroundJobs).values(job).returning();
    return created;
  }

  async getBackgroundJobsByDocument(documentId: number): Promise<BackgroundJob[]> {
    return await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.documentId, documentId))
      .orderBy(desc(backgroundJobs.createdAt));
  }

  async getBackgroundJob(id: number): Promise<BackgroundJob | undefined> {
    const [job] = await db
      .select()
      .from(backgroundJobs)
      .where(eq(backgroundJobs.id, id));
    return job || undefined;
  }

  async updateBackgroundJob(id: number, job: Partial<InsertBackgroundJob>): Promise<BackgroundJob> {
    const [updated] = await db
      .update(backgroundJobs)
      .set(job)
      .where(eq(backgroundJobs.id, id))
      .returning();
    return updated;
  }

  // Document query operations
  async saveDocumentQuery(query: InsertDocumentQuery): Promise<DocumentQuery> {
    const [saved] = await db.insert(documentQueries).values(query).returning();
    return saved;
  }

  async getDocumentQueries(documentId: number): Promise<any[]> {
    try {
      // Get queries first without ordering to avoid potential issues
      const queries = await db
        .select()
        .from(documentQueries)
        .where(eq(documentQueries.documentId, documentId));
      
      // Sort them manually by createdAt
      queries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      // Get user info for each query
      const result = [];
      for (const query of queries) {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, query.userId));
        
        result.push({
          id: query.id,
          documentId: query.documentId,
          userId: query.userId,
          query: query.query,
          response: query.response,
          createdAt: query.createdAt,
          user: user ? {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username
          } : null
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error in getDocumentQueries:', error);
      throw error;
    }
  }

  // Cross-document query operations
  async saveCrossDocumentQuery(query: InsertCrossDocumentQuery): Promise<CrossDocumentQuery> {
    const [saved] = await db.insert(crossDocumentQueries).values(query).returning();
    return saved;
  }

  async getLastResponseId(requestType: string, requestId: number, userId: number): Promise<string | null> {
    try {
      const [lastQuery] = await db
        .select({ openaiResponseId: crossDocumentQueries.openaiResponseId })
        .from(crossDocumentQueries)
        .where(
          and(
            eq(crossDocumentQueries.requestType, requestType),
            eq(crossDocumentQueries.requestId, requestId),
            eq(crossDocumentQueries.userId, userId),
            isNotNull(crossDocumentQueries.openaiResponseId)
          )
        )
        .orderBy(desc(crossDocumentQueries.createdAt))
        .limit(1);
      
      return lastQuery?.openaiResponseId || null;
    } catch (error) {
      console.error('Error getting last response ID:', error);
      return null;
    }
  }

  async getCrossDocumentQueries(requestType: string, requestId: number): Promise<CrossDocumentQuery[]> {
    try {
      const queries = await db
        .select({
          id: crossDocumentQueries.id,
          requestType: crossDocumentQueries.requestType,
          requestId: crossDocumentQueries.requestId,
          userId: crossDocumentQueries.userId,
          query: crossDocumentQueries.query,
          response: crossDocumentQueries.response,
          documentCount: crossDocumentQueries.documentCount,
          createdAt: crossDocumentQueries.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username
          }
        })
        .from(crossDocumentQueries)
        .leftJoin(users, eq(crossDocumentQueries.userId, users.id))
        .where(
          and(
            eq(crossDocumentQueries.requestType, requestType),
            eq(crossDocumentQueries.requestId, requestId)
          )
        )
        .orderBy(desc(crossDocumentQueries.createdAt));
      
      return queries;
    } catch (error) {
      console.error('Error in getCrossDocumentQueries:', error);
      throw error;
    }
  }

  // Web search query operations
  async saveWebSearchQuery(query: InsertWebSearchQuery): Promise<WebSearchQuery> {
    const [saved] = await db.insert(webSearchQueries).values(query).returning();
    return saved;
  }

  async getLastWebSearchResponseId(requestType: string, requestId: number, userId: number): Promise<string | null> {
    try {
      const [lastQuery] = await db
        .select({ openaiResponseId: webSearchQueries.openaiResponseId })
        .from(webSearchQueries)
        .where(
          and(
            eq(webSearchQueries.requestType, requestType),
            eq(webSearchQueries.requestId, requestId),
            eq(webSearchQueries.userId, userId),
            isNotNull(webSearchQueries.openaiResponseId)
          )
        )
        .orderBy(desc(webSearchQueries.createdAt))
        .limit(1);
      
      return lastQuery?.openaiResponseId || null;
    } catch (error) {
      console.error('Error getting last web search response ID:', error);
      return null;
    }
  }

  async getWebSearchQueries(requestType: string, requestId: number): Promise<WebSearchQuery[]> {
    try {
      const queries = await db
        .select({
          id: webSearchQueries.id,
          requestType: webSearchQueries.requestType,
          requestId: webSearchQueries.requestId,
          userId: webSearchQueries.userId,
          query: webSearchQueries.query,
          response: webSearchQueries.response,
          searchType: webSearchQueries.searchType,
          createdAt: webSearchQueries.createdAt,
          user: {
            id: users.id,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username
          }
        })
        .from(webSearchQueries)
        .leftJoin(users, eq(webSearchQueries.userId, users.id))
        .where(
          and(
            eq(webSearchQueries.requestType, requestType),
            eq(webSearchQueries.requestId, requestId)
          )
        )
        .orderBy(desc(webSearchQueries.createdAt));
      
      return queries;
    } catch (error) {
      console.error('Error in getWebSearchQueries:', error);
      throw error;
    }
  }

  async deleteCrossDocumentQuery(queryId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(crossDocumentQueries)
        .where(
          and(
            eq(crossDocumentQueries.id, queryId),
            eq(crossDocumentQueries.userId, userId)
          )
        );
      
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error in deleteCrossDocumentQuery:', error);
      throw error;
    }
  }

  async deleteWebSearchQuery(queryId: number, userId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(webSearchQueries)
        .where(
          and(
            eq(webSearchQueries.id, queryId),
            eq(webSearchQueries.userId, userId)
          )
        );
      
      return result.rowCount ? result.rowCount > 0 : false;
    } catch (error) {
      console.error('Error in deleteWebSearchQuery:', error);
      throw error;
    }
  }

  // Document category operations
  async getDocumentCategories(): Promise<DocumentCategory[]> {
    return await db
      .select()
      .from(documentCategories)
      .where(eq(documentCategories.isActive, true))
      .orderBy(documentCategories.name);
  }

  // Multiple categories per document operations
  async createDocumentCategoryAssociation(documentId: number, categoryId: number, customCategoryName?: string): Promise<any> {
    const [association] = await db
      .insert(documentCategoryAssociations)
      .values({
        documentId,
        categoryId,
        customCategoryName
      })
      .returning();
    return association;
  }

  async getDocumentCategoryAssociations(documentId: number): Promise<any[]> {
    return await db
      .select({
        id: documentCategoryAssociations.id,
        documentId: documentCategoryAssociations.documentId,
        categoryId: documentCategoryAssociations.categoryId,
        customCategoryName: documentCategoryAssociations.customCategoryName,
        createdAt: documentCategoryAssociations.createdAt,
        category: {
          id: documentCategories.id,
          name: documentCategories.name,
          icon: documentCategories.icon,
          description: documentCategories.description
        }
      })
      .from(documentCategoryAssociations)
      .leftJoin(documentCategories, eq(documentCategoryAssociations.categoryId, documentCategories.id))
      .where(eq(documentCategoryAssociations.documentId, documentId));
  }

  async deleteDocumentCategoryAssociation(documentId: number, categoryId: number): Promise<void> {
    await db
      .delete(documentCategoryAssociations)
      .where(
        and(
          eq(documentCategoryAssociations.documentId, documentId),
          eq(documentCategoryAssociations.categoryId, categoryId)
        )
      );
  }

  async createDocumentCategory(category: InsertDocumentCategory): Promise<DocumentCategory> {
    const [newCategory] = await db
      .insert(documentCategories)
      .values(category)
      .returning();
    return newCategory;
  }



  async getDocumentsByCategory(categoryId?: number): Promise<Document[]> {
    if (!categoryId) {
      return await db
        .select()
        .from(documents)
        .orderBy(desc(documents.createdAt));
    }

    // Get documents that have this category association
    const documentsWithCategory = await db
      .select({
        id: documents.id,
        fileName: documents.fileName,
        originalName: documents.originalName,
        fileSize: documents.fileSize,
        mimeType: documents.mimeType,
        fileUrl: documents.fileUrl,
        uploaderId: documents.uploaderId,
        requestType: documents.requestType,
        requestId: documents.requestId,
        categoryId: documents.categoryId,
        subcategoryId: documents.subcategoryId,
        isAutoCategorized: documents.isAutoCategorized,
        analysisStatus: documents.analysisStatus,
        analysis: documents.analysis,
        summary: documents.summary,
        insights: documents.insights,
        createdAt: documents.createdAt,
      })
      .from(documents)
      .innerJoin(documentCategoryAssociations, eq(documents.id, documentCategoryAssociations.documentId))
      .where(eq(documentCategoryAssociations.categoryId, categoryId))
      .orderBy(desc(documents.createdAt));

    return documentsWithCategory;
  }

  // Sequence operations
  async getNextSequenceValue(sequenceName: string): Promise<number> {
    try {
      // Try to get existing sequence
      const [existing] = await db
        .select()
        .from(sequences)
        .where(eq(sequences.sequenceName, sequenceName))
        .limit(1);

      if (existing) {
        // Update and return next value
        const nextValue = existing.currentValue + 1;
        await db
          .update(sequences)
          .set({ 
            currentValue: nextValue, 
            updatedAt: new Date() 
          })
          .where(eq(sequences.id, existing.id));
        
        return nextValue;
      } else {
        // Extract year from sequence name (format: PREFIX_YEAR)
        const yearMatch = sequenceName.match(/_(\d{4})$/);
        const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
        
        // Create new sequence starting at 1
        const [newSequence] = await db
          .insert(sequences)
          .values({
            sequenceName,
            currentValue: 1,
            year,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return newSequence.currentValue;
      }
    } catch (error) {
      console.error('Error in getNextSequenceValue:', error);
      throw error;
    }
  }

  // Template operations
  async updateTemplate(id: number, template: Partial<InsertTemplate>): Promise<Template> {
    const [updatedTemplate] = await db
      .update(templates)
      .set({ ...template, updatedAt: new Date() })
      .where(eq(templates.id, id))
      .returning();
    return updatedTemplate;
  }

  async deleteTemplate(id: number): Promise<void> {
    await db.delete(templates).where(eq(templates.id, id));
  }

  // Investment rationale operations
  async createInvestmentRationale(rationale: InsertInvestmentRationale): Promise<InvestmentRationale> {
    const [newRationale] = await db
      .insert(investmentRationales)
      .values(rationale)
      .returning();
    return newRationale;
  }

  async getInvestmentRationales(investmentId: number): Promise<InvestmentRationale[]> {
    return await db
      .select({
        id: investmentRationales.id,
        investmentId: investmentRationales.investmentId,
        templateId: investmentRationales.templateId,
        content: investmentRationales.content,
        type: investmentRationales.type,
        authorId: investmentRationales.authorId,
        createdAt: investmentRationales.createdAt,
        updatedAt: investmentRationales.updatedAt,
        template: {
          id: templates.id,
          name: templates.name
        },
        author: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName
        }
      })
      .from(investmentRationales)
      .leftJoin(templates, eq(investmentRationales.templateId, templates.id))
      .leftJoin(users, eq(investmentRationales.authorId, users.id))
      .where(eq(investmentRationales.investmentId, investmentId))
      .orderBy(desc(investmentRationales.createdAt));
  }

  async updateInvestmentRationale(id: number, rationale: Partial<InsertInvestmentRationale>): Promise<InvestmentRationale> {
    const [updatedRationale] = await db
      .update(investmentRationales)
      .set({ ...rationale, updatedAt: new Date() })
      .where(eq(investmentRationales.id, id))
      .returning();
    return updatedRationale;
  }

  async deleteInvestmentRationale(id: number): Promise<void> {
    await db.delete(investmentRationales).where(eq(investmentRationales.id, id));
  }

  // ============================================================================
  // LAMS Implementation
  // ============================================================================

  // Parcel operations
  async getParcel(id: number): Promise<Parcel | undefined> {
    const [parcel] = await db.select().from(parcels).where(eq(parcels.id, id));
    return parcel || undefined;
  }

  async getParcelByParcelNo(parcelNo: string): Promise<Parcel | undefined> {
    const [parcel] = await db.select().from(parcels).where(eq(parcels.parcelNo, parcelNo));
    return parcel || undefined;
  }

  async createParcel(parcel: InsertParcel): Promise<Parcel> {
    const [created] = await db.insert(parcels).values(parcel).returning();
    return created;
  }

  async updateParcel(id: number, parcel: Partial<InsertParcel>): Promise<Parcel> {
    const [updated] = await db.update(parcels).set({ ...parcel, updatedAt: new Date() }).where(eq(parcels.id, id)).returning();
    return updated;
  }

  async getParcels(filters?: { status?: string; district?: string }): Promise<Parcel[]> {
    const conditions: any[] = [];
    if (filters?.status) {
      conditions.push(eq(parcels.status, filters.status));
    }
    if (filters?.district) {
      conditions.push(eq(parcels.district, filters.district));
    }
    const query = conditions.length > 0 
      ? db.select().from(parcels).where(and(...conditions))
      : db.select().from(parcels);
    return await query.orderBy(desc(parcels.createdAt));
  }

  // Owner operations
  async getOwner(id: number): Promise<Owner | undefined> {
    const [owner] = await db.select().from(owners).where(eq(owners.id, id));
    return owner || undefined;
  }

  async createOwner(owner: InsertOwner): Promise<Owner> {
    const [created] = await db.insert(owners).values(owner).returning();
    return created;
  }

  async updateOwner(id: number, owner: Partial<InsertOwner>): Promise<Owner> {
    const [updated] = await db.update(owners).set({ ...owner, updatedAt: new Date() }).where(eq(owners.id, id)).returning();
    return updated;
  }

  async getOwners(filters?: { name?: string }): Promise<Owner[]> {
    const conditions: any[] = [];
    if (filters?.name) {
      conditions.push(sql`${owners.name} ILIKE ${`%${filters.name}%`}`);
    }
    const query = conditions.length > 0
      ? db.select().from(owners).where(and(...conditions))
      : db.select().from(owners);
    return await query.orderBy(desc(owners.createdAt));
  }

  // Parcel-Owner operations
  async createParcelOwner(parcelOwner: InsertParcelOwner): Promise<ParcelOwner> {
    const [created] = await db.insert(parcelOwners).values(parcelOwner).returning();
    return created;
  }

  async getParcelOwners(parcelId: number): Promise<ParcelOwner[]> {
    return await db.select().from(parcelOwners).where(eq(parcelOwners.parcelId, parcelId));
  }

  async deleteParcelOwner(id: number): Promise<void> {
    await db.delete(parcelOwners).where(eq(parcelOwners.id, id));
  }

  // SIA operations
  async getSia(id: number): Promise<Sia | undefined> {
    const [siaRecord] = await db.select().from(sia).where(eq(sia.id, id));
    return siaRecord || undefined;
  }

  async getSiaByNoticeNo(noticeNo: string): Promise<Sia | undefined> {
    const [siaRecord] = await db.select().from(sia).where(eq(sia.noticeNo, noticeNo));
    return siaRecord || undefined;
  }

  async createSia(siaData: InsertSia): Promise<Sia> {
    const [created] = await db.insert(sia).values(siaData).returning();
    return created;
  }

  async updateSia(id: number, siaData: Partial<InsertSia>): Promise<Sia> {
    const [updated] = await db.update(sia).set({ ...siaData, updatedAt: new Date() }).where(eq(sia.id, id)).returning();
    return updated;
  }

  async getSias(filters?: { status?: string; createdBy?: number }): Promise<Sia[]> {
    const conditions: any[] = [];
    if (filters?.status) {
      conditions.push(eq(sia.status, filters.status));
    }
    if (filters?.createdBy) {
      conditions.push(eq(sia.createdBy, filters.createdBy));
    }
    const query = conditions.length > 0
      ? db.select().from(sia).where(and(...conditions))
      : db.select().from(sia);
    return await query.orderBy(desc(sia.createdAt));
  }

  // SIA Feedback operations
  async createSiaFeedback(feedback: InsertSiaFeedback): Promise<SiaFeedback> {
    const [created] = await db.insert(siaFeedback).values(feedback).returning();
    return created;
  }

  async getSiaFeedbacks(siaId: number): Promise<SiaFeedback[]> {
    return await db.select().from(siaFeedback).where(eq(siaFeedback.siaId, siaId)).orderBy(desc(siaFeedback.createdAt));
  }

  async updateSiaFeedback(id: number, feedback: Partial<InsertSiaFeedback>): Promise<SiaFeedback> {
    const [updated] = await db.update(siaFeedback).set({ ...feedback, updatedAt: new Date() }).where(eq(siaFeedback.id, id)).returning();
    return updated;
  }

  // SIA Hearing operations
  async createSiaHearing(hearing: InsertSiaHearing): Promise<SiaHearing> {
    const [created] = await db.insert(siaHearings).values(hearing).returning();
    return created;
  }

  async getSiaHearing(id: number): Promise<SiaHearing | undefined> {
    const [hearing] = await db.select().from(siaHearings).where(eq(siaHearings.id, id));
    return hearing || undefined;
  }

  async getSiaHearings(siaId: number): Promise<SiaHearing[]> {
    return await db.select().from(siaHearings).where(eq(siaHearings.siaId, siaId)).orderBy(desc(siaHearings.date));
  }

  async updateSiaHearing(id: number, hearing: Partial<InsertSiaHearing>): Promise<SiaHearing> {
    const [updated] = await db.update(siaHearings).set({ ...hearing, updatedAt: new Date() }).where(eq(siaHearings.id, id)).returning();
    return updated;
  }

  // SIA Report operations
  async createSiaReport(report: InsertSiaReport): Promise<SiaReport> {
    const [created] = await db.insert(siaReports).values(report).returning();
    return created;
  }

  async getSiaReports(siaId: number): Promise<SiaReport[]> {
    return await db.select().from(siaReports).where(eq(siaReports.siaId, siaId)).orderBy(desc(siaReports.generatedAt));
  }

  async getSiaReport(id: number): Promise<SiaReport | undefined> {
    const [report] = await db.select().from(siaReports).where(eq(siaReports.id, id));
    return report || undefined;
  }

  // Land Notification operations
  async getLandNotification(id: number): Promise<LandNotification | undefined> {
    const [notification] = await db.select().from(landNotifications).where(eq(landNotifications.id, id));
    return notification || undefined;
  }

  async getLandNotificationByRefNo(refNo: string): Promise<LandNotification | undefined> {
    const [notification] = await db.select().from(landNotifications).where(eq(landNotifications.refNo, refNo));
    return notification || undefined;
  }

  async createLandNotification(notification: InsertLandNotification): Promise<LandNotification> {
    const [created] = await db.insert(landNotifications).values(notification).returning();
    return created;
  }

  async updateLandNotification(id: number, notification: Partial<InsertLandNotification>): Promise<LandNotification> {
    const [updated] = await db.update(landNotifications).set({ ...notification, updatedAt: new Date() }).where(eq(landNotifications.id, id)).returning();
    return updated;
  }

  async getLandNotifications(filters?: { type?: string; status?: string }): Promise<LandNotification[]> {
    const conditions: any[] = [];
    if (filters?.type) {
      conditions.push(eq(landNotifications.type, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(landNotifications.status, filters.status));
    }
    const query = conditions.length > 0
      ? db.select().from(landNotifications).where(and(...conditions))
      : db.select().from(landNotifications);
    return await query.orderBy(desc(landNotifications.createdAt));
  }

  // Notification-Parcel operations
  async createNotificationParcel(notificationParcel: InsertNotificationParcel): Promise<NotificationParcel> {
    const [created] = await db.insert(notificationParcels).values(notificationParcel).returning();
    return created;
  }

  async getNotificationParcels(notificationId: number): Promise<NotificationParcel[]> {
    return await db.select().from(notificationParcels).where(eq(notificationParcels.notificationId, notificationId));
  }

  async deleteNotificationParcel(id: number): Promise<void> {
    await db.delete(notificationParcels).where(eq(notificationParcels.id, id));
  }

  // Objection operations
  async getObjection(id: number): Promise<Objection | undefined> {
    const [objection] = await db.select().from(objections).where(eq(objections.id, id));
    return objection || undefined;
  }

  async createObjection(objection: InsertObjection): Promise<Objection> {
    const [created] = await db.insert(objections).values(objection).returning();
    return created;
  }

  async updateObjection(id: number, objection: Partial<InsertObjection>): Promise<Objection> {
    const [updated] = await db.update(objections).set({ ...objection, updatedAt: new Date() }).where(eq(objections.id, id)).returning();
    return updated;
  }

  async getObjections(filters?: { notificationId?: number; status?: string }): Promise<Objection[]> {
    const conditions: any[] = [];
    if (filters?.notificationId) {
      conditions.push(eq(objections.notificationId, filters.notificationId));
    }
    if (filters?.status) {
      conditions.push(eq(objections.status, filters.status));
    }
    const query = conditions.length > 0
      ? db.select().from(objections).where(and(...conditions))
      : db.select().from(objections);
    return await query.orderBy(desc(objections.createdAt));
  }

  async getUnresolvedObjections(notificationId: number): Promise<Objection[]> {
    return await db.select().from(objections)
      .where(
        and(
          eq(objections.notificationId, notificationId),
          sql`${objections.status} NOT IN ('resolved', 'rejected')`
        )
      );
  }

  // Valuation operations
  async getValuation(id: number): Promise<Valuation | undefined> {
    const [valuation] = await db.select().from(valuations).where(eq(valuations.id, id));
    return valuation || undefined;
  }

  async createValuation(valuation: InsertValuation): Promise<Valuation> {
    const [created] = await db.insert(valuations).values(valuation).returning();
    return created;
  }

  async updateValuation(id: number, valuation: Partial<InsertValuation>): Promise<Valuation> {
    const [updated] = await db.update(valuations).set({ ...valuation, updatedAt: new Date() }).where(eq(valuations.id, id)).returning();
    return updated;
  }

  async getValuations(filters?: { parcelId?: number }): Promise<Valuation[]> {
    const conditions: any[] = [];
    if (filters?.parcelId) {
      conditions.push(eq(valuations.parcelId, filters.parcelId));
    }
    const query = conditions.length > 0
      ? db.select().from(valuations).where(and(...conditions))
      : db.select().from(valuations);
    return await query.orderBy(desc(valuations.createdAt));
  }

  async getValuationByParcel(parcelId: number): Promise<Valuation | undefined> {
    const [valuation] = await db.select().from(valuations)
      .where(eq(valuations.parcelId, parcelId))
      .orderBy(desc(valuations.createdAt))
      .limit(1);
    return valuation || undefined;
  }

  // Award operations
  async getAward(id: number): Promise<Award | undefined> {
    const [award] = await db.select().from(awards).where(eq(awards.id, id));
    return award || undefined;
  }

  async getAwardByAwardNo(awardNo: string): Promise<Award | undefined> {
    const [award] = await db.select().from(awards).where(eq(awards.awardNo, awardNo));
    return award || undefined;
  }

  async getAwardByLoiNo(loiNo: string): Promise<Award | undefined> {
    const [award] = await db.select().from(awards).where(eq(awards.loiNo, loiNo));
    return award || undefined;
  }

  async createAward(award: InsertAward): Promise<Award> {
    const [created] = await db.insert(awards).values(award).returning();
    return created;
  }

  async updateAward(id: number, award: Partial<InsertAward>): Promise<Award> {
    const [updated] = await db.update(awards).set({ ...award, updatedAt: new Date() }).where(eq(awards.id, id)).returning();
    return updated;
  }

  async getAwards(filters?: { parcelId?: number; ownerId?: number; status?: string }): Promise<Award[]> {
    const conditions: any[] = [];
    if (filters?.parcelId) {
      conditions.push(eq(awards.parcelId, filters.parcelId));
    }
    if (filters?.ownerId) {
      conditions.push(eq(awards.ownerId, filters.ownerId));
    }
    if (filters?.status) {
      conditions.push(eq(awards.status, filters.status));
    }
    const query = conditions.length > 0
      ? db.select().from(awards).where(and(...conditions))
      : db.select().from(awards);
    return await query.orderBy(desc(awards.createdAt));
  }

  // Payment operations
  async getPayment(id: number): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [created] = await db.insert(payments).values(payment).returning();
    return created;
  }

  async updatePayment(id: number, payment: Partial<InsertPayment>): Promise<Payment> {
    const [updated] = await db.update(payments).set({ ...payment, updatedAt: new Date() }).where(eq(payments.id, id)).returning();
    return updated;
  }

  async getPayments(filters?: { awardId?: number; status?: string }): Promise<Payment[]> {
    const conditions: any[] = [];
    if (filters?.awardId) {
      conditions.push(eq(payments.awardId, filters.awardId));
    }
    if (filters?.status) {
      conditions.push(eq(payments.status, filters.status));
    }
    const query = conditions.length > 0
      ? db.select().from(payments).where(and(...conditions))
      : db.select().from(payments);
    return await query.orderBy(desc(payments.createdAt));
  }

  async getPaymentsByAward(awardId: number): Promise<Payment[]> {
    return await db.select().from(payments)
      .where(eq(payments.awardId, awardId))
      .orderBy(desc(payments.createdAt));
  }

  // Possession operations
  async getPossession(id: number): Promise<Possession | undefined> {
    const [possessionRecord] = await db.select().from(possession).where(eq(possession.id, id));
    return possessionRecord || undefined;
  }

  async createPossession(possessionData: InsertPossession): Promise<Possession> {
    const [created] = await db.insert(possession).values(possessionData).returning();
    return created;
  }

  async updatePossession(id: number, possessionData: Partial<InsertPossession>): Promise<Possession> {
    const [updated] = await db.update(possession).set({ ...possessionData, updatedAt: new Date() }).where(eq(possession.id, id)).returning();
    return updated;
  }

  async getPossessions(filters?: { parcelId?: number; status?: string }): Promise<Possession[]> {
    const conditions: any[] = [];
    if (filters?.parcelId) {
      conditions.push(eq(possession.parcelId, filters.parcelId));
    }
    if (filters?.status) {
      conditions.push(eq(possession.status, filters.status));
    }
    const query = conditions.length > 0
      ? db.select().from(possession).where(and(...conditions))
      : db.select().from(possession);
    return await query.orderBy(desc(possession.createdAt));
  }

  async getPossessionByParcel(parcelId: number): Promise<Possession | undefined> {
    const [possessionRecord] = await db.select().from(possession)
      .where(eq(possession.parcelId, parcelId))
      .orderBy(desc(possession.createdAt))
      .limit(1);
    return possessionRecord || undefined;
  }

  // Possession Media operations
  async createPossessionMedia(media: InsertPossessionMedia): Promise<PossessionMedia> {
    const [created] = await db.insert(possessionMedia).values(media).returning();
    return created;
  }

  async getPossessionMedia(possessionId: number): Promise<PossessionMedia[]> {
    return await db.select().from(possessionMedia)
      .where(eq(possessionMedia.possessionId, possessionId))
      .orderBy(desc(possessionMedia.capturedAt));
  }

  async deletePossessionMedia(id: number): Promise<void> {
    await db.delete(possessionMedia).where(eq(possessionMedia.id, id));
  }

  // ============================================================================
  // PMS (Property Management System) Storage Methods
  // ============================================================================

  // Party operations
  async getParty(id: number): Promise<Party | undefined> {
    const result = await db.select().from(parties).where(eq(parties.id, id)).limit(1);
    return result[0];
  }

  async getParties(filters?: { name?: string; phone?: string; aadhaar?: string }): Promise<Party[]> {
    let query = db.select().from(parties);
    const conditions = [];
    
    if (filters?.name) {
      conditions.push(sql`${parties.name} ILIKE ${'%' + filters.name + '%'}`);
    }
    if (filters?.phone) {
      conditions.push(eq(parties.phone, filters.phone));
    }
    if (filters?.aadhaar) {
      conditions.push(eq(parties.aadhaar, filters.aadhaar));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query;
  }

  async createParty(party: InsertParty): Promise<Party> {
    const result = await db.insert(parties).values(party).returning();
    return result[0];
  }

  async updateParty(id: number, party: Partial<InsertParty>): Promise<Party> {
    const result = await db.update(parties)
      .set({ ...party, updatedAt: new Date() })
      .where(eq(parties.id, id))
      .returning();
    return result[0];
  }

  // Scheme operations
  async getScheme(id: number): Promise<Scheme | undefined> {
    const result = await db.select().from(schemes).where(eq(schemes.id, id)).limit(1);
    return result[0];
  }

  async getSchemes(filters?: { status?: string; createdBy?: number }): Promise<Scheme[]> {
    let query = db.select().from(schemes);
    const conditions = [];
    
    if (filters?.status) {
      conditions.push(eq(schemes.status, filters.status));
    }
    if (filters?.createdBy) {
      conditions.push(eq(schemes.createdBy, filters.createdBy));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(schemes.createdAt));
  }

  async createScheme(scheme: InsertScheme): Promise<Scheme> {
    const result = await db.insert(schemes).values(scheme).returning();
    return result[0];
  }

  async updateScheme(id: number, scheme: Partial<InsertScheme>): Promise<Scheme> {
    const result = await db.update(schemes)
      .set({ ...scheme, updatedAt: new Date() })
      .where(eq(schemes.id, id))
      .returning();
    return result[0];
  }

  // Property operations
  async getProperty(id: number): Promise<Property | undefined> {
    const result = await db.select().from(properties).where(eq(properties.id, id)).limit(1);
    return result[0];
  }

  async getPropertyByParcelNo(parcelNo: string): Promise<Property | undefined> {
    const result = await db.select().from(properties).where(eq(properties.parcelNo, parcelNo)).limit(1);
    return result[0];
  }

  async getProperties(filters?: { schemeId?: number; status?: string }): Promise<Property[]> {
    let query = db.select().from(properties);
    const conditions = [];
    
    if (filters?.schemeId) {
      conditions.push(eq(properties.schemeId, filters.schemeId));
    }
    if (filters?.status) {
      conditions.push(eq(properties.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(properties.createdAt));
  }

  async createProperty(property: InsertProperty): Promise<Property> {
    const result = await db.insert(properties).values(property).returning();
    return result[0];
  }

  async updateProperty(id: number, property: Partial<InsertProperty>): Promise<Property> {
    const result = await db.update(properties)
      .set({ ...property, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return result[0];
  }

  // Ownership operations
  async getPropertyOwners(propertyId: number): Promise<Ownership[]> {
    return await db.select().from(ownership)
      .where(eq(ownership.propertyId, propertyId))
      .orderBy(ownership.createdAt);
  }

  async createOwnership(ownershipData: InsertOwnership): Promise<Ownership> {
    const result = await db.insert(ownership).values(ownershipData).returning();
    return result[0];
  }

  async updateOwnership(id: number, ownershipData: Partial<InsertOwnership>): Promise<Ownership> {
    const result = await db.update(ownership)
      .set({ ...ownershipData, updatedAt: new Date() })
      .where(eq(ownership.id, id))
      .returning();
    return result[0];
  }

  async deleteOwnership(id: number): Promise<void> {
    await db.delete(ownership).where(eq(ownership.id, id));
  }

  // Application operations
  async getApplication(id: number): Promise<Application | undefined> {
    const result = await db.select().from(applications).where(eq(applications.id, id)).limit(1);
    return result[0];
  }

  async getApplications(filters?: { schemeId?: number; partyId?: number; status?: string }): Promise<Application[]> {
    let query = db.select().from(applications);
    const conditions = [];
    
    if (filters?.schemeId) {
      conditions.push(eq(applications.schemeId, filters.schemeId));
    }
    if (filters?.partyId) {
      conditions.push(eq(applications.partyId, filters.partyId));
    }
    if (filters?.status) {
      conditions.push(eq(applications.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(applications.createdAt));
  }

  async createApplication(application: InsertApplication): Promise<Application> {
    const result = await db.insert(applications).values(application).returning();
    return result[0];
  }

  async updateApplication(id: number, application: Partial<InsertApplication>): Promise<Application> {
    const result = await db.update(applications)
      .set({ ...application, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return result[0];
  }

  // Allotment operations
  async getAllotment(id: number): Promise<Allotment | undefined> {
    const result = await db.select().from(allotments).where(eq(allotments.id, id)).limit(1);
    return result[0];
  }

  async getAllotmentByLetterNo(letterNo: string): Promise<Allotment | undefined> {
    const result = await db.select().from(allotments).where(eq(allotments.letterNo, letterNo)).limit(1);
    return result[0];
  }

  async getAllotments(filters?: { propertyId?: number; partyId?: number; status?: string }): Promise<Allotment[]> {
    let query = db.select().from(allotments);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(allotments.propertyId, filters.propertyId));
    }
    if (filters?.partyId) {
      conditions.push(eq(allotments.partyId, filters.partyId));
    }
    if (filters?.status) {
      conditions.push(eq(allotments.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(allotments.createdAt));
  }

  async createAllotment(allotment: InsertAllotment): Promise<Allotment> {
    const result = await db.insert(allotments).values(allotment).returning();
    return result[0];
  }

  async updateAllotment(id: number, allotment: Partial<InsertAllotment>): Promise<Allotment> {
    const result = await db.update(allotments)
      .set({ ...allotment, updatedAt: new Date() })
      .where(eq(allotments.id, id))
      .returning();
    return result[0];
  }

  // ============================================================================
  // PMS Phase 3 Storage Methods (Property Lifecycle)
  // ============================================================================

  // Transfer operations
  async getTransfer(id: number): Promise<Transfer | undefined> {
    const result = await db.select().from(transfers).where(eq(transfers.id, id)).limit(1);
    return result[0];
  }

  async getTransfers(filters?: { propertyId?: number; status?: string }): Promise<Transfer[]> {
    let query = db.select().from(transfers);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(transfers.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(transfers.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(transfers.createdAt));
  }

  async createTransfer(transfer: InsertTransfer): Promise<Transfer> {
    const result = await db.insert(transfers).values(transfer).returning();
    return result[0];
  }

  async updateTransfer(id: number, transfer: Partial<InsertTransfer>): Promise<Transfer> {
    const result = await db.update(transfers)
      .set({ ...transfer, updatedAt: new Date() })
      .where(eq(transfers.id, id))
      .returning();
    return result[0];
  }

  // Mortgage operations
  async getMortgage(id: number): Promise<Mortgage | undefined> {
    const result = await db.select().from(mortgages).where(eq(mortgages.id, id)).limit(1);
    return result[0];
  }

  async getMortgages(filters?: { propertyId?: number; status?: string }): Promise<Mortgage[]> {
    let query = db.select().from(mortgages);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(mortgages.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(mortgages.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(mortgages.createdAt));
  }

  async createMortgage(mortgage: InsertMortgage): Promise<Mortgage> {
    const result = await db.insert(mortgages).values(mortgage).returning();
    return result[0];
  }

  async updateMortgage(id: number, mortgage: Partial<InsertMortgage>): Promise<Mortgage> {
    const result = await db.update(mortgages)
      .set({ ...mortgage, updatedAt: new Date() })
      .where(eq(mortgages.id, id))
      .returning();
    return result[0];
  }

  // Modification operations
  async getModification(id: number): Promise<Modification | undefined> {
    const result = await db.select().from(modifications).where(eq(modifications.id, id)).limit(1);
    return result[0];
  }

  async getModifications(filters?: { propertyId?: number; status?: string }): Promise<Modification[]> {
    let query = db.select().from(modifications);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(modifications.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(modifications.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(modifications.createdAt));
  }

  async createModification(modification: InsertModification): Promise<Modification> {
    const result = await db.insert(modifications).values(modification).returning();
    return result[0];
  }

  async updateModification(id: number, modification: Partial<InsertModification>): Promise<Modification> {
    const result = await db.update(modifications)
      .set({ ...modification, updatedAt: new Date() })
      .where(eq(modifications.id, id))
      .returning();
    return result[0];
  }

  // NOC operations
  async getNOC(id: number): Promise<NOC | undefined> {
    const result = await db.select().from(nocs).where(eq(nocs.id, id)).limit(1);
    return result[0];
  }

  async getNOCs(filters?: { propertyId?: number; type?: string; status?: string }): Promise<NOC[]> {
    let query = db.select().from(nocs);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(nocs.propertyId, filters.propertyId));
    }
    if (filters?.type) {
      conditions.push(eq(nocs.type, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(nocs.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(nocs.createdAt));
  }

  async createNOC(noc: InsertNOC): Promise<NOC> {
    const result = await db.insert(nocs).values(noc).returning();
    return result[0];
  }

  async updateNOC(id: number, noc: Partial<InsertNOC>): Promise<NOC> {
    const result = await db.update(nocs)
      .set({ ...noc, updatedAt: new Date() })
      .where(eq(nocs.id, id))
      .returning();
    return result[0];
  }

  // Conveyance Deed operations
  async getConveyanceDeed(id: number): Promise<ConveyanceDeed | undefined> {
    const result = await db.select().from(conveyanceDeeds).where(eq(conveyanceDeeds.id, id)).limit(1);
    return result[0];
  }

  async getConveyanceDeeds(filters?: { propertyId?: number; transferId?: number; status?: string }): Promise<ConveyanceDeed[]> {
    let query = db.select().from(conveyanceDeeds);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(conveyanceDeeds.propertyId, filters.propertyId));
    }
    if (filters?.transferId) {
      conditions.push(eq(conveyanceDeeds.transferId, filters.transferId));
    }
    if (filters?.status) {
      conditions.push(eq(conveyanceDeeds.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(conveyanceDeeds.createdAt));
  }

  async createConveyanceDeed(deed: InsertConveyanceDeed): Promise<ConveyanceDeed> {
    const result = await db.insert(conveyanceDeeds).values(deed).returning();
    return result[0];
  }

  async updateConveyanceDeed(id: number, deed: Partial<InsertConveyanceDeed>): Promise<ConveyanceDeed> {
    const result = await db.update(conveyanceDeeds)
      .set({ ...deed, updatedAt: new Date() })
      .where(eq(conveyanceDeeds.id, id))
      .returning();
    return result[0];
  }

  // ============================================================================
  // PMS Phase 4 Storage Methods (Payments & Ledgers)
  // ============================================================================

  // Demand Note operations
  async getDemandNote(id: number): Promise<DemandNote | undefined> {
    const result = await db.select().from(demandNotes).where(eq(demandNotes.id, id)).limit(1);
    return result[0];
  }

  async getDemandNotes(filters?: { propertyId?: number; partyId?: number; status?: string }): Promise<DemandNote[]> {
    let query = db.select().from(demandNotes);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(demandNotes.propertyId, filters.propertyId));
    }
    if (filters?.partyId) {
      conditions.push(eq(demandNotes.partyId, filters.partyId));
    }
    if (filters?.status) {
      conditions.push(eq(demandNotes.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(demandNotes.createdAt));
  }

  async createDemandNote(demandNote: InsertDemandNote): Promise<DemandNote> {
    const result = await db.insert(demandNotes).values(demandNote).returning();
    return result[0];
  }

  async updateDemandNote(id: number, demandNote: Partial<InsertDemandNote>): Promise<DemandNote> {
    const result = await db.update(demandNotes)
      .set({ ...demandNote, updatedAt: new Date() })
      .where(eq(demandNotes.id, id))
      .returning();
    return result[0];
  }

  // Payment operations
  async getPmsPayment(id: number): Promise<Payment | undefined> {
    const result = await db.select().from(pmsPayments).where(eq(pmsPayments.id, id)).limit(1);
    return result[0];
  }

  async getPmsPayments(filters?: { propertyId?: number; partyId?: number; demandNoteId?: number; status?: string }): Promise<Payment[]> {
    let query = db.select().from(pmsPayments);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(pmsPayments.propertyId, filters.propertyId));
    }
    if (filters?.partyId) {
      conditions.push(eq(pmsPayments.partyId, filters.partyId));
    }
    if (filters?.demandNoteId) {
      conditions.push(eq(pmsPayments.demandNoteId, filters.demandNoteId));
    }
    if (filters?.status) {
      conditions.push(eq(pmsPayments.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(pmsPayments.createdAt));
  }

  async createPmsPayment(payment: InsertPayment): Promise<Payment> {
    const result = await db.insert(pmsPayments).values(payment).returning();
    return result[0];
  }

  async updatePmsPayment(id: number, payment: Partial<InsertPayment>): Promise<Payment> {
    const result = await db.update(pmsPayments)
      .set({ ...payment, updatedAt: new Date() })
      .where(eq(pmsPayments.id, id))
      .returning();
    return result[0];
  }

  // Receipt operations
  async getReceipt(id: number): Promise<Receipt | undefined> {
    const result = await db.select().from(receipts).where(eq(receipts.id, id)).limit(1);
    return result[0];
  }

  async getReceipts(filters?: { paymentId?: number }): Promise<Receipt[]> {
    let query = db.select().from(receipts);
    if (filters?.paymentId) {
      query = query.where(eq(receipts.paymentId, filters.paymentId)) as any;
    }
    return await query.orderBy(desc(receipts.createdAt));
  }

  async createReceipt(receipt: InsertReceipt): Promise<Receipt> {
    const result = await db.insert(receipts).values(receipt).returning();
    return result[0];
  }

  async updateReceipt(id: number, receipt: Partial<InsertReceipt>): Promise<Receipt> {
    const result = await db.update(receipts)
      .set({ ...receipt, updatedAt: new Date() })
      .where(eq(receipts.id, id))
      .returning();
    return result[0];
  }

  // Refund operations
  async getRefund(id: number): Promise<Refund | undefined> {
    const result = await db.select().from(refunds).where(eq(refunds.id, id)).limit(1);
    return result[0];
  }

  async getRefunds(filters?: { propertyId?: number; partyId?: number; paymentId?: number; status?: string }): Promise<Refund[]> {
    let query = db.select().from(refunds);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(refunds.propertyId, filters.propertyId));
    }
    if (filters?.partyId) {
      conditions.push(eq(refunds.partyId, filters.partyId));
    }
    if (filters?.paymentId) {
      conditions.push(eq(refunds.paymentId, filters.paymentId));
    }
    if (filters?.status) {
      conditions.push(eq(refunds.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(refunds.createdAt));
  }

  async createRefund(refund: InsertRefund): Promise<Refund> {
    const result = await db.insert(refunds).values(refund).returning();
    return result[0];
  }

  async updateRefund(id: number, refund: Partial<InsertRefund>): Promise<Refund> {
    const result = await db.update(refunds)
      .set({ ...refund, updatedAt: new Date() })
      .where(eq(refunds.id, id))
      .returning();
    return result[0];
  }

  // Ledger operations
  async getLedger(id: number): Promise<Ledger | undefined> {
    const result = await db.select().from(ledgers).where(eq(ledgers.id, id)).limit(1);
    return result[0];
  }

  async getLedgers(filters?: { propertyId?: number; partyId?: number }): Promise<Ledger[]> {
    let query = db.select().from(ledgers);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(ledgers.propertyId, filters.propertyId));
    }
    if (filters?.partyId) {
      conditions.push(eq(ledgers.partyId, filters.partyId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(ledgers.createdAt);
  }

  async createLedger(ledger: InsertLedger): Promise<Ledger> {
    const result = await db.insert(ledgers).values(ledger).returning();
    return result[0];
  }

  // Phase 7: Water & Sewerage Connections operations
  async getWaterConnection(id: number): Promise<WaterConnection | undefined> {
    const result = await db.select().from(waterConnections).where(eq(waterConnections.id, id)).limit(1);
    return result[0];
  }

  async getWaterConnections(filters?: { propertyId?: number; partyId?: number; status?: string }): Promise<WaterConnection[]> {
    let query = db.select().from(waterConnections);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(waterConnections.propertyId, filters.propertyId));
    }
    if (filters?.partyId) {
      conditions.push(eq(waterConnections.partyId, filters.partyId));
    }
    if (filters?.status) {
      conditions.push(eq(waterConnections.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(waterConnections.createdAt));
  }

  async createWaterConnection(connection: InsertWaterConnection): Promise<WaterConnection> {
    const result = await db.insert(waterConnections).values(connection).returning();
    return result[0];
  }

  async updateWaterConnection(id: number, connection: Partial<InsertWaterConnection>): Promise<WaterConnection> {
    const result = await db.update(waterConnections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(waterConnections.id, id))
      .returning();
    return result[0];
  }

  async getSewerageConnection(id: number): Promise<SewerageConnection | undefined> {
    const result = await db.select().from(sewerageConnections).where(eq(sewerageConnections.id, id)).limit(1);
    return result[0];
  }

  async getSewerageConnections(filters?: { propertyId?: number; partyId?: number; status?: string }): Promise<SewerageConnection[]> {
    let query = db.select().from(sewerageConnections);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(sewerageConnections.propertyId, filters.propertyId));
    }
    if (filters?.partyId) {
      conditions.push(eq(sewerageConnections.partyId, filters.partyId));
    }
    if (filters?.status) {
      conditions.push(eq(sewerageConnections.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(sewerageConnections.createdAt));
  }

  async createSewerageConnection(connection: InsertSewerageConnection): Promise<SewerageConnection> {
    const result = await db.insert(sewerageConnections).values(connection).returning();
    return result[0];
  }

  async updateSewerageConnection(id: number, connection: Partial<InsertSewerageConnection>): Promise<SewerageConnection> {
    const result = await db.update(sewerageConnections)
      .set({ ...connection, updatedAt: new Date() })
      .where(eq(sewerageConnections.id, id))
      .returning();
    return result[0];
  }

  async getConnectionInspection(id: number): Promise<ConnectionInspection | undefined> {
    const result = await db.select().from(connectionInspections).where(eq(connectionInspections.id, id)).limit(1);
    return result[0];
  }

  async getConnectionInspections(filters?: { connectionType?: string; connectionId?: number; status?: string }): Promise<ConnectionInspection[]> {
    let query = db.select().from(connectionInspections);
    const conditions = [];
    
    if (filters?.connectionType) {
      conditions.push(eq(connectionInspections.connectionType, filters.connectionType));
    }
    if (filters?.connectionId) {
      conditions.push(eq(connectionInspections.connectionId, filters.connectionId));
    }
    if (filters?.status) {
      conditions.push(eq(connectionInspections.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(connectionInspections.createdAt));
  }

  async createConnectionInspection(inspection: InsertConnectionInspection): Promise<ConnectionInspection> {
    const result = await db.insert(connectionInspections).values(inspection).returning();
    return result[0];
  }

  async updateConnectionInspection(id: number, inspection: Partial<InsertConnectionInspection>): Promise<ConnectionInspection> {
    const result = await db.update(connectionInspections)
      .set({ ...inspection, updatedAt: new Date() })
      .where(eq(connectionInspections.id, id))
      .returning();
    return result[0];
  }

  async getLatestLedgerBalance(propertyId: number, partyId: number): Promise<string> {
    const result = await db.select()
      .from(ledgers)
      .where(and(
        eq(ledgers.propertyId, propertyId),
        eq(ledgers.partyId, partyId)
      ))
      .orderBy(desc(ledgers.createdAt))
      .limit(1);
    
    if (result.length === 0) {
      return "0.00";
    }
    return result[0].balance || "0.00";
  }

  // ============================================================================
  // PMS Phase 5 Storage Methods (Citizen Services)
  // ============================================================================

  // Service Request operations
  async getServiceRequest(id: number): Promise<ServiceRequest | undefined> {
    const result = await db.select().from(serviceRequests).where(eq(serviceRequests.id, id)).limit(1);
    return result[0];
  }

  async getServiceRequests(filters?: { propertyId?: number; partyId?: number; status?: string; requestType?: string }): Promise<ServiceRequest[]> {
    let query = db.select().from(serviceRequests);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(serviceRequests.propertyId, filters.propertyId));
    }
    if (filters?.partyId) {
      conditions.push(eq(serviceRequests.partyId, filters.partyId));
    }
    if (filters?.status) {
      conditions.push(eq(serviceRequests.status, filters.status));
    }
    if (filters?.requestType) {
      conditions.push(eq(serviceRequests.requestType, filters.requestType));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(serviceRequests.createdAt));
  }

  async createServiceRequest(serviceRequest: InsertServiceRequest): Promise<ServiceRequest> {
    const result = await db.insert(serviceRequests).values(serviceRequest).returning();
    return result[0];
  }

  async updateServiceRequest(id: number, serviceRequest: Partial<InsertServiceRequest>): Promise<ServiceRequest> {
    const result = await db.update(serviceRequests)
      .set({ ...serviceRequest, updatedAt: new Date() })
      .where(eq(serviceRequests.id, id))
      .returning();
    return result[0];
  }

  // Phase 6: Construction Services & Certificates

  // Inspection operations
  async getInspection(id: number): Promise<Inspection | undefined> {
    const result = await db.select().from(inspections).where(eq(inspections.id, id)).limit(1);
    return result[0];
  }

  async getInspections(filters?: { propertyId?: number; type?: string; status?: string }): Promise<Inspection[]> {
    let query = db.select().from(inspections);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(inspections.propertyId, filters.propertyId));
    }
    if (filters?.type) {
      conditions.push(eq(inspections.type, filters.type));
    }
    if (filters?.status) {
      conditions.push(eq(inspections.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(inspections.createdAt));
  }

  async createInspection(inspection: InsertInspection): Promise<Inspection> {
    const result = await db.insert(inspections).values(inspection).returning();
    return result[0];
  }

  async updateInspection(id: number, inspection: Partial<InsertInspection>): Promise<Inspection> {
    const result = await db.update(inspections)
      .set({ ...inspection, updatedAt: new Date() })
      .where(eq(inspections.id, id))
      .returning();
    return result[0];
  }

  // Demarcation Request operations
  async getDemarcationRequest(id: number): Promise<DemarcationRequest | undefined> {
    const result = await db.select().from(demarcationRequests).where(eq(demarcationRequests.id, id)).limit(1);
    return result[0];
  }

  async getDemarcationRequests(filters?: { propertyId?: number; status?: string }): Promise<DemarcationRequest[]> {
    let query = db.select().from(demarcationRequests);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(demarcationRequests.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(demarcationRequests.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(demarcationRequests.createdAt));
  }

  async createDemarcationRequest(request: InsertDemarcationRequest): Promise<DemarcationRequest> {
    const result = await db.insert(demarcationRequests).values(request).returning();
    return result[0];
  }

  async updateDemarcationRequest(id: number, request: Partial<InsertDemarcationRequest>): Promise<DemarcationRequest> {
    const result = await db.update(demarcationRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(demarcationRequests.id, id))
      .returning();
    return result[0];
  }

  // DPC Request operations
  async getDpcRequest(id: number): Promise<DpcRequest | undefined> {
    const result = await db.select().from(dpcRequests).where(eq(dpcRequests.id, id)).limit(1);
    return result[0];
  }

  async getDpcRequests(filters?: { propertyId?: number; status?: string }): Promise<DpcRequest[]> {
    let query = db.select().from(dpcRequests);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(dpcRequests.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(dpcRequests.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(dpcRequests.createdAt));
  }

  async createDpcRequest(request: InsertDpcRequest): Promise<DpcRequest> {
    const result = await db.insert(dpcRequests).values(request).returning();
    return result[0];
  }

  async updateDpcRequest(id: number, request: Partial<InsertDpcRequest>): Promise<DpcRequest> {
    const result = await db.update(dpcRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(dpcRequests.id, id))
      .returning();
    return result[0];
  }

  // Occupancy Certificate operations
  async getOccupancyCertificate(id: number): Promise<OccupancyCertificate | undefined> {
    const result = await db.select().from(occupancyCertificates).where(eq(occupancyCertificates.id, id)).limit(1);
    return result[0];
  }

  async getOccupancyCertificates(filters?: { propertyId?: number; status?: string }): Promise<OccupancyCertificate[]> {
    let query = db.select().from(occupancyCertificates);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(occupancyCertificates.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(occupancyCertificates.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(occupancyCertificates.createdAt));
  }

  async createOccupancyCertificate(certificate: InsertOccupancyCertificate): Promise<OccupancyCertificate> {
    const result = await db.insert(occupancyCertificates).values(certificate).returning();
    return result[0];
  }

  async updateOccupancyCertificate(id: number, certificate: Partial<InsertOccupancyCertificate>): Promise<OccupancyCertificate> {
    const result = await db.update(occupancyCertificates)
      .set({ ...certificate, updatedAt: new Date() })
      .where(eq(occupancyCertificates.id, id))
      .returning();
    return result[0];
  }

  // Completion Certificate operations
  async getCompletionCertificate(id: number): Promise<CompletionCertificate | undefined> {
    const result = await db.select().from(completionCertificates).where(eq(completionCertificates.id, id)).limit(1);
    return result[0];
  }

  async getCompletionCertificates(filters?: { propertyId?: number; status?: string }): Promise<CompletionCertificate[]> {
    let query = db.select().from(completionCertificates);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(completionCertificates.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(completionCertificates.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(completionCertificates.createdAt));
  }

  async createCompletionCertificate(certificate: InsertCompletionCertificate): Promise<CompletionCertificate> {
    const result = await db.insert(completionCertificates).values(certificate).returning();
    return result[0];
  }

  async updateCompletionCertificate(id: number, certificate: Partial<InsertCompletionCertificate>): Promise<CompletionCertificate> {
    const result = await db.update(completionCertificates)
      .set({ ...certificate, updatedAt: new Date() })
      .where(eq(completionCertificates.id, id))
      .returning();
    return result[0];
  }

  // Deviation operations
  async getDeviation(id: number): Promise<Deviation | undefined> {
    const result = await db.select().from(deviations).where(eq(deviations.id, id)).limit(1);
    return result[0];
  }

  async getDeviations(filters?: { propertyId?: number; status?: string; deviationType?: string }): Promise<Deviation[]> {
    let query = db.select().from(deviations);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(deviations.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(deviations.status, filters.status));
    }
    if (filters?.deviationType) {
      conditions.push(eq(deviations.deviationType, filters.deviationType));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(deviations.createdAt));
  }

  async createDeviation(deviation: InsertDeviation): Promise<Deviation> {
    const result = await db.insert(deviations).values(deviation).returning();
    return result[0];
  }

  async updateDeviation(id: number, deviation: Partial<InsertDeviation>): Promise<Deviation> {
    const result = await db.update(deviations)
      .set({ ...deviation, updatedAt: new Date() })
      .where(eq(deviations.id, id))
      .returning();
    return result[0];
  }

  // Phase 9: Grievance operations
  async getGrievance(id: number): Promise<Grievance | undefined> {
    const result = await db.select().from(grievances).where(eq(grievances.id, id)).limit(1);
    return result[0];
  }

  async getGrievanceByRefNo(refNo: string): Promise<Grievance | undefined> {
    const result = await db.select().from(grievances).where(eq(grievances.refNo, refNo)).limit(1);
    return result[0];
  }

  async getGrievances(filters?: { 
    partyId?: number; 
    propertyId?: number; 
    status?: string; 
    category?: string;
    assignedTo?: number;
  }): Promise<Grievance[]> {
    let query = db.select().from(grievances);
    const conditions = [];
    
    if (filters?.partyId) {
      conditions.push(eq(grievances.partyId, filters.partyId));
    }
    if (filters?.propertyId) {
      conditions.push(eq(grievances.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(grievances.status, filters.status));
    }
    if (filters?.category) {
      conditions.push(eq(grievances.category, filters.category));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(grievances.assignedTo, filters.assignedTo));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(grievances.createdAt));
  }

  async createGrievance(grievance: InsertGrievance): Promise<Grievance> {
    const result = await db.insert(grievances).values(grievance).returning();
    return result[0];
  }

  async updateGrievance(id: number, grievance: Partial<InsertGrievance>): Promise<Grievance> {
    const result = await db.update(grievances)
      .set({ ...grievance, updatedAt: new Date() })
      .where(eq(grievances.id, id))
      .returning();
    return result[0];
  }

  // Phase 9: Legal Case operations
  async getLegalCase(id: number): Promise<LegalCase | undefined> {
    const result = await db.select().from(legalCases).where(eq(legalCases.id, id)).limit(1);
    return result[0];
  }

  async getLegalCaseByCaseNo(caseNo: string): Promise<LegalCase | undefined> {
    const result = await db.select().from(legalCases).where(eq(legalCases.caseNo, caseNo)).limit(1);
    return result[0];
  }

  async getLegalCases(filters?: { 
    propertyId?: number; 
    partyId?: number; 
    grievanceId?: number;
    status?: string; 
    assignedTo?: number;
  }): Promise<LegalCase[]> {
    let query = db.select().from(legalCases);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(legalCases.propertyId, filters.propertyId));
    }
    if (filters?.partyId) {
      conditions.push(eq(legalCases.partyId, filters.partyId));
    }
    if (filters?.grievanceId) {
      conditions.push(eq(legalCases.grievanceId, filters.grievanceId));
    }
    if (filters?.status) {
      conditions.push(eq(legalCases.status, filters.status));
    }
    if (filters?.assignedTo) {
      conditions.push(eq(legalCases.assignedTo, filters.assignedTo));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(legalCases.createdAt));
  }

  async createLegalCase(legalCase: InsertLegalCase): Promise<LegalCase> {
    const result = await db.insert(legalCases).values(legalCase).returning();
    return result[0];
  }

  async updateLegalCase(id: number, legalCase: Partial<InsertLegalCase>): Promise<LegalCase> {
    const result = await db.update(legalCases)
      .set({ ...legalCase, updatedAt: new Date() })
      .where(eq(legalCases.id, id))
      .returning();
    return result[0];
  }

  // Phase 9: Case Hearing operations
  async getCaseHearing(id: number): Promise<CaseHearing | undefined> {
    const result = await db.select().from(caseHearings).where(eq(caseHearings.id, id)).limit(1);
    return result[0];
  }

  async getCaseHearings(legalCaseId: number): Promise<CaseHearing[]> {
    return await db.select()
      .from(caseHearings)
      .where(eq(caseHearings.legalCaseId, legalCaseId))
      .orderBy(caseHearings.hearingDate);
  }

  async createCaseHearing(hearing: InsertCaseHearing): Promise<CaseHearing> {
    const result = await db.insert(caseHearings).values(hearing).returning();
    return result[0];
  }

  async updateCaseHearing(id: number, hearing: Partial<InsertCaseHearing>): Promise<CaseHearing> {
    const result = await db.update(caseHearings)
      .set({ ...hearing, updatedAt: new Date() })
      .where(eq(caseHearings.id, id))
      .returning();
    return result[0];
  }

  // Phase 9: Court Order operations
  async getCourtOrder(id: number): Promise<CourtOrder | undefined> {
    const result = await db.select().from(courtOrders).where(eq(courtOrders.id, id)).limit(1);
    return result[0];
  }

  async getCourtOrders(legalCaseId: number): Promise<CourtOrder[]> {
    return await db.select()
      .from(courtOrders)
      .where(eq(courtOrders.legalCaseId, legalCaseId))
      .orderBy(desc(courtOrders.orderDate));
  }

  async createCourtOrder(order: InsertCourtOrder): Promise<CourtOrder> {
    const result = await db.insert(courtOrders).values(order).returning();
    return result[0];
  }

  async updateCourtOrder(id: number, order: Partial<InsertCourtOrder>): Promise<CourtOrder> {
    const result = await db.update(courtOrders)
      .set({ ...order, updatedAt: new Date() })
      .where(eq(courtOrders.id, id))
      .returning();
    return result[0];
  }

  // ============================================================================
  // Phase 8: Registration Operations
  // ============================================================================

  // Registration Case operations
  async getRegistrationCase(id: number): Promise<RegistrationCase | undefined> {
    const result = await db.select().from(registrationCases).where(eq(registrationCases.id, id)).limit(1);
    return result[0];
  }

  async getRegistrationCaseByCaseNo(caseNo: string): Promise<RegistrationCase | undefined> {
    const result = await db.select().from(registrationCases).where(eq(registrationCases.caseNo, caseNo)).limit(1);
    return result[0];
  }

  async getRegistrationCases(filters?: { propertyId?: number; status?: string; deedType?: string }): Promise<RegistrationCase[]> {
    let query = db.select().from(registrationCases);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(registrationCases.propertyId, filters.propertyId));
    }
    if (filters?.status) {
      conditions.push(eq(registrationCases.status, filters.status));
    }
    if (filters?.deedType) {
      conditions.push(eq(registrationCases.deedType, filters.deedType));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(registrationCases.createdAt));
  }

  async createRegistrationCase(caseData: InsertRegistrationCase): Promise<RegistrationCase> {
    const result = await db.insert(registrationCases).values(caseData).returning();
    return result[0];
  }

  async updateRegistrationCase(id: number, caseData: Partial<InsertRegistrationCase>): Promise<RegistrationCase> {
    const result = await db.update(registrationCases)
      .set({ ...caseData, updatedAt: new Date() })
      .where(eq(registrationCases.id, id))
      .returning();
    return result[0];
  }

  // Deed operations
  async getDeed(id: number): Promise<Deed | undefined> {
    const result = await db.select().from(deeds).where(eq(deeds.id, id)).limit(1);
    return result[0];
  }

  async getDeeds(filters?: { registrationCaseId?: number; status?: string }): Promise<Deed[]> {
    let query = db.select().from(deeds);
    const conditions = [];
    
    if (filters?.registrationCaseId) {
      conditions.push(eq(deeds.registrationCaseId, filters.registrationCaseId));
    }
    if (filters?.status) {
      conditions.push(eq(deeds.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(deeds.createdAt));
  }

  async createDeed(deedData: InsertDeed): Promise<Deed> {
    const result = await db.insert(deeds).values(deedData).returning();
    return result[0];
  }

  async updateDeed(id: number, deedData: Partial<InsertDeed>): Promise<Deed> {
    const result = await db.update(deeds)
      .set({ ...deedData, updatedAt: new Date() })
      .where(eq(deeds.id, id))
      .returning();
    return result[0];
  }

  // Encumbrance operations
  async getEncumbrance(id: number): Promise<Encumbrance | undefined> {
    const result = await db.select().from(encumbrances).where(eq(encumbrances.id, id)).limit(1);
    return result[0];
  }

  async getEncumbrances(filters?: { propertyId?: number; registrationCaseId?: number }): Promise<Encumbrance[]> {
    let query = db.select().from(encumbrances);
    const conditions = [];
    
    if (filters?.propertyId) {
      conditions.push(eq(encumbrances.propertyId, filters.propertyId));
    }
    if (filters?.registrationCaseId) {
      conditions.push(eq(encumbrances.registrationCaseId, filters.registrationCaseId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(encumbrances.createdAt));
  }

  async createEncumbrance(encumbranceData: InsertEncumbrance): Promise<Encumbrance> {
    const result = await db.insert(encumbrances).values(encumbranceData).returning();
    return result[0];
  }

  async updateEncumbrance(id: number, encumbranceData: Partial<InsertEncumbrance>): Promise<Encumbrance> {
    const result = await db.update(encumbrances)
      .set({ ...encumbranceData, updatedAt: new Date() })
      .where(eq(encumbrances.id, id))
      .returning();
    return result[0];
  }

  // Registration Slot operations
  async getRegistrationSlot(id: number): Promise<RegistrationSlot | undefined> {
    const result = await db.select().from(registrationSlots).where(eq(registrationSlots.id, id)).limit(1);
    return result[0];
  }

  async getRegistrationSlots(filters?: { sroOffice?: string; status?: string; slotDate?: Date }): Promise<RegistrationSlot[]> {
    let query = db.select().from(registrationSlots);
    const conditions = [];
    
    if (filters?.sroOffice) {
      conditions.push(eq(registrationSlots.sroOffice, filters.sroOffice));
    }
    if (filters?.status) {
      conditions.push(eq(registrationSlots.status, filters.status));
    }
    if (filters?.slotDate) {
      // Filter by date (ignoring time)
      const startOfDay = new Date(filters.slotDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.slotDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(
        and(
          sql`${registrationSlots.slotDate} >= ${startOfDay}`,
          sql`${registrationSlots.slotDate} <= ${endOfDay}`
        )
      );
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(registrationSlots.slotDate);
  }

  async createRegistrationSlot(slotData: InsertRegistrationSlot): Promise<RegistrationSlot> {
    const result = await db.insert(registrationSlots).values(slotData).returning();
    return result[0];
  }

  async updateRegistrationSlot(id: number, slotData: Partial<InsertRegistrationSlot>): Promise<RegistrationSlot> {
    const result = await db.update(registrationSlots)
      .set({ ...slotData, updatedAt: new Date() })
      .where(eq(registrationSlots.id, id))
      .returning();
    return result[0];
  }

  // KYC Verification operations
  async getKycVerification(id: number): Promise<KycVerification | undefined> {
    const result = await db.select().from(kycVerifications).where(eq(kycVerifications.id, id)).limit(1);
    return result[0];
  }

  async getKycVerifications(filters?: { registrationCaseId?: number; partyId?: number; status?: string }): Promise<KycVerification[]> {
    let query = db.select().from(kycVerifications);
    const conditions = [];
    
    if (filters?.registrationCaseId) {
      conditions.push(eq(kycVerifications.registrationCaseId, filters.registrationCaseId));
    }
    if (filters?.partyId) {
      conditions.push(eq(kycVerifications.partyId, filters.partyId));
    }
    if (filters?.status) {
      conditions.push(eq(kycVerifications.status, filters.status));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    return await query.orderBy(desc(kycVerifications.createdAt));
  }

  async createKycVerification(kycData: InsertKycVerification): Promise<KycVerification> {
    const result = await db.insert(kycVerifications).values(kycData).returning();
    return result[0];
  }

  async updateKycVerification(id: number, kycData: Partial<InsertKycVerification>): Promise<KycVerification> {
    const result = await db.update(kycVerifications)
      .set({ ...kycData, updatedAt: new Date() })
      .where(eq(kycVerifications.id, id))
      .returning();
    return result[0];
  }

  // Audit Log operations
  async createAuditLog(auditData: {
    userId: number;
    action: string;
    resourceType: string;
    resourceId: number;
    details?: any;
  }): Promise<void> {
    await db.insert(auditLogs).values({
      userId: auditData.userId,
      action: auditData.action,
      resourceType: auditData.resourceType,
      resourceId: auditData.resourceId,
      details: auditData.details || null,
    });
  }
}

export const storage = new DatabaseStorage();
