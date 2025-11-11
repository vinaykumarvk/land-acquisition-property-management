import { pgTable, text, serial, integer, boolean, timestamp, decimal, json, uuid, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("case_officer"), // admin, case_officer, legal_officer, finance_officer, citizen, auditor (LAMS) | analyst, manager, committee_member, finance, admin (legacy)
  phone: text("phone"), // For citizen OTP verification
  aadhaar: text("aadhaar"), // For citizen identification
  department: text("department"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Investment requests table
export const investmentRequests = pgTable("investment_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(), // INV-2024-001
  requesterId: integer("requester_id").references(() => users.id),
  targetCompany: text("target_company").notNull(),
  investmentType: text("investment_type").notNull(), // equity, debt, real_estate, alternative
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  expectedReturn: decimal("expected_return", { precision: 5, scale: 2 }),
  description: text("description"),
  enhancedDescription: text("enhanced_description"), // AI-enhanced version of description
  riskLevel: text("risk_level").notNull(), // low, medium, high
  status: text("status").notNull().default("draft"), // draft, opportunity, new, approved, rejected, admin_rejected, changes_requested
  currentApprovalStage: integer("current_approval_stage").default(0),
  slaDeadline: timestamp("sla_deadline"),
  deletedAt: timestamp("deleted_at"), // Soft delete timestamp
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Audit trail fields
  currentApprovalCycle: integer("current_approval_cycle").notNull().default(1), // Track current submission cycle
});

// Cash requests table
export const cashRequests = pgTable("cash_requests", {
  id: serial("id").primaryKey(),
  requestId: text("request_id").notNull().unique(), // CASH-2024-001
  requesterId: integer("requester_id").references(() => users.id),
  investmentId: integer("investment_id").references(() => investmentRequests.id),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  purpose: text("purpose").notNull(),
  paymentTimeline: text("payment_timeline").notNull(), // immediate, week, month, scheduled
  status: text("status").notNull().default("draft"), // draft, pending, approved, rejected, processed
  slaDeadline: timestamp("sla_deadline"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Approval workflow definitions
export const approvalWorkflows = pgTable("approval_workflows", {
  id: serial("id").primaryKey(),
  workflowType: text("workflow_type").notNull(), // investment, cash_request
  stage: integer("stage").notNull(),
  approverRole: text("approver_role").notNull(),
  slaHours: integer("sla_hours").notNull(),
  isActive: boolean("is_active").default(true),
});

// Individual approval records
export const approvals = pgTable("approvals", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  stage: integer("stage").notNull(),
  approverId: integer("approver_id").references(() => users.id),
  status: text("status").notNull(), // pending, approved, rejected, changes_requested
  comments: text("comments"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  // Audit trail fields
  approvalCycle: integer("approval_cycle").notNull().default(1), // Track which submission cycle
  isCurrentCycle: boolean("is_current_cycle").notNull().default(true), // Whether this is part of current active cycle
});

// Tasks table
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  assigneeId: integer("assignee_id").references(() => users.id),
  requestType: text("request_type").notNull(), // investment, cash_request
  requestId: integer("request_id").notNull(),
  taskType: text("task_type").notNull(), // approval, review, changes_requested
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, completed, overdue
  priority: text("priority").default("medium"), // low, medium, high
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Document categories table
export const documentCategories = pgTable("document_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  icon: text("icon").default("📄"), // emoji icon for display
  isActive: boolean("is_active").default(true),
  isSystem: boolean("is_system").default(false), // system vs user-created
  createdAt: timestamp("created_at").defaultNow(),
});

// Document-category associations table (for multiple categories per document)
export const documentCategoryAssociations = pgTable("document_category_associations", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  categoryId: integer("category_id").references(() => documentCategories.id).notNull(),
  customCategoryName: text("custom_category_name"), // for "Others" category with custom name
  createdAt: timestamp("created_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(),
  fileSize: integer("file_size").notNull(),
  mimeType: text("mime_type").notNull(),
  fileUrl: text("file_url").notNull(),
  uploaderId: integer("uploader_id").references(() => users.id),
  requestType: text("request_type").notNull(), // investment, cash_request, sia, land_notification, award, possession (LAMS)
  requestId: integer("request_id").notNull(),
  // Legacy categorization fields (keeping for backward compatibility)
  categoryId: integer("category_id").references(() => documentCategories.id),
  subcategoryId: integer("subcategory_id"),
  isAutoCategorized: boolean("is_auto_categorized").default(false), // AI vs manual categorization
  // Document analysis fields
  analysisStatus: text("analysis_status").default("pending"), // pending, processing, completed, failed
  analysisResult: text("analysis_result"), // JSON string with analysis results
  classification: text("classification"), // document type classification
  extractedText: text("extracted_text"), // extracted text content
  keyInformation: text("key_information"), // JSON string with key extracted info
  riskLevel: text("risk_level"), // low, medium, high
  confidence: decimal("confidence", { precision: 5, scale: 2 }), // analysis confidence score
  createdAt: timestamp("created_at").defaultNow(),
  analyzedAt: timestamp("analyzed_at"),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // task_assigned, approval_needed, sla_warning, status_update, higher_stage_action
  isRead: boolean("is_read").default(false),
  relatedType: text("related_type"), // investment, cash_request, task, sia, land_notification, award, possession (LAMS)
  relatedId: integer("related_id"),
  // Enhanced fields for previous approver notifications
  previousApproverStage: integer("previous_approver_stage"), // The stage the user previously approved
  higherStageAction: text("higher_stage_action"), // rejected, changes_requested, cancelled
  higherStageRole: text("higher_stage_role"), // committee_member, finance, etc.
  higherStageComments: text("higher_stage_comments"), // Comments from higher stage
  investmentSummary: json("investment_summary"), // Quick summary for popup display
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: integer("resource_id").notNull(),
  details: json("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Templates table
export const templates = pgTable("templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(), // investment, cash_request
  investmentType: text("investment_type"), // equity, debt, real_estate, alternative
  templateData: json("template_data").notNull(), // sections with word limits
  createdBy: integer("created_by").references(() => users.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Investment rationales table
export const investmentRationales = pgTable("investment_rationales", {
  id: serial("id").primaryKey(),
  investmentId: integer("investment_id").references(() => investmentRequests.id).notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // manual, ai_generated
  templateId: integer("template_id").references(() => templates.id),
  authorId: integer("author_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Background jobs table
export const backgroundJobs = pgTable("background_jobs", {
  id: serial("id").primaryKey(),
  jobType: varchar("job_type", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, processing, completed, failed
  currentStep: varchar("current_step", { length: 50 }).default("queued"), // queued, preparing, uploading, analyzing, generating_summary, generating_insights, completed
  stepProgress: integer("step_progress").default(0), // 0-100 percentage for current step
  totalSteps: integer("total_steps").default(4), // Total number of steps in the process
  currentStepNumber: integer("current_step_number").default(0), // Current step number (0-based)
  documentId: integer("document_id").references(() => documents.id),
  requestType: varchar("request_type", { length: 50 }),
  requestId: integer("request_id"),
  priority: varchar("priority", { length: 10 }).notNull().default("normal"), // low, normal, high
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  errorMessage: text("error_message"),
  result: text("result"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

// Document queries table - stores custom queries and their responses
export const documentQueries = pgTable("document_queries", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").references(() => documents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cross-document queries table - stores queries across multiple documents
export const crossDocumentQueries = pgTable("cross_document_queries", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(), // investment, cash_request, sia, land_notification, award, possession (LAMS)
  requestId: integer("request_id").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  documentCount: integer("document_count").notNull().default(0), // number of documents searched
  // OpenAI response metadata
  openaiResponseId: text("openai_response_id"), // OpenAI response ID (e.g., resp_xyz...)
  openaiModel: text("openai_model"), // Model used (e.g., gpt-4o-2024-08-06)
  inputTokens: integer("input_tokens"), // Tokens used for input
  outputTokens: integer("output_tokens"), // Tokens used for output  
  totalTokens: integer("total_tokens"), // Total tokens used
  processingTimeMs: integer("processing_time_ms"), // Processing time in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Web search queries table - stores web search queries and responses
export const webSearchQueries = pgTable("web_search_queries", {
  id: serial("id").primaryKey(),
  requestType: text("request_type").notNull(), // investment, cash_request, sia, land_notification, award, possession (LAMS)
  requestId: integer("request_id").notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  query: text("query").notNull(),
  response: text("response").notNull(),
  searchType: text("search_type").notNull().default("web_search"), // for future extensibility
  // OpenAI response metadata
  openaiResponseId: text("openai_response_id"), // OpenAI response ID (e.g., resp_xyz...)
  openaiModel: text("openai_model"), // Model used (e.g., gpt-4o-2024-08-06)
  inputTokens: integer("input_tokens"), // Tokens used for input
  outputTokens: integer("output_tokens"), // Tokens used for output  
  totalTokens: integer("total_tokens"), // Total tokens used
  processingTimeMs: integer("processing_time_ms"), // Processing time in milliseconds
  createdAt: timestamp("created_at").defaultNow(),
});

// Sequences table - for sequential ID generation
export const sequences = pgTable("sequences", {
  id: serial("id").primaryKey(),
  sequenceName: text("sequence_name").notNull().unique(), // 'INV', 'CASH', 'SIA', 'SEC11', 'SEC19', 'LOI', 'AWARD', etc.
  currentValue: integer("current_value").notNull().default(0),
  year: integer("year").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================================
// LAMS (Land Acquisition Management System) Tables
// ============================================================================

// Parcels table - Land parcels being acquired
export const parcels = pgTable("parcels", {
  id: serial("id").primaryKey(),
  parcelNo: text("parcel_no").notNull().unique(), // Unique parcel identifier
  village: text("village").notNull(),
  taluka: text("taluka").notNull(),
  district: text("district").notNull(),
  lat: decimal("lat", { precision: 10, scale: 7 }), // Latitude for GIS
  lng: decimal("lng", { precision: 10, scale: 7 }), // Longitude for GIS
  areaSqM: decimal("area_sq_m", { precision: 15, scale: 2 }).notNull(), // Area in square meters
  landUse: text("land_use"), // agricultural, residential, commercial, etc.
  status: text("status").notNull().default("unaffected"), // unaffected, under_acq, awarded, possessed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Owners table - Land owners
export const owners = pgTable("owners", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  aadhaar: text("aadhaar"), // Aadhaar number
  pan: text("pan"), // PAN number
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  bankIfsc: text("bank_ifsc"), // Bank IFSC code for payments
  bankAcct: text("bank_acct"), // Bank account number
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Parcel-Owners junction table - Many-to-many relationship
export const parcelOwners = pgTable("parcel_owners", {
  id: serial("id").primaryKey(),
  parcelId: integer("parcel_id").references(() => parcels.id).notNull(),
  ownerId: integer("owner_id").references(() => owners.id).notNull(),
  sharePct: decimal("share_pct", { precision: 5, scale: 2 }).notNull().default("100.00"), // Ownership percentage
  createdAt: timestamp("created_at").defaultNow(),
});

// SIA (Social Impact Assessment) table
export const sia = pgTable("sia", {
  id: serial("id").primaryKey(),
  noticeNo: text("notice_no").notNull().unique(), // SIA-2024-001
  title: text("title").notNull(),
  description: text("description").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, published, hearing_scheduled, hearing_completed, report_generated, closed
  publishedAt: timestamp("published_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SIA Feedback table - Citizen feedback on SIA
export const siaFeedback = pgTable("sia_feedback", {
  id: serial("id").primaryKey(),
  siaId: integer("sia_id").references(() => sia.id).notNull(),
  citizenName: text("citizen_name").notNull(),
  citizenContact: text("citizen_contact").notNull(), // phone or email
  text: text("text").notNull(),
  attachmentPath: text("attachment_path"), // Path to uploaded attachment
  status: text("status").notNull().default("received"), // received, under_review, accepted, rejected
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SIA Hearings table
export const siaHearings = pgTable("sia_hearings", {
  id: serial("id").primaryKey(),
  siaId: integer("sia_id").references(() => sia.id).notNull(),
  date: timestamp("date").notNull(),
  venue: text("venue").notNull(),
  agenda: text("agenda"),
  minutesPath: text("minutes_path"), // Path to uploaded minutes PDF
  attendeesJson: json("attendees_json"), // JSON array of attendee names
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// SIA Reports table
export const siaReports = pgTable("sia_reports", {
  id: serial("id").primaryKey(),
  siaId: integer("sia_id").references(() => sia.id).notNull(),
  reportPdfPath: text("report_pdf_path").notNull(), // Path to generated PDF
  summaryJson: json("summary_json"), // JSON summary of report
  generatedAt: timestamp("generated_at").defaultNow(),
  generatedBy: integer("generated_by").references(() => users.id),
});

// Notifications table (Sec 11/19) - Extends existing notifications concept
export const landNotifications = pgTable("land_notifications", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // sec11, sec19
  refNo: text("ref_no").notNull().unique(), // SEC11-2024-001, SEC19-2024-001
  title: text("title").notNull(),
  bodyHtml: text("body_html").notNull(), // HTML content of notice
  publishDate: timestamp("publish_date"),
  status: text("status").notNull().default("draft"), // draft, legal_review, approved, published, objection_window_open, objection_resolved, closed
  siaId: integer("sia_id").references(() => sia.id), // Optional reference to SIA
  createdBy: integer("created_by").references(() => users.id).notNull(),
  approvedBy: integer("approved_by").references(() => users.id), // Legal officer who approved
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification-Parcels junction table
export const notificationParcels = pgTable("notification_parcels", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id").references(() => landNotifications.id).notNull(),
  parcelId: integer("parcel_id").references(() => parcels.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Objections table
export type ObjectionAttachment = {
  path: string;
  originalName: string;
  size: number;
  mimeType: string;
};

export const objections = pgTable("objections", {
  id: serial("id").primaryKey(),
  notificationId: integer("notification_id").references(() => landNotifications.id).notNull(),
  parcelId: integer("parcel_id").references(() => parcels.id).notNull(),
  ownerId: integer("owner_id").references(() => owners.id), // Optional - may be anonymous
  text: text("text").notNull(),
  submittedByName: text("submitted_by_name"),
  submittedByPhone: text("submitted_by_phone"),
  submittedByEmail: text("submitted_by_email"),
  submittedByAadhaar: text("submitted_by_aadhaar"),
  attachmentPath: text("attachment_path"), // Path to uploaded evidence (legacy single file)
  attachmentsJson: json("attachments_json").$type<ObjectionAttachment[] | null>(),
  resolutionText: text("resolution_text"), // Officer's resolution text
  resolvedBy: integer("resolved_by").references(() => users.id), // Case officer who resolved
  status: text("status").notNull().default("received"), // received, hearing, resolved, rejected
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Valuations table
export const valuations = pgTable("valuations", {
  id: serial("id").primaryKey(),
  parcelId: integer("parcel_id").references(() => parcels.id).notNull(),
  basis: text("basis").notNull(), // circle, market, hybrid
  circleRate: decimal("circle_rate", { precision: 15, scale: 2 }).notNull(), // Per sq meter
  areaSqM: decimal("area_sq_m", { precision: 15, scale: 2 }).notNull(),
  factorMultipliersJson: json("factor_multipliers_json"), // JSON object with multipliers
  computedAmount: decimal("computed_amount", { precision: 15, scale: 2 }).notNull(),
  justificationNotes: text("justification_notes"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Awards table
export const awards = pgTable("awards", {
  id: serial("id").primaryKey(),
  parcelId: integer("parcel_id").references(() => parcels.id).notNull(),
  ownerId: integer("owner_id").references(() => owners.id).notNull(),
  mode: text("mode").notNull(), // cash, pooling, hybrid
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  loiNo: text("loi_no").unique(), // Letter of Intent number
  awardNo: text("award_no").unique(), // Award number
  awardDate: timestamp("award_date"),
  status: text("status").notNull().default("draft"), // draft, fin_review, issued, paid, closed
  awardPdfPath: text("award_pdf_path"), // Path to generated award PDF
  loiPdfPath: text("loi_pdf_path"), // Path to generated LOI PDF
  valuationId: integer("valuation_id").references(() => valuations.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  awardId: integer("award_id").references(() => awards.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  mode: text("mode").notNull(), // neft, upi, pfms
  referenceNo: text("reference_no"), // Payment reference number
  paidOn: timestamp("paid_on"),
  status: text("status").notNull().default("initiated"), // initiated, success, failed
  receiptPdfPath: text("receipt_pdf_path"), // Path to generated receipt PDF
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Possession table
export const possession = pgTable("possession", {
  id: serial("id").primaryKey(),
  parcelId: integer("parcel_id").references(() => parcels.id).notNull(),
  scheduleDt: timestamp("schedule_dt").notNull(), // Scheduled possession date
  remarks: text("remarks"),
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, evidence_captured, certificate_issued, registry_updated, closed
  certificatePdfPath: text("certificate_pdf_path"), // Path to generated certificate PDF
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Possession Media table - Geo-tagged photos
export const possessionMedia = pgTable("possession_media", {
  id: serial("id").primaryKey(),
  possessionId: integer("possession_id").references(() => possession.id).notNull(),
  photoPath: text("photo_path").notNull(), // Path to uploaded photo
  gpsLat: decimal("gps_lat", { precision: 10, scale: 7 }), // GPS latitude
  gpsLng: decimal("gps_lng", { precision: 10, scale: 7 }), // GPS longitude
  gpsSource: text("gps_source").default("manual"), // manual, exif, device
  capturedAt: timestamp("captured_at").defaultNow(),
  hashSha256: text("hash_sha256"), // SHA-256 hash of photo for verification
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  investmentRequests: many(investmentRequests),
  cashRequests: many(cashRequests),
  approvals: many(approvals),
  tasks: many(tasks),
  documents: many(documents),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
  templates: many(templates),
  investmentRationales: many(investmentRationales),
  documentQueries: many(documentQueries),
  crossDocumentQueries: many(crossDocumentQueries),
  webSearchQueries: many(webSearchQueries),
  // LAMS relations
  siaCreated: many(sia),
  siaReportsGenerated: many(siaReports),
  landNotificationsCreated: many(landNotifications),
  landNotificationsApproved: many(landNotifications),
  objectionsResolved: many(objections),
  valuationsCreated: many(valuations),
  awardsCreated: many(awards),
  paymentsCreated: many(payments),
  possessionCreated: many(possession),
}));

export const documentCategoriesRelations = relations(documentCategories, ({ many }) => ({
  documents: many(documents),
  associations: many(documentCategoryAssociations),
}));

export const documentCategoryAssociationsRelations = relations(documentCategoryAssociations, ({ one }) => ({
  document: one(documents, {
    fields: [documentCategoryAssociations.documentId],
    references: [documents.id],
  }),
  category: one(documentCategories, {
    fields: [documentCategoryAssociations.categoryId],
    references: [documentCategories.id],
  }),
}));

export const investmentRequestsRelations = relations(investmentRequests, ({ one, many }) => ({
  requester: one(users, { fields: [investmentRequests.requesterId], references: [users.id] }),
  cashRequests: many(cashRequests),
  approvals: many(approvals),
  tasks: many(tasks),
  documents: many(documents),
  rationales: many(investmentRationales),
}));

export const cashRequestsRelations = relations(cashRequests, ({ one, many }) => ({
  requester: one(users, { fields: [cashRequests.requesterId], references: [users.id] }),
  investment: one(investmentRequests, { fields: [cashRequests.investmentId], references: [investmentRequests.id] }),
  approvals: many(approvals),
  tasks: many(tasks),
  documents: many(documents),
}));

export const approvalsRelations = relations(approvals, ({ one }) => ({
  approver: one(users, { fields: [approvals.approverId], references: [users.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  uploader: one(users, { fields: [documents.uploaderId], references: [users.id] }),
  category: one(documentCategories, {
    fields: [documents.categoryId],
    references: [documentCategories.id],
  }),
  queries: many(documentQueries),
  categoryAssociations: many(documentCategoryAssociations),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, { fields: [auditLogs.userId], references: [users.id] }),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  creator: one(users, { fields: [templates.createdBy], references: [users.id] }),
  rationales: many(investmentRationales),
}));

export const investmentRationalesRelations = relations(investmentRationales, ({ one }) => ({
  investment: one(investmentRequests, { fields: [investmentRationales.investmentId], references: [investmentRequests.id] }),
  template: one(templates, { fields: [investmentRationales.templateId], references: [templates.id] }),
  author: one(users, { fields: [investmentRationales.authorId], references: [users.id] }),
}));

export const backgroundJobsRelations = relations(backgroundJobs, ({ one }) => ({
  document: one(documents, { fields: [backgroundJobs.documentId], references: [documents.id] }),
}));

export const documentQueriesRelations = relations(documentQueries, ({ one }) => ({
  document: one(documents, { fields: [documentQueries.documentId], references: [documents.id] }),
  user: one(users, { fields: [documentQueries.userId], references: [users.id] }),
}));

export const crossDocumentQueriesRelations = relations(crossDocumentQueries, ({ one }) => ({
  user: one(users, { fields: [crossDocumentQueries.userId], references: [users.id] }),
}));

export const webSearchQueriesRelations = relations(webSearchQueries, ({ one }) => ({
  user: one(users, { fields: [webSearchQueries.userId], references: [users.id] }),
}));

export const sequencesRelations = relations(sequences, ({}) => ({}));

// LAMS Relations
export const parcelsRelations = relations(parcels, ({ many }) => ({
  parcelOwners: many(parcelOwners),
  notificationParcels: many(notificationParcels),
  objections: many(objections),
  valuations: many(valuations),
  awards: many(awards),
  possession: many(possession),
}));

export const ownersRelations = relations(owners, ({ many }) => ({
  parcelOwners: many(parcelOwners),
  objections: many(objections),
  awards: many(awards),
}));

export const parcelOwnersRelations = relations(parcelOwners, ({ one }) => ({
  parcel: one(parcels, { fields: [parcelOwners.parcelId], references: [parcels.id] }),
  owner: one(owners, { fields: [parcelOwners.ownerId], references: [owners.id] }),
}));

export const siaRelations = relations(sia, ({ one, many }) => ({
  creator: one(users, { fields: [sia.createdBy], references: [users.id] }),
  feedback: many(siaFeedback),
  hearings: many(siaHearings),
  reports: many(siaReports),
  landNotifications: many(landNotifications),
}));

export const siaFeedbackRelations = relations(siaFeedback, ({ one }) => ({
  sia: one(sia, { fields: [siaFeedback.siaId], references: [sia.id] }),
}));

export const siaHearingsRelations = relations(siaHearings, ({ one }) => ({
  sia: one(sia, { fields: [siaHearings.siaId], references: [sia.id] }),
}));

export const siaReportsRelations = relations(siaReports, ({ one }) => ({
  sia: one(sia, { fields: [siaReports.siaId], references: [sia.id] }),
  generator: one(users, { fields: [siaReports.generatedBy], references: [users.id] }),
}));

export const landNotificationsRelations = relations(landNotifications, ({ one, many }) => ({
  creator: one(users, { fields: [landNotifications.createdBy], references: [users.id] }),
  approver: one(users, { fields: [landNotifications.approvedBy], references: [users.id] }),
  sia: one(sia, { fields: [landNotifications.siaId], references: [sia.id] }),
  notificationParcels: many(notificationParcels),
  objections: many(objections),
}));

export const notificationParcelsRelations = relations(notificationParcels, ({ one }) => ({
  notification: one(landNotifications, { fields: [notificationParcels.notificationId], references: [landNotifications.id] }),
  parcel: one(parcels, { fields: [notificationParcels.parcelId], references: [parcels.id] }),
}));

export const objectionsRelations = relations(objections, ({ one }) => ({
  notification: one(landNotifications, { fields: [objections.notificationId], references: [landNotifications.id] }),
  parcel: one(parcels, { fields: [objections.parcelId], references: [parcels.id] }),
  owner: one(owners, { fields: [objections.ownerId], references: [owners.id] }),
  resolver: one(users, { fields: [objections.resolvedBy], references: [users.id] }),
}));

export const valuationsRelations = relations(valuations, ({ one, many }) => ({
  parcel: one(parcels, { fields: [valuations.parcelId], references: [parcels.id] }),
  creator: one(users, { fields: [valuations.createdBy], references: [users.id] }),
  awards: many(awards),
}));

export const awardsRelations = relations(awards, ({ one, many }) => ({
  parcel: one(parcels, { fields: [awards.parcelId], references: [parcels.id] }),
  owner: one(owners, { fields: [awards.ownerId], references: [owners.id] }),
  valuation: one(valuations, { fields: [awards.valuationId], references: [valuations.id] }),
  creator: one(users, { fields: [awards.createdBy], references: [users.id] }),
  payments: many(payments),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  award: one(awards, { fields: [payments.awardId], references: [awards.id] }),
  creator: one(users, { fields: [payments.createdBy], references: [users.id] }),
}));

export const possessionRelations = relations(possession, ({ one, many }) => ({
  parcel: one(parcels, { fields: [possession.parcelId], references: [parcels.id] }),
  creator: one(users, { fields: [possession.createdBy], references: [users.id] }),
  media: many(possessionMedia),
}));

export const possessionMediaRelations = relations(possessionMedia, ({ one }) => ({
  possession: one(possession, { fields: [possessionMedia.possessionId], references: [possession.id] }),
}));

// ============================================================================
// PMS (Property Management System) Tables
// ============================================================================

// Parties table - Reusable for both LAMS (owners) and PMS (property owners/allottees)
// Note: We can reuse the existing 'owners' table, but creating a separate 'parties' table
// for PMS to maintain independence. In production, consider consolidating.
export const parties = pgTable("pms_parties", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(), // individual, firm, company, huf
  name: text("name").notNull(),
  aadhaar: text("aadhaar"), // Aadhaar number
  pan: text("pan"), // PAN number
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  email: text("email"),
  bankIfsc: text("bank_ifsc"), // Bank IFSC code
  bankAcct: text("bank_acct"), // Bank account number
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Schemes table - Property schemes (housing schemes, plots, etc.)
export const schemes = pgTable("pms_schemes", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category").notNull(), // residential, commercial, industrial, mixed
  eligibilityJson: json("eligibility_json"), // JSON with eligibility criteria
  inventoryJson: json("inventory_json"), // JSON with plots/units inventory
  status: text("status").notNull().default("draft"), // draft, published, closed
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Properties table - Property master
export const properties = pgTable("pms_properties", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => schemes.id), // Optional - may be standalone property
  parcelNo: text("parcel_no").notNull().unique(), // Unique property identifier
  address: text("address").notNull(),
  area: decimal("area", { precision: 15, scale: 2 }).notNull(), // Area in sq meters or sq feet
  landUse: text("land_use"), // residential, commercial, industrial, etc.
  status: text("status").notNull().default("available"), // available, allotted, transferred, mortgaged
  lat: decimal("lat", { precision: 10, scale: 7 }), // Latitude for GIS
  lng: decimal("lng", { precision: 10, scale: 7 }), // Longitude for GIS
  geometryJson: json("geometry_json"), // GeoJSON for parcel geometry
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ownership table - Property ownership with shares
export const ownership = pgTable("pms_ownership", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  sharePct: decimal("share_pct", { precision: 5, scale: 2 }).notNull().default("100.00"), // Ownership percentage
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Applications table - Scheme applications
export const applications = pgTable("pms_applications", {
  id: serial("id").primaryKey(),
  schemeId: integer("scheme_id").references(() => schemes.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  docsJson: json("docs_json"), // JSON with uploaded documents info
  status: text("status").notNull().default("draft"), // draft, submitted, verified, in_draw, selected, rejected, allotted, closed
  score: decimal("score", { precision: 10, scale: 2 }), // Eligibility score
  drawSeq: integer("draw_seq"), // Draw sequence number
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Allotments table - Allotment letters
export const allotments = pgTable("pms_allotments", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  applicationId: integer("application_id").references(() => applications.id), // Optional - may be direct allotment
  letterNo: text("letter_no").notNull().unique(), // Unique allotment letter number
  issueDate: timestamp("issue_date").notNull(),
  pdfPath: text("pdf_path"), // Path to generated PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash for verification
  status: text("status").notNull().default("draft"), // draft, issued, accepted, cancelled, reinstated
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Transfers table - Property transfers (sale/gift/inheritance)
export const transfers = pgTable("pms_transfers", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  fromPartyId: integer("from_party_id").references(() => parties.id).notNull(), // Transferor
  toPartyId: integer("to_party_id").references(() => parties.id).notNull(), // Transferee
  transferType: text("transfer_type").notNull(), // sale, gift, inheritance
  transferDate: timestamp("transfer_date"),
  considerationAmount: decimal("consideration_amount", { precision: 15, scale: 2 }), // Sale price
  docsJson: json("docs_json"), // Supporting documents
  status: text("status").notNull().default("draft"), // draft, under_review, approved, rejected, completed
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mortgages table - Mortgage permissions
export const mortgages = pgTable("pms_mortgages", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(), // Property owner
  mortgageeName: text("mortgagee_name").notNull(), // Bank/financial institution
  mortgageeAddress: text("mortgagee_address"),
  mortgageAmount: decimal("mortgage_amount", { precision: 15, scale: 2 }),
  mortgageDate: timestamp("mortgage_date"),
  docsJson: json("docs_json"), // Mortgage documents
  status: text("status").notNull().default("draft"), // draft, under_review, approved, rejected, active, closed
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Modifications table - Property modifications
export const modifications = pgTable("pms_modifications", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  kind: text("kind").notNull(), // area, usage, partner, firm
  oldJson: json("old_json"), // Old values
  newJson: json("new_json"), // New values
  fee: decimal("fee", { precision: 15, scale: 2 }),
  docsJson: json("docs_json"), // Supporting documents
  status: text("status").notNull().default("draft"), // draft, under_review, approved, rejected, completed
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// NOCs table - No Objection Certificates
export const nocs = pgTable("pms_nocs", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  type: text("type").notNull(), // sale, mortgage, possession, construction, etc.
  checklistJson: json("checklist_json"), // Configurable checklist
  status: text("status").notNull().default("draft"), // draft, under_review, approved, issued, superseded
  pdfPath: text("pdf_path"), // Path to generated PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash
  issuedAt: timestamp("issued_at"),
  issuedBy: integer("issued_by").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Conveyance Deeds table
export const conveyanceDeeds = pgTable("pms_conveyance_deeds", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  transferId: integer("transfer_id").references(() => transfers.id), // Optional - may be standalone
  fromPartyId: integer("from_party_id").references(() => parties.id).notNull(),
  toPartyId: integer("to_party_id").references(() => parties.id).notNull(),
  deedNo: text("deed_no").unique(), // Unique deed number
  deedDate: timestamp("deed_date").notNull(),
  pdfPath: text("pdf_path"), // Path to generated PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash
  status: text("status").notNull().default("draft"), // draft, issued, registered
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Demand Notes table - Payment demands
export const demandNotes = pgTable("pms_demand_notes", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  noteNo: text("note_no").notNull().unique(), // Unique demand note number
  scheduleJson: json("schedule_json"), // JSON with payment schedule (principal, interest, penalties, waivers)
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: text("status").notNull().default("draft"), // draft, issued, part_paid, paid, overdue, written_off
  pdfPath: text("pdf_path"), // Path to generated PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Payments table - Payment transactions
export const pmsPayments = pgTable("pms_payments", {
  id: serial("id").primaryKey(),
  demandNoteId: integer("demand_note_id").references(() => demandNotes.id), // Optional - may be standalone payment
  propertyId: integer("property_id").references(() => properties.id), // Optional
  partyId: integer("party_id").references(() => parties.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  mode: text("mode").notNull(), // upi, netbanking, rtgs, cash, cheque
  refNo: text("ref_no"), // Payment reference number
  paidOn: timestamp("paid_on").notNull(),
  status: text("status").notNull().default("pending"), // pending, success, failed, refunded
  receiptPdf: text("receipt_pdf"), // Path to receipt PDF
  gatewayResponse: json("gateway_response"), // Payment gateway response
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Receipts table - Payment receipts
export const receipts = pgTable("pms_receipts", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => pmsPayments.id).notNull(),
  receiptNo: text("receipt_no").notNull().unique(), // Unique receipt number
  pdfPath: text("pdf_path"), // Path to generated PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash
  issuedAt: timestamp("issued_at").notNull(),
  issuedBy: integer("issued_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Refunds table - Refunds and amnesty
export const refunds = pgTable("pms_refunds", {
  id: serial("id").primaryKey(),
  paymentId: integer("payment_id").references(() => pmsPayments.id), // Optional - may be adjustment
  propertyId: integer("property_id").references(() => properties.id),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  reason: text("reason").notNull(), // refund, amnesty, adjustment, waiver
  reasonDetails: text("reason_details"), // Detailed reason
  status: text("status").notNull().default("draft"), // draft, approved, processed, rejected
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  processedAt: timestamp("processed_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ledgers table - Property account ledgers
export const ledgers = pgTable("pms_ledgers", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  transactionType: text("transaction_type").notNull(), // demand, payment, refund, adjustment
  transactionId: integer("transaction_id"), // ID of related transaction (demand note, payment, refund)
  debit: decimal("debit", { precision: 15, scale: 2 }), // Debit amount
  credit: decimal("credit", { precision: 15, scale: 2 }), // Credit amount
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull(), // Running balance
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Service Requests table - Citizen self-service requests
export const serviceRequests = pgTable("pms_service_requests", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id),
  partyId: integer("party_id").references(() => parties.id),
  requestType: text("request_type").notNull(), // address_change, duplicate_document, correction, noc_request, etc.
  refNo: text("ref_no").unique(), // Unique reference number for tracking
  description: text("description").notNull(),
  dataJson: json("data_json"), // Request-specific data
  status: text("status").notNull().default("new"), // new, under_review, approved, rejected, completed, closed
  assignedTo: integer("assigned_to").references(() => users.id),
  resolution: text("resolution"), // Resolution details
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Registration Cases table - Property registration workflow
export const registrationCases = pgTable("pms_registration_cases", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  caseNo: text("case_no").unique(), // Unique registration case number
  deedType: text("deed_type").notNull(), // sale, gift, mortgage, lease, partition, exchange, poa, will
  fromPartyId: integer("from_party_id").references(() => parties.id), // Transferor (for sale/gift)
  toPartyId: integer("to_party_id").references(() => parties.id).notNull(), // Transferee/beneficiary
  considerationAmount: decimal("consideration_amount", { precision: 15, scale: 2 }), // Sale price/consideration
  valuation: decimal("valuation", { precision: 15, scale: 2 }), // Circle rate based valuation
  stampDuty: decimal("stamp_duty", { precision: 15, scale: 2 }), // Calculated stamp duty
  registrationFee: decimal("registration_fee", { precision: 15, scale: 2 }), // Registration fee
  eStampRefNo: text("e_stamp_ref_no"), // e-Stamp reference number
  slotAt: timestamp("slot_at"), // SRO appointment slot
  slotRescheduledAt: timestamp("slot_rescheduled_at"), // Last reschedule time
  status: text("status").notNull().default("draft"), // draft, scheduled, under_verification, registered, certified
  kycVerified: boolean("kyc_verified").default(false), // KYC verification status
  encumbranceChecked: boolean("encumbrance_checked").default(false), // Encumbrance check status
  encumbranceCertPath: text("encumbrance_cert_path"), // Path to encumbrance certificate PDF
  deedPdfPath: text("deed_pdf_path"), // Path to prepared deed PDF
  registeredDeedPdfPath: text("registered_deed_pdf_path"), // Path to registered deed PDF
  certifiedCopyPdfPath: text("certified_copy_pdf_path"), // Path to certified copy PDF
  remarks: text("remarks"), // Officer remarks
  registeredAt: timestamp("registered_at"), // Registration completion date
  registeredBy: integer("registered_by").references(() => users.id), // SRO who registered
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deeds table - Deed documents
export const deeds = pgTable("pms_deeds", {
  id: serial("id").primaryKey(),
  registrationCaseId: integer("registration_case_id").references(() => registrationCases.id).notNull(),
  deedType: text("deed_type").notNull(), // sale, gift, mortgage, lease, partition, exchange, poa, will
  deedNo: text("deed_no").unique(), // Unique deed number
  deedDate: timestamp("deed_date").notNull(),
  pdfPath: text("pdf_path"), // Path to deed PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash for verification
  version: integer("version").default(1), // Version number
  status: text("status").notNull().default("draft"), // draft, prepared, registered, superseded
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Encumbrances table - Encumbrance certificates
export const encumbrances = pgTable("pms_encumbrances", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  registrationCaseId: integer("registration_case_id").references(() => registrationCases.id), // Optional - may be standalone
  certNo: text("cert_no").unique(), // Unique certificate number
  detailsJson: json("details_json"), // JSON with encumbrance details (mortgages, charges, etc.)
  certPdf: text("cert_pdf"), // Path to certificate PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash
  issuedAt: timestamp("issued_at").notNull(),
  issuedBy: integer("issued_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Registration Slots table - SRO slot booking
export const registrationSlots = pgTable("pms_registration_slots", {
  id: serial("id").primaryKey(),
  sroOffice: text("sro_office").notNull(), // SRO office name/location
  slotDate: timestamp("slot_date").notNull(), // Date and time of slot
  registrationCaseId: integer("registration_case_id").references(() => registrationCases.id), // Optional - may be unassigned
  status: text("status").notNull().default("available"), // available, booked, completed, cancelled
  bookedBy: integer("booked_by").references(() => users.id), // User who booked
  bookedAt: timestamp("booked_at"), // Booking timestamp
  cancelledAt: timestamp("cancelled_at"), // Cancellation timestamp
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// KYC Verifications table - PAN/Aadhaar/PLRS verification
export const kycVerifications = pgTable("pms_kyc_verifications", {
  id: serial("id").primaryKey(),
  registrationCaseId: integer("registration_case_id").references(() => registrationCases.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  verificationType: text("verification_type").notNull(), // pan, aadhaar, plrs
  documentNumber: text("document_number").notNull(), // PAN/Aadhaar/PLRS number
  status: text("status").notNull().default("pending"), // pending, verified, failed
  verificationResponse: json("verification_response"), // API response from verification service
  verifiedAt: timestamp("verified_at"),
  verifiedBy: integer("verified_by").references(() => users.id),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 7: Water & Sewerage Connections

// Water Connections table
export const waterConnections = pgTable("pms_water_connections", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  connectionNo: text("connection_no").unique(), // Unique connection number
  applicationDate: timestamp("application_date").notNull(),
  connectionType: text("connection_type").notNull(), // domestic, commercial, industrial
  serviceabilityCheck: json("serviceability_check"), // GIS serviceability check results
  fee: decimal("fee", { precision: 15, scale: 2 }), // Connection fee
  meterNo: text("meter_no"), // Meter number (if applicable)
  meterIntegrationData: json("meter_integration_data"), // Meter integration hooks
  status: text("status").notNull().default("applied"), // applied, serviceability_checked, inspection_scheduled, inspection_completed, sanctioned, active, renewal_pending, closed
  sanctionedAt: timestamp("sanctioned_at"),
  activatedAt: timestamp("activated_at"),
  closedAt: timestamp("closed_at"),
  slaDue: timestamp("sla_due"), // SLA deadline
  assignedTo: integer("assigned_to").references(() => users.id), // Assigned inspector/officer
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Sewerage Connections table
export const sewerageConnections = pgTable("pms_sewerage_connections", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  connectionNo: text("connection_no").unique(), // Unique connection number
  applicationDate: timestamp("application_date").notNull(),
  connectionType: text("connection_type").notNull(), // domestic, commercial, industrial
  serviceabilityCheck: json("serviceability_check"), // GIS serviceability check results
  fee: decimal("fee", { precision: 15, scale: 2 }), // Connection fee
  status: text("status").notNull().default("applied"), // applied, serviceability_checked, inspection_scheduled, inspection_completed, sanctioned, active, renewal_pending, closed
  sanctionedAt: timestamp("sanctioned_at"),
  activatedAt: timestamp("activated_at"),
  closedAt: timestamp("closed_at"),
  slaDue: timestamp("sla_due"), // SLA deadline
  assignedTo: integer("assigned_to").references(() => users.id), // Assigned inspector/officer
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Connection Inspections table
export const connectionInspections = pgTable("pms_connection_inspections", {
  id: serial("id").primaryKey(),
  connectionType: text("connection_type").notNull(), // water, sewerage
  connectionId: integer("connection_id").notNull(), // ID of water or sewerage connection
  inspectionType: text("inspection_type").notNull(), // pre_sanction, post_sanction, renewal, closure
  scheduledAt: timestamp("scheduled_at").notNull(),
  inspectedAt: timestamp("inspected_at"),
  inspectorId: integer("inspector_id").references(() => users.id),
  result: text("result"), // passed, failed, conditional
  remarks: text("remarks"),
  photosJson: json("photos_json"), // Array of photo paths with GPS data
  checklistJson: json("checklist_json"), // Inspection checklist
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Meter Readings table (for future integration)
export const meterReadings = pgTable("pms_meter_readings", {
  id: serial("id").primaryKey(),
  waterConnectionId: integer("water_connection_id").references(() => waterConnections.id),
  meterNo: text("meter_no").notNull(),
  readingValue: decimal("reading_value", { precision: 15, scale: 2 }).notNull(),
  readingDate: timestamp("reading_date").notNull(),
  readingType: text("reading_type").notNull(), // manual, automatic, estimated
  source: text("source"), // manual_entry, meter_api, billing_system
  sourceData: json("source_data"), // Source-specific data
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 6: Construction Services & Certificates

// Inspections table - Site inspections for construction services
export const inspections = pgTable("pms_inspections", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  type: text("type").notNull(), // demarcation, dpc, occupancy, completion, deviation
  scheduledAt: timestamp("scheduled_at"),
  inspectedAt: timestamp("inspected_at"),
  inspectedBy: integer("inspected_by").references(() => users.id),
  resultJson: json("result_json"), // Inspection results, checklist completion
  photos: json("photos"), // Array of photo paths with GPS coordinates
  status: text("status").notNull().default("scheduled"), // scheduled, in_progress, completed, failed
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Demarcation Requests table
export const demarcationRequests = pgTable("pms_demarcation_requests", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  requestNo: text("request_no").unique(), // Unique request number
  requestDate: timestamp("request_date").defaultNow(),
  inspectionId: integer("inspection_id").references(() => inspections.id),
  certificateNo: text("certificate_no").unique(), // Certificate number if issued
  pdfPath: text("pdf_path"), // Path to generated certificate PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash
  status: text("status").notNull().default("draft"), // draft, inspection_scheduled, inspection_completed, certificate_issued, rejected
  issuedAt: timestamp("issued_at"),
  issuedBy: integer("issued_by").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// DPC Requests table (Development Permission Certificate)
export const dpcRequests = pgTable("pms_dpc_requests", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  requestNo: text("request_no").unique(), // Unique request number
  requestDate: timestamp("request_date").defaultNow(),
  checklistJson: json("checklist_json"), // DPC checklist items
  inspectionId: integer("inspection_id").references(() => inspections.id),
  certificateNo: text("certificate_no").unique(), // Certificate number if issued
  pdfPath: text("pdf_path"), // Path to generated certificate PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash
  status: text("status").notNull().default("draft"), // draft, checklist_pending, inspection_scheduled, inspection_completed, certificate_issued, rejected
  issuedAt: timestamp("issued_at"),
  issuedBy: integer("issued_by").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Occupancy Certificates table
export const occupancyCertificates = pgTable("pms_occupancy_certificates", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  requestNo: text("request_no").unique(), // Unique request number
  requestDate: timestamp("request_date").defaultNow(),
  checklistJson: json("checklist_json"), // OC checklist items
  inspectionId: integer("inspection_id").references(() => inspections.id),
  certificateNo: text("certificate_no").unique(), // Certificate number
  pdfPath: text("pdf_path"), // Path to generated certificate PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash
  status: text("status").notNull().default("draft"), // draft, checklist_pending, inspection_scheduled, inspection_completed, certificate_issued, superseded, rejected
  issuedAt: timestamp("issued_at"),
  issuedBy: integer("issued_by").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Completion Certificates table
export const completionCertificates = pgTable("pms_completion_certificates", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  requestNo: text("request_no").unique(), // Unique request number
  requestDate: timestamp("request_date").defaultNow(),
  checklistJson: json("checklist_json"), // CC checklist items
  inspectionId: integer("inspection_id").references(() => inspections.id),
  certificateNo: text("certificate_no").unique(), // Certificate number
  pdfPath: text("pdf_path"), // Path to generated certificate PDF
  qrCode: text("qr_code"), // QR code data
  hashSha256: text("hash_sha256"), // SHA-256 hash
  status: text("status").notNull().default("draft"), // draft, checklist_pending, inspection_scheduled, inspection_completed, certificate_issued, superseded, rejected
  issuedAt: timestamp("issued_at"),
  issuedBy: integer("issued_by").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Deviations table - Construction deviations
export const deviations = pgTable("pms_deviations", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id).notNull(),
  partyId: integer("party_id").references(() => parties.id).notNull(),
  deviationType: text("deviation_type").notNull(), // area, height, setback, usage, other
  description: text("description").notNull(),
  oldValue: text("old_value"), // Original approved value
  newValue: text("new_value"), // Actual/current value
  fee: decimal("fee", { precision: 15, scale: 2 }), // Deviation fee
  penalty: decimal("penalty", { precision: 15, scale: 2 }), // Penalty amount
  inspectionId: integer("inspection_id").references(() => inspections.id),
  photos: json("photos"), // Photos of deviation
  status: text("status").notNull().default("recorded"), // recorded, fee_levied, rectified, approved, rejected
  rectifiedAt: timestamp("rectified_at"),
  rectifiedBy: integer("rectified_by").references(() => users.id),
  approvedBy: integer("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Phase 9: Grievance & Legal Management

// Grievances table - Complaint management
export const grievances = pgTable("pms_grievances", {
  id: serial("id").primaryKey(),
  refNo: text("ref_no").notNull().unique(), // Unique reference number (GRV-2024-001)
  partyId: integer("party_id").references(() => parties.id), // Optional - may be anonymous
  propertyId: integer("property_id").references(() => properties.id), // Optional
  category: text("category").notNull(), // payment, allotment, transfer, noc, certificate, service, other
  subcategory: text("subcategory"), // More specific category
  text: text("text").notNull(), // Complaint description
  channel: text("channel").notNull().default("web"), // web, mobile, helpdesk, email, phone
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("new"), // new, assigned, in_progress, resolved, reopened, closed
  assignedTo: integer("assigned_to").references(() => users.id), // Assigned officer
  slaDue: timestamp("sla_due"), // SLA deadline
  slaHours: integer("sla_hours").default(72), // SLA in hours (default 72 hours = 3 days)
  resolutionText: text("resolution_text"), // Resolution details
  resolutionPdf: text("resolution_pdf"), // Path to resolution PDF
  citizenRating: integer("citizen_rating"), // 1-5 rating from citizen
  citizenFeedback: text("citizen_feedback"), // Citizen feedback text
  escalatedAt: timestamp("escalated_at"), // When escalated
  escalatedBy: integer("escalated_by").references(() => users.id),
  escalatedTo: integer("escalated_to").references(() => users.id), // Escalated to officer
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: integer("resolved_by").references(() => users.id),
  closedAt: timestamp("closed_at"),
  closedBy: integer("closed_by").references(() => users.id),
  attachmentsJson: json("attachments_json"), // JSON array of attachment paths
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Legal Cases table - Court case tracking
export const legalCases = pgTable("pms_legal_cases", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").references(() => properties.id), // Optional
  partyId: integer("party_id").references(() => parties.id), // Optional
  grievanceId: integer("grievance_id").references(() => grievances.id), // Optional - may be linked to grievance
  court: text("court").notNull(), // Court name
  caseNo: text("case_no").notNull(), // Case number
  caseType: text("case_type"), // civil, criminal, writ, appeal, etc.
  petitioner: text("petitioner"), // Petitioner name
  respondent: text("respondent"), // Respondent name (usually PUDA/Authority)
  subject: text("subject").notNull(), // Case subject
  description: text("description"), // Case description
  filingDate: timestamp("filing_date"), // Case filing date
  status: text("status").notNull().default("active"), // active, stayed, disposed, closed, appeal
  nextHearingDate: timestamp("next_hearing_date"), // Next scheduled hearing
  lastHearingDate: timestamp("last_hearing_date"), // Last hearing date
  assignedTo: integer("assigned_to").references(() => users.id), // Assigned legal officer
  caseDiaryJson: json("case_diary_json"), // JSON array of case diary entries
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Case Hearings table - Hearing dates and details
export const caseHearings = pgTable("pms_case_hearings", {
  id: serial("id").primaryKey(),
  legalCaseId: integer("legal_case_id").references(() => legalCases.id).notNull(),
  hearingDate: timestamp("hearing_date").notNull(), // Scheduled hearing date
  hearingType: text("hearing_type").default("regular"), // regular, final, interim, urgent
  venue: text("venue"), // Court venue/room
  judge: text("judge"), // Judge name
  purpose: text("purpose"), // Purpose of hearing
  status: text("status").notNull().default("scheduled"), // scheduled, completed, adjourned, cancelled
  outcome: text("outcome"), // Hearing outcome
  minutes: text("minutes"), // Hearing minutes/notes
  minutesPath: text("minutes_path"), // Path to uploaded minutes PDF
  attendedBy: json("attended_by"), // JSON array of attendees
  adjournedTo: timestamp("adjourned_to"), // If adjourned, new date
  adjournmentReason: text("adjournment_reason"), // Reason for adjournment
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Court Orders table - Order compliance tracking
export const courtOrders = pgTable("pms_court_orders", {
  id: serial("id").primaryKey(),
  legalCaseId: integer("legal_case_id").references(() => legalCases.id).notNull(),
  hearingId: integer("hearing_id").references(() => caseHearings.id), // Optional - linked to hearing
  orderNo: text("order_no"), // Order number
  orderDate: timestamp("order_date").notNull(), // Order date
  orderType: text("order_type").notNull(), // stay, direction, final, interim, appeal
  orderText: text("order_text").notNull(), // Order text/description
  orderPdf: text("order_pdf"), // Path to order PDF
  complianceRequired: boolean("compliance_required").default(true), // Whether compliance is required
  complianceDeadline: timestamp("compliance_deadline"), // Compliance deadline
  complianceStatus: text("compliance_status").notNull().default("pending"), // pending, in_progress, complied, non_compliant, appealed
  complianceNotes: text("compliance_notes"), // Compliance notes
  compliedAt: timestamp("complied_at"), // When compliance was completed
  compliedBy: integer("complied_by").references(() => users.id), // Officer who ensured compliance
  appealFiled: boolean("appeal_filed").default(false), // Whether appeal was filed
  appealDetails: text("appeal_details"), // Appeal details
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvestmentRequestSchema = createInsertSchema(investmentRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCashRequestSchema = createInsertSchema(cashRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApprovalSchema = createInsertSchema(approvals).omit({
  id: true,
  createdAt: true,
  approvedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentCategorySchema = createInsertSchema(documentCategories).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentCategoryAssociationSchema = createInsertSchema(documentCategoryAssociations).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});

export const insertBackgroundJobSchema = createInsertSchema(backgroundJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export const insertDocumentQuerySchema = createInsertSchema(documentQueries).omit({
  id: true,
  createdAt: true,
});

export const insertCrossDocumentQuerySchema = createInsertSchema(crossDocumentQueries).omit({
  id: true,
  createdAt: true,
});

export const insertWebSearchQuerySchema = createInsertSchema(webSearchQueries).omit({
  id: true,
  createdAt: true,
});

export const insertSequenceSchema = createInsertSchema(sequences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInvestmentRationaleSchema = createInsertSchema(investmentRationales).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// LAMS Zod Schemas
export const insertParcelSchema = createInsertSchema(parcels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOwnerSchema = createInsertSchema(owners).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertParcelOwnerSchema = createInsertSchema(parcelOwners).omit({
  id: true,
  createdAt: true,
});

export const insertSiaSchema = createInsertSchema(sia).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishedAt: true,
});

export const insertSiaFeedbackSchema = createInsertSchema(siaFeedback).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSiaHearingSchema = createInsertSchema(siaHearings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSiaReportSchema = createInsertSchema(siaReports).omit({
  id: true,
  generatedAt: true,
});

export const insertLandNotificationSchema = createInsertSchema(landNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  publishDate: true,
  approvedAt: true,
});

export const insertNotificationParcelSchema = createInsertSchema(notificationParcels).omit({
  id: true,
  createdAt: true,
});

export const insertObjectionSchema = createInsertSchema(objections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

export const insertValuationSchema = createInsertSchema(valuations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAwardSchema = createInsertSchema(awards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  awardDate: true,
});

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  paidOn: true,
});

export const insertPossessionSchema = createInsertSchema(possession).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPossessionMediaSchema = createInsertSchema(possessionMedia).omit({
  id: true,
  createdAt: true,
  capturedAt: true,
});

// PMS Relations
export const partiesRelations = relations(parties, ({ many }) => ({
  ownership: many(ownership),
  applications: many(applications),
  allotments: many(allotments),
}));

export const schemesRelations = relations(schemes, ({ one, many }) => ({
  creator: one(users, { fields: [schemes.createdBy], references: [users.id] }),
  properties: many(properties),
  applications: many(applications),
}));

export const propertiesRelations = relations(properties, ({ one, many }) => ({
  scheme: one(schemes, { fields: [properties.schemeId], references: [schemes.id] }),
  ownership: many(ownership),
  allotments: many(allotments),
}));

export const ownershipRelations = relations(ownership, ({ one }) => ({
  property: one(properties, { fields: [ownership.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [ownership.partyId], references: [parties.id] }),
}));

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  scheme: one(schemes, { fields: [applications.schemeId], references: [schemes.id] }),
  party: one(parties, { fields: [applications.partyId], references: [parties.id] }),
  allotments: many(allotments),
}));

export const allotmentsRelations = relations(allotments, ({ one }) => ({
  property: one(properties, { fields: [allotments.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [allotments.partyId], references: [parties.id] }),
  application: one(applications, { fields: [allotments.applicationId], references: [applications.id] }),
  creator: one(users, { fields: [allotments.createdBy], references: [users.id] }),
}));

export const transfersRelations = relations(transfers, ({ one }) => ({
  property: one(properties, { fields: [transfers.propertyId], references: [properties.id] }),
  fromParty: one(parties, { fields: [transfers.fromPartyId], references: [parties.id] }),
  toParty: one(parties, { fields: [transfers.toPartyId], references: [parties.id] }),
  approver: one(users, { fields: [transfers.approvedBy], references: [users.id] }),
  creator: one(users, { fields: [transfers.createdBy], references: [users.id] }),
}));

export const mortgagesRelations = relations(mortgages, ({ one }) => ({
  property: one(properties, { fields: [mortgages.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [mortgages.partyId], references: [parties.id] }),
  approver: one(users, { fields: [mortgages.approvedBy], references: [users.id] }),
  creator: one(users, { fields: [mortgages.createdBy], references: [users.id] }),
}));

export const modificationsRelations = relations(modifications, ({ one }) => ({
  property: one(properties, { fields: [modifications.propertyId], references: [properties.id] }),
  approver: one(users, { fields: [modifications.approvedBy], references: [users.id] }),
  creator: one(users, { fields: [modifications.createdBy], references: [users.id] }),
}));

export const nocsRelations = relations(nocs, ({ one }) => ({
  property: one(properties, { fields: [nocs.propertyId], references: [properties.id] }),
  issuer: one(users, { fields: [nocs.issuedBy], references: [users.id] }),
  creator: one(users, { fields: [nocs.createdBy], references: [users.id] }),
}));

export const conveyanceDeedsRelations = relations(conveyanceDeeds, ({ one }) => ({
  property: one(properties, { fields: [conveyanceDeeds.propertyId], references: [properties.id] }),
  transfer: one(transfers, { fields: [conveyanceDeeds.transferId], references: [transfers.id] }),
  fromParty: one(parties, { fields: [conveyanceDeeds.fromPartyId], references: [parties.id] }),
  toParty: one(parties, { fields: [conveyanceDeeds.toPartyId], references: [parties.id] }),
  creator: one(users, { fields: [conveyanceDeeds.createdBy], references: [users.id] }),
}));

// Update propertiesRelations to include Phase 3 relations
export const propertiesRelationsPhase3 = relations(properties, ({ many }) => ({
  transfers: many(transfers),
  mortgages: many(mortgages),
  modifications: many(modifications),
  nocs: many(nocs),
  conveyanceDeeds: many(conveyanceDeeds),
}));

// Phase 4 Relations
export const demandNotesRelations = relations(demandNotes, ({ one }) => ({
  property: one(properties, { fields: [demandNotes.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [demandNotes.partyId], references: [parties.id] }),
  creator: one(users, { fields: [demandNotes.createdBy], references: [users.id] }),
}));

export const pmsPaymentsRelations = relations(pmsPayments, ({ one }) => ({
  demandNote: one(demandNotes, { fields: [pmsPayments.demandNoteId], references: [demandNotes.id] }),
  property: one(properties, { fields: [pmsPayments.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [pmsPayments.partyId], references: [parties.id] }),
}));

export const receiptsRelations = relations(receipts, ({ one }) => ({
  payment: one(pmsPayments, { fields: [receipts.paymentId], references: [pmsPayments.id] }),
  issuer: one(users, { fields: [receipts.issuedBy], references: [users.id] }),
}));

export const refundsRelations = relations(refunds, ({ one }) => ({
  payment: one(pmsPayments, { fields: [refunds.paymentId], references: [pmsPayments.id] }),
  property: one(properties, { fields: [refunds.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [refunds.partyId], references: [parties.id] }),
  approver: one(users, { fields: [refunds.approvedBy], references: [users.id] }),
  creator: one(users, { fields: [refunds.createdBy], references: [users.id] }),
}));

export const ledgersRelations = relations(ledgers, ({ one }) => ({
  property: one(properties, { fields: [ledgers.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [ledgers.partyId], references: [parties.id] }),
}));

export const serviceRequestsRelations = relations(serviceRequests, ({ one }) => ({
  property: one(properties, { fields: [serviceRequests.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [serviceRequests.partyId], references: [parties.id] }),
  assignee: one(users, { fields: [serviceRequests.assignedTo], references: [users.id] }),
}));

// Phase 6 Relations
export const inspectionsRelations = relations(inspections, ({ one }) => ({
  property: one(properties, { fields: [inspections.propertyId], references: [properties.id] }),
  inspector: one(users, { fields: [inspections.inspectedBy], references: [users.id] }),
}));

export const demarcationRequestsRelations = relations(demarcationRequests, ({ one }) => ({
  property: one(properties, { fields: [demarcationRequests.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [demarcationRequests.partyId], references: [parties.id] }),
  inspection: one(inspections, { fields: [demarcationRequests.inspectionId], references: [inspections.id] }),
  issuer: one(users, { fields: [demarcationRequests.issuedBy], references: [users.id] }),
  creator: one(users, { fields: [demarcationRequests.createdBy], references: [users.id] }),
}));

export const dpcRequestsRelations = relations(dpcRequests, ({ one }) => ({
  property: one(properties, { fields: [dpcRequests.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [dpcRequests.partyId], references: [parties.id] }),
  inspection: one(inspections, { fields: [dpcRequests.inspectionId], references: [inspections.id] }),
  issuer: one(users, { fields: [dpcRequests.issuedBy], references: [users.id] }),
  creator: one(users, { fields: [dpcRequests.createdBy], references: [users.id] }),
}));

export const occupancyCertificatesRelations = relations(occupancyCertificates, ({ one }) => ({
  property: one(properties, { fields: [occupancyCertificates.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [occupancyCertificates.partyId], references: [parties.id] }),
  inspection: one(inspections, { fields: [occupancyCertificates.inspectionId], references: [inspections.id] }),
  issuer: one(users, { fields: [occupancyCertificates.issuedBy], references: [users.id] }),
  creator: one(users, { fields: [occupancyCertificates.createdBy], references: [users.id] }),
}));

export const completionCertificatesRelations = relations(completionCertificates, ({ one }) => ({
  property: one(properties, { fields: [completionCertificates.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [completionCertificates.partyId], references: [parties.id] }),
  inspection: one(inspections, { fields: [completionCertificates.inspectionId], references: [inspections.id] }),
  issuer: one(users, { fields: [completionCertificates.issuedBy], references: [users.id] }),
  creator: one(users, { fields: [completionCertificates.createdBy], references: [users.id] }),
}));

export const deviationsRelations = relations(deviations, ({ one }) => ({
  property: one(properties, { fields: [deviations.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [deviations.partyId], references: [parties.id] }),
  inspection: one(inspections, { fields: [deviations.inspectionId], references: [inspections.id] }),
  rectifier: one(users, { fields: [deviations.rectifiedBy], references: [users.id] }),
  approver: one(users, { fields: [deviations.approvedBy], references: [users.id] }),
  creator: one(users, { fields: [deviations.createdBy], references: [users.id] }),
}));

// Update propertiesRelations to include Phase 4 relations
export const propertiesRelationsPhase4 = relations(properties, ({ many }) => ({
  demandNotes: many(demandNotes),
  payments: many(pmsPayments),
  refunds: many(refunds),
  ledgers: many(ledgers),
}));

// Update propertiesRelations to include Phase 8 relations
export const propertiesRelationsPhase8 = relations(properties, ({ many }) => ({
  registrationCases: many(registrationCases),
  encumbrances: many(encumbrances),
}));

// Update propertiesRelations to include Phase 6 relations
export const propertiesRelationsPhase6 = relations(properties, ({ many }) => ({
  inspections: many(inspections),
  demarcationRequests: many(demarcationRequests),
  dpcRequests: many(dpcRequests),
  occupancyCertificates: many(occupancyCertificates),
  completionCertificates: many(completionCertificates),
  deviations: many(deviations),
}));

// Update usersRelations to include PMS relations
export const usersRelationsPMS = relations(users, ({ many }) => ({
  schemesCreated: many(schemes),
  allotmentsCreated: many(allotments),
}));

// Phase 9 Relations
export const grievancesRelations = relations(grievances, ({ one }) => ({
  party: one(parties, { fields: [grievances.partyId], references: [parties.id] }),
  property: one(properties, { fields: [grievances.propertyId], references: [properties.id] }),
  assignedOfficer: one(users, { fields: [grievances.assignedTo], references: [users.id] }),
  escalatedByOfficer: one(users, { fields: [grievances.escalatedBy], references: [users.id] }),
  escalatedToOfficer: one(users, { fields: [grievances.escalatedTo], references: [users.id] }),
  resolvedByOfficer: one(users, { fields: [grievances.resolvedBy], references: [users.id] }),
  closedByOfficer: one(users, { fields: [grievances.closedBy], references: [users.id] }),
}));

export const legalCasesRelations = relations(legalCases, ({ one, many }) => ({
  property: one(properties, { fields: [legalCases.propertyId], references: [properties.id] }),
  party: one(parties, { fields: [legalCases.partyId], references: [parties.id] }),
  grievance: one(grievances, { fields: [legalCases.grievanceId], references: [grievances.id] }),
  assignedOfficer: one(users, { fields: [legalCases.assignedTo], references: [users.id] }),
  hearings: many(caseHearings),
  orders: many(courtOrders),
}));

export const caseHearingsRelations = relations(caseHearings, ({ one }) => ({
  legalCase: one(legalCases, { fields: [caseHearings.legalCaseId], references: [legalCases.id] }),
}));

export const courtOrdersRelations = relations(courtOrders, ({ one }) => ({
  legalCase: one(legalCases, { fields: [courtOrders.legalCaseId], references: [legalCases.id] }),
  hearing: one(caseHearings, { fields: [courtOrders.hearingId], references: [caseHearings.id] }),
  compliedByOfficer: one(users, { fields: [courtOrders.compliedBy], references: [users.id] }),
}));

// Update propertiesRelations to include Phase 9 relations
export const propertiesRelationsPhase9 = relations(properties, ({ many }) => ({
  grievances: many(grievances),
  legalCases: many(legalCases),
}));

// Update partiesRelations to include Phase 9 relations
export const partiesRelationsPhase9 = relations(parties, ({ many }) => ({
  grievances: many(grievances),
  legalCases: many(legalCases),
}));

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InvestmentRequest = typeof investmentRequests.$inferSelect;
export type InsertInvestmentRequest = z.infer<typeof insertInvestmentRequestSchema>;
export type CashRequest = typeof cashRequests.$inferSelect;
export type InsertCashRequest = z.infer<typeof insertCashRequestSchema>;
export type Approval = typeof approvals.$inferSelect;
export type InsertApproval = z.infer<typeof insertApprovalSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type DocumentCategory = typeof documentCategories.$inferSelect;
export type InsertDocumentCategory = z.infer<typeof insertDocumentCategorySchema>;
// Removed DocumentSubcategory - using multiple categories system instead
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type BackgroundJob = typeof backgroundJobs.$inferSelect;
export type InsertBackgroundJob = z.infer<typeof insertBackgroundJobSchema>;
export type DocumentQuery = typeof documentQueries.$inferSelect;
export type InsertDocumentQuery = z.infer<typeof insertDocumentQuerySchema>;
export type CrossDocumentQuery = typeof crossDocumentQueries.$inferSelect;
export type InsertCrossDocumentQuery = z.infer<typeof insertCrossDocumentQuerySchema>;
export type WebSearchQuery = typeof webSearchQueries.$inferSelect;
export type InsertWebSearchQuery = z.infer<typeof insertWebSearchQuerySchema>;
export type Sequence = typeof sequences.$inferSelect;
export type InsertSequence = z.infer<typeof insertSequenceSchema>;
export type InvestmentRationale = typeof investmentRationales.$inferSelect;
export type InsertInvestmentRationale = z.infer<typeof insertInvestmentRationaleSchema>;

// LAMS Types
export type Parcel = typeof parcels.$inferSelect;
export type InsertParcel = z.infer<typeof insertParcelSchema>;
export type Owner = typeof owners.$inferSelect;
export type InsertOwner = z.infer<typeof insertOwnerSchema>;
export type ParcelOwner = typeof parcelOwners.$inferSelect;
export type InsertParcelOwner = z.infer<typeof insertParcelOwnerSchema>;
export type Sia = typeof sia.$inferSelect;
export type InsertSia = z.infer<typeof insertSiaSchema>;
export type SiaFeedback = typeof siaFeedback.$inferSelect;
export type InsertSiaFeedback = z.infer<typeof insertSiaFeedbackSchema>;
export type SiaHearing = typeof siaHearings.$inferSelect;
export type InsertSiaHearing = z.infer<typeof insertSiaHearingSchema>;
export type SiaReport = typeof siaReports.$inferSelect;
export type InsertSiaReport = z.infer<typeof insertSiaReportSchema>;
export type LandNotification = typeof landNotifications.$inferSelect;
export type InsertLandNotification = z.infer<typeof insertLandNotificationSchema>;
export type NotificationParcel = typeof notificationParcels.$inferSelect;
export type InsertNotificationParcel = z.infer<typeof insertNotificationParcelSchema>;
export type Objection = typeof objections.$inferSelect;
export type InsertObjection = z.infer<typeof insertObjectionSchema>;
export type Valuation = typeof valuations.$inferSelect;
export type InsertValuation = z.infer<typeof insertValuationSchema>;
export type Award = typeof awards.$inferSelect;
export type InsertAward = z.infer<typeof insertAwardSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Possession = typeof possession.$inferSelect;
export type InsertPossession = z.infer<typeof insertPossessionSchema>;
export type PossessionMedia = typeof possessionMedia.$inferSelect;
export type InsertPossessionMedia = z.infer<typeof insertPossessionMediaSchema>;

// PMS Zod Schemas
export const insertPartySchema = createInsertSchema(parties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSchemeSchema = createInsertSchema(schemes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPropertySchema = createInsertSchema(properties).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertOwnershipSchema = createInsertSchema(ownership).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAllotmentSchema = createInsertSchema(allotments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// PMS Types
export type Party = typeof parties.$inferSelect;
export type InsertParty = z.infer<typeof insertPartySchema>;
export type Scheme = typeof schemes.$inferSelect;
export type InsertScheme = z.infer<typeof insertSchemeSchema>;
export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Ownership = typeof ownership.$inferSelect;
export type InsertOwnership = z.infer<typeof insertOwnershipSchema>;
export type Application = typeof applications.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Allotment = typeof allotments.$inferSelect;
export type InsertAllotment = z.infer<typeof insertAllotmentSchema>;

// Phase 3 Zod Schemas
export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertMortgageSchema = createInsertSchema(mortgages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertModificationSchema = createInsertSchema(modifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
});

export const insertNOCSchema = createInsertSchema(nocs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  issuedAt: true,
});

export const insertConveyanceDeedSchema = createInsertSchema(conveyanceDeeds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Phase 3 Types
export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type Mortgage = typeof mortgages.$inferSelect;
export type InsertMortgage = z.infer<typeof insertMortgageSchema>;
export type Modification = typeof modifications.$inferSelect;
export type InsertModification = z.infer<typeof insertModificationSchema>;
export type NOC = typeof nocs.$inferSelect;
export type InsertNOC = z.infer<typeof insertNOCSchema>;
export type ConveyanceDeed = typeof conveyanceDeeds.$inferSelect;
export type InsertConveyanceDeed = z.infer<typeof insertConveyanceDeedSchema>;

// Phase 4 Zod Schemas
export const insertDemandNoteSchema = createInsertSchema(demandNotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRefundSchema = createInsertSchema(refunds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  approvedAt: true,
  processedAt: true,
});

export const insertLedgerSchema = createInsertSchema(ledgers).omit({
  id: true,
  createdAt: true,
});

export const insertServiceRequestSchema = createInsertSchema(serviceRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
});

// Phase 7 Zod Schemas - Water & Sewerage Connections
export const insertWaterConnectionSchema = createInsertSchema(waterConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sanctionedAt: true,
  activatedAt: true,
  closedAt: true,
  connectionNo: true,
});

export const insertSewerageConnectionSchema = createInsertSchema(sewerageConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  sanctionedAt: true,
  activatedAt: true,
  closedAt: true,
  connectionNo: true,
});

export const insertConnectionInspectionSchema = createInsertSchema(connectionInspections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  inspectedAt: true,
});

export const insertMeterReadingSchema = createInsertSchema(meterReadings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Phase 8 Zod Schemas - Registration
export const insertRegistrationCaseSchema = createInsertSchema(registrationCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  registeredAt: true,
});

export const insertDeedSchema = createInsertSchema(deeds).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEncumbranceSchema = createInsertSchema(encumbrances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRegistrationSlotSchema = createInsertSchema(registrationSlots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  bookedAt: true,
  cancelledAt: true,
});

export const insertKycVerificationSchema = createInsertSchema(kycVerifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verifiedAt: true,
});

// Phase 6 Zod Schemas
export const insertInspectionSchema = createInsertSchema(inspections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  inspectedAt: true,
});

export const insertDemarcationRequestSchema = createInsertSchema(demarcationRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  issuedAt: true,
});

export const insertDpcRequestSchema = createInsertSchema(dpcRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  issuedAt: true,
});

export const insertOccupancyCertificateSchema = createInsertSchema(occupancyCertificates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  issuedAt: true,
});

export const insertCompletionCertificateSchema = createInsertSchema(completionCertificates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  issuedAt: true,
});

export const insertDeviationSchema = createInsertSchema(deviations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  rectifiedAt: true,
  approvedAt: true,
});

// Phase 9 Zod Schemas
export const insertGrievanceSchema = createInsertSchema(grievances).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  resolvedAt: true,
  closedAt: true,
  escalatedAt: true,
});

export const insertLegalCaseSchema = createInsertSchema(legalCases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCaseHearingSchema = createInsertSchema(caseHearings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCourtOrderSchema = createInsertSchema(courtOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  compliedAt: true,
});

// Phase 4 Types
export type DemandNote = typeof demandNotes.$inferSelect;
export type InsertDemandNote = z.infer<typeof insertDemandNoteSchema>;
export type PmsPayment = typeof pmsPayments.$inferSelect;
export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Refund = typeof refunds.$inferSelect;
export type InsertRefund = z.infer<typeof insertRefundSchema>;
export type Ledger = typeof ledgers.$inferSelect;
export type InsertLedger = z.infer<typeof insertLedgerSchema>;
export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = z.infer<typeof insertServiceRequestSchema>;

// Phase 9 Types
export type Grievance = typeof grievances.$inferSelect;
export type InsertGrievance = z.infer<typeof insertGrievanceSchema>;
export type LegalCase = typeof legalCases.$inferSelect;
export type InsertLegalCase = z.infer<typeof insertLegalCaseSchema>;
export type CaseHearing = typeof caseHearings.$inferSelect;
export type InsertCaseHearing = z.infer<typeof insertCaseHearingSchema>;
export type CourtOrder = typeof courtOrders.$inferSelect;
export type InsertCourtOrder = z.infer<typeof insertCourtOrderSchema>;

// Phase 7 Types
export type WaterConnection = typeof waterConnections.$inferSelect;
export type InsertWaterConnection = z.infer<typeof insertWaterConnectionSchema>;
export type SewerageConnection = typeof sewerageConnections.$inferSelect;
export type InsertSewerageConnection = z.infer<typeof insertSewerageConnectionSchema>;
export type ConnectionInspection = typeof connectionInspections.$inferSelect;
export type InsertConnectionInspection = z.infer<typeof insertConnectionInspectionSchema>;
export type MeterReading = typeof meterReadings.$inferSelect;
export type InsertMeterReading = z.infer<typeof insertMeterReadingSchema>;

// Phase 8 Types - Registration
export type RegistrationCase = typeof registrationCases.$inferSelect;
export type InsertRegistrationCase = z.infer<typeof insertRegistrationCaseSchema>;
export type Deed = typeof deeds.$inferSelect;
export type InsertDeed = z.infer<typeof insertDeedSchema>;
export type Encumbrance = typeof encumbrances.$inferSelect;
export type InsertEncumbrance = z.infer<typeof insertEncumbranceSchema>;
export type RegistrationSlot = typeof registrationSlots.$inferSelect;
export type InsertRegistrationSlot = z.infer<typeof insertRegistrationSlotSchema>;
export type KycVerification = typeof kycVerifications.$inferSelect;
export type InsertKycVerification = z.infer<typeof insertKycVerificationSchema>;
