# Property Management System (PMS) - Modularized Development Phases

**Based on:** PUDA_PMS_TopClass_BRD_v1.0.docx  
**Purpose:** Break down PMS requirements into independent, parallelizable phases for multi-agent development  
**Header:** All features under "Property Management" module

---

## Overview

This document organizes the Property Management System requirements into **10 independent phases** that can be developed in parallel by different agents. Each phase is self-contained with minimal dependencies, allowing for concurrent development.

---

## Phase 1: Foundation & Core Data Models
**Priority:** Critical (Must be completed first)  
**Dependencies:** None  
**Estimated Complexity:** Medium

### Objectives
- Create core database schema for Property Management
- Set up base entities and relationships
- Implement audit logging infrastructure

### Deliverables
1. **Database Schema** (`shared/schema.ts` additions):
   - `schemes` table (scheme management)
   - `properties` table (property master)
   - `applications` table (scheme applications)
   - `allotments` table (allotment letters)
   - `ownership` table (property ownership with shares)
   - `parties` table (extend existing owners table or create new)
   - `auditLogs` table (extend existing for PMS entities)

2. **Base Services**:
   - `server/services/propertyService.ts` (base CRUD)
   - `server/services/schemeService.ts` (base CRUD)
   - `server/services/partyService.ts` (party/owner management)

3. **API Routes** (`server/routes.ts`):
   - `/api/property-management/schemes` (CRUD)
   - `/api/property-management/properties` (CRUD)
   - `/api/property-management/parties` (CRUD)

### Acceptance Criteria
- All tables created and migrated
- Basic CRUD operations functional
- Audit logs captured for all operations
- API endpoints return proper responses

---

## Phase 2: Scheme Management & Allotments
**Priority:** High  
**Dependencies:** Phase 1  
**Estimated Complexity:** High

### Objectives
- Complete scheme lifecycle management
- Implement e-draw system with randomization
- Generate allotment letters with QR codes

### Deliverables
1. **Extended Schema**:
   - `schemes` table with eligibility criteria (JSON)
   - `applications` table with status workflow
   - `allotments` table with letter numbering

2. **Services**:
   - `server/services/schemeService.ts` (full implementation)
   - `server/services/allotmentService.ts` (allotment management)
   - `server/services/drawService.ts` (e-draw randomization)

3. **Features**:
   - Scheme creation with inventory (plots/units)
   - Online application submission with validation
   - Automated public draw with audit trail
   - Allotment letter generation (PDF with QR + SHA-256)
   - Waitlist management
   - Substitutions and cancellations

4. **API Routes**:
   - `/api/property-management/schemes/:id/applications` (submit, list)
   - `/api/property-management/schemes/:id/draw` (conduct draw)
   - `/api/property-management/schemes/:id/allotments` (generate letters)
   - `/api/property-management/allotments/:id` (view, accept, cancel)

### Acceptance Criteria
- Schemes can be created with eligibility criteria
- Applications can be submitted and validated
- E-draw executes with proper randomization and audit
- Allotment letters generated with QR codes and integrity hashes
- Waitlist and substitution logic functional

---

## Phase 3: Property Lifecycle & Post-Allotment Services
**Priority:** High  
**Dependencies:** Phase 1, Phase 2  
**Estimated Complexity:** High

### Objectives
- Manage property ownership lifecycle
- Handle transfers, mortgages, and modifications
- Generate conveyance deeds and NOCs

### Deliverables
1. **Extended Schema**:
   - `transfers` table (sale/gift/inheritance)
   - `mortgages` table (mortgage permissions)
   - `modifications` table (area/usage/partner changes)
   - `nocs` table (NOC management)
   - `conveyanceDeeds` table

2. **Services**:
   - `server/services/transferService.ts` (property transfers)
   - `server/services/mortgageService.ts` (mortgage management)
   - `server/services/modificationService.ts` (property modifications)
   - `server/services/nocService.ts` (NOC issuance)
   - `server/services/conveyanceService.ts` (deed generation)

3. **Features**:
   - Property master with lifecycle timeline
   - Ownership history and traceability
   - Transfer requests (sale/gift/inheritance) with maker-checker
   - Mortgage permissions and hypothecation
   - NOC issuance with configurable checklists
   - Conveyance deed generation from templates
   - Property modifications (area/usage/partner/firm)

4. **API Routes**:
   - `/api/property-management/properties/:id/transfers` (create, list, approve)
   - `/api/property-management/properties/:id/mortgages` (create, list, approve)
   - `/api/property-management/properties/:id/modifications` (create, list, approve)
   - `/api/property-management/properties/:id/nocs` (create, list, issue)
   - `/api/property-management/properties/:id/conveyance` (generate deed)

### Acceptance Criteria
- Property ownership can be transferred with proper validation
- Ownership shares total 100% validation
- NOCs generated with checklists
- Conveyance deeds generated from templates
- All state transitions audited

---

## Phase 4: Payments & Ledgers
**Priority:** High  
**Dependencies:** Phase 1, Phase 3  
**Estimated Complexity:** High

### Objectives
- Implement demand note generation and payment processing
- Create ledger reconciliation system
- Handle refunds and amnesty schemes

### Deliverables
1. **Extended Schema**:
   - `demandNotes` table (demand schedules)
   - `payments` table (extend existing for PMS)
   - `ledgers` table (property account ledgers)
   - `refunds` table (refund management)
   - `amnestySchemes` table

2. **Services**:
   - `server/services/demandNoteService.ts` (demand note generation)
   - `server/services/paymentService.ts` (payment processing)
   - `server/services/ledgerService.ts` (ledger management)
   - `server/services/refundService.ts` (refund processing)
   - `server/services/amnestyService.ts` (amnesty schemes)

3. **Features**:
   - Automated demand note generation (principal/interest/penalties)
   - Payment gateway integration (UPI/NetBanking/RTGS)
   - Installment schedule management
   - Late fee and interest calculation
   - Receipt generation with QR codes
   - 3-way reconciliation with Accounts
   - Refund workflows with maker-checker
   - Amnesty scheme management

4. **API Routes**:
   - `/api/property-management/properties/:id/demand-notes` (generate, list)
   - `/api/property-management/demand-notes/:id/pay` (payment processing)
   - `/api/property-management/properties/:id/ledger` (view ledger)
   - `/api/property-management/properties/:id/refunds` (create, approve)
   - `/api/property-management/reconciliation` (export, reconcile)

### Acceptance Criteria
- Demand notes generated with unique numbering
- Payments processed idempotently
- Ledger balances calculated correctly
- Refunds processed with approvals
- Reconciliation exports functional

---

## Phase 5: Citizen Services Portal
**Priority:** Medium  
**Dependencies:** Phase 1, Phase 2, Phase 3, Phase 4  
**Estimated Complexity:** Medium

### Objectives
- Build citizen-facing self-service portal
- Implement property 360 view
- Enable document downloads and status tracking

### Deliverables
1. **Frontend Pages** (`client/src/pages/`):
   - `PropertySearch.tsx` (property search)
   - `Property360.tsx` (property details view)
   - `PropertyPassbook.tsx` (passbook view)
   - `ServiceRequests.tsx` (self-service requests)
   - `DocumentDownloads.tsx` (document access)

2. **Services**:
   - `server/services/citizenService.ts` (citizen portal logic)
   - `server/services/passbookService.ts` (passbook generation)

3. **Features**:
   - Property search by reference number + OTP
   - Property 360 view (owner, dues, payments, documents, status)
   - Downloadable passbook (PDF)
   - Self-service requests (address change, duplicate documents, corrections)
   - Status tracker with OTP verification
   - Multilingual UI support (English, Punjabi, Hindi)
   - Accessibility features (keyboard navigation, high-contrast)

4. **API Routes**:
   - `/api/public/property-management/properties/search` (search by ref + OTP)
   - `/api/public/property-management/properties/:id/360` (property details)
   - `/api/public/property-management/properties/:id/passbook` (download)
   - `/api/public/property-management/service-requests` (create, track)
   - `/api/public/property-management/documents/:id/download` (download)

### Acceptance Criteria
- Citizens can search properties with OTP
- Property 360 view shows all relevant information
- Passbook downloadable as PDF
- Self-service requests functional
- Multilingual support working
- WCAG 2.2 AA compliance

---

## Phase 6: Construction Services & Certificates
**Priority:** Medium  
**Dependencies:** Phase 1, Phase 3  
**Estimated Complexity:** Medium

### Objectives
- Manage construction-related services
- Issue demarcation, DPC, and occupancy certificates
- Handle deviations and modifications

### Deliverables
1. **Extended Schema**:
   - `demarcationRequests` table
   - `dpcRequests` table (DPC - Development Permission Certificate)
   - `occupancyCertificates` table
   - `completionCertificates` table
   - `deviations` table
   - `inspections` table (extend existing for construction)

2. **Services**:
   - `server/services/demarcationService.ts` (demarcation requests)
   - `server/services/dpcService.ts` (DPC management)
   - `server/services/certificateService.ts` (OC/CC issuance)
   - `server/services/deviationService.ts` (deviation management)

3. **Features**:
   - Demarcation request → inspection → certificate
   - DPC request with checklists
   - Occupancy/Completion Certificate issuance
   - Site photo capture with GPS
   - Deviation recording and fee calculation
   - Certificate PDF generation with QR codes

4. **API Routes**:
   - `/api/property-management/properties/:id/demarcation` (request, inspect, issue)
   - `/api/property-management/properties/:id/dpc` (request, inspect, issue)
   - `/api/property-management/properties/:id/occupancy-certificate` (request, issue)
   - `/api/property-management/properties/:id/completion-certificate` (request, issue)
   - `/api/property-management/properties/:id/deviations` (record, rectify)

### Acceptance Criteria
- Demarcation requests processed end-to-end
- DPC and OC/CC certificates generated
- Site inspections with photo capture
- Deviations recorded and fees calculated
- All certificates have QR codes and integrity hashes

---

## Phase 7: Water & Sewerage Connections
**Priority:** Medium  
**Dependencies:** Phase 1, Phase 3  
**Estimated Complexity:** Medium

### Objectives
- Manage utility connection requests
- Integrate with GIS for serviceability checks
- Handle connection lifecycle

### Deliverables
1. **Extended Schema**:
   - `waterConnections` table
   - `sewerageConnections` table
   - `connectionInspections` table
   - `meterReadings` table (for future integration)

2. **Services**:
   - `server/services/waterConnectionService.ts` (water connections)
   - `server/services/sewerageConnectionService.ts` (sewerage connections)
   - `server/services/utilityService.ts` (common utility logic)

3. **Features**:
   - Connection application intake
   - Serviceability checks via GIS
   - Inspection scheduling and reporting
   - Connection fees calculation
   - Connection sanction and activation
   - Meter integration hooks (stubs for future)
   - Renewal and closure workflows
   - SLA tracking

4. **API Routes**:
   - `/api/property-management/properties/:id/water-connection` (apply, inspect, sanction)
   - `/api/property-management/properties/:id/sewerage-connection` (apply, inspect, sanction)
   - `/api/property-management/connections/:id/renew` (renewal)
   - `/api/property-management/connections/:id/close` (closure)

### Acceptance Criteria
- Connection applications accepted
- GIS serviceability checks functional
- Inspections scheduled and completed
- Connections sanctioned and activated
- SLA timers working

---

## Phase 8: Property Registration Integration
**Priority:** Medium  
**Dependencies:** Phase 1, Phase 3, Phase 4  
**Estimated Complexity:** High

### Objectives
- Integrate property registration workflow
- Handle deed preparation and SRO workflow
- Implement KYC and encumbrance checks

### Deliverables
1. **Extended Schema**:
   - `registrationCases` table (deed registration)
   - `deeds` table (deed types: Sale, Gift, Mortgage, etc.)
   - `encumbrances` table (encumbrance certificates)
   - `registrationSlots` table (SRO slot booking)
   - `kycVerifications` table (PAN/Aadhaar/PLRS)

2. **Services**:
   - `server/services/registrationService.ts` (registration workflow)
   - `server/services/deedService.ts` (deed preparation)
   - `server/services/encumbranceService.ts` (encumbrance checks)
   - `server/services/valuationService.ts` (circle rate valuation)
   - `server/services/sroService.ts` (SRO slot management)

3. **Features**:
   - Deed type management (Sale, Gift, Mortgage, Lease, Partition, Exchange, POA, Will)
   - Circle rate-based valuation
   - Stamp duty and registration fee calculator
   - e-Stamp integration (adapter)
   - KYC verification (PAN/Aadhaar/PLRS)
   - Encumbrance certificate generation
   - SRO slot booking and rescheduling
   - Biometric/face capture hooks (where permitted)
   - Document scanning and archival
   - Certified copy services

4. **API Routes**:
   - `/api/property-management/properties/:id/registration` (create case)
   - `/api/property-management/registration/:id/valuation` (calculate valuation)
   - `/api/property-management/registration/:id/kyc` (verify KYC)
   - `/api/property-management/registration/:id/encumbrance` (generate certificate)
   - `/api/property-management/registration/:id/slot` (book, reschedule)
   - `/api/property-management/registration/:id/register` (final registration)

### Acceptance Criteria
- Registration cases created and tracked
- Valuation calculated using circle rates
- KYC verification functional
- Encumbrance certificates generated
- SRO slots booked and managed
- Registration workflow completed end-to-end

---

## Phase 9: Grievance & Legal Management
**Priority:** Medium  
**Dependencies:** Phase 1  
**Estimated Complexity:** Medium

### Objectives
- Implement grievance management system
- Track legal cases and court matters
- Manage SLA and compliance

### Deliverables
1. **Extended Schema**:
   - `grievances` table (complaint management)
   - `legalCases` table (court case tracking)
   - `caseHearings` table (hearing dates)
   - `courtOrders` table (order compliance)

2. **Services**:
   - `server/services/grievanceService.ts` (grievance management)
   - `server/services/legalCaseService.ts` (legal case tracking)

3. **Features**:
   - Omni-channel complaint intake (web, mobile, helpdesk)
   - SLA-based routing and escalation
   - Resolution orders and citizen feedback
   - Legal case tracking (case diary, hearing dates)
   - Order compliance tracking
   - Rating and feedback system

4. **API Routes**:
   - `/api/property-management/grievances` (create, list, assign)
   - `/api/property-management/grievances/:id/resolve` (resolve, escalate)
   - `/api/property-management/grievances/:id/feedback` (citizen feedback)
   - `/api/property-management/legal-cases` (create, list, track)
   - `/api/property-management/legal-cases/:id/hearings` (schedule, update)
   - `/api/property-management/legal-cases/:id/orders` (record, track compliance)

### Acceptance Criteria
- Grievances submitted and tracked
- SLA timers functional
- Legal cases tracked with hearings
- Order compliance monitored
- Citizen feedback captured

---

## Phase 10: Analytics, Dashboards & Reporting
**Priority:** Low (Can be developed in parallel)  
**Dependencies:** All previous phases (for data)  
**Estimated Complexity:** Medium

### Objectives
- Build comprehensive analytics dashboards
- Generate operational and financial reports
- Implement SLA monitoring

### Deliverables
1. **Services**:
   - `server/services/pmsAnalyticsService.ts` (analytics engine)
   - `server/services/pmsReportsService.ts` (report generation)

2. **Frontend Pages** (`client/src/pages/`):
   - `PMSDashboard.tsx` (officer dashboard)
   - `PMSAnalytics.tsx` (analytics views)
   - `PMSReports.tsx` (report generation)

3. **Features**:
   - Scheme funnel analytics
   - Draw statistics and allotment rates
   - Receivables and aging analysis
   - Recovery and amnesty impact reports
   - Service request SLA compliance
   - Registration volumes by deed type
   - Spatial heatmaps (grievances, dues, bottlenecks)
   - Exportable audit packs

4. **API Routes**:
   - `/api/property-management/analytics/schemes` (scheme analytics)
   - `/api/property-management/analytics/receivables` (financial analytics)
   - `/api/property-management/analytics/sla` (SLA compliance)
   - `/api/property-management/reports/operational` (operational reports)
   - `/api/property-management/reports/financial` (financial reports)
   - `/api/property-management/reports/spatial` (spatial heatmaps)

### Acceptance Criteria
- Dashboards display real-time data
- Reports generated and exportable
- SLA metrics tracked and displayed
- Spatial visualizations functional

---

## Phase 11: Best-in-Class Enhancements (Optional)
**Priority:** Low (Post-MVP)  
**Dependencies:** All core phases  
**Estimated Complexity:** High

### Objectives
- Implement advanced features from BRD Section 7
- Add AI-assist capabilities
- Enhance data quality and fraud controls

### Deliverables
1. **Data Quality & MDM**:
   - Duplicate detection (name + Aadhaar + phone + bank)
   - Fuzzy matching algorithms
   - Address normalization
   - IFSC/PAN validation
   - Health dashboards

2. **GIS & Spatial Intelligence**:
   - Parcel geometry storage (GeoJSON)
   - Zoning/serviceability overlays
   - Distance/buffer checks
   - Map context in certificates

3. **AI-Assist (opt-in)**:
   - Drafting assistant for letters/deeds
   - Smart triage for grievances
   - Natural-language search over policies

4. **Fraud & Compliance**:
   - Perceptual hashing for image dedupe
   - EXIF verification for photos
   - KYC/AML rule alerts
   - Benami/prohibited list checks

### Acceptance Criteria
- Data quality checks functional
- GIS overlays working
- AI-assist features operational (if enabled)
- Fraud detection alerts working

---

## Development Guidelines

### Code Organization
- All Property Management code under `/api/property-management/*` routes
- Services in `server/services/propertyManagement/` directory
- Frontend pages in `client/src/pages/propertyManagement/`
- Schema additions in `shared/schema.ts` with `pms_` prefix for new tables

### State Machines
Each entity should implement state machines as defined in BRD Section 10:
- Application: Draft → Submitted → Verified → InDraw → Selected/Rejected → Allotted → Closed
- Allotment: Draft → Issued → Accepted → Cancelled → Reinstated
- DemandNote: Draft → Issued → PartPaid → Paid → Overdue → WrittenOff
- ServiceRequest: New → UnderReview → Inspection → Approved/Rejected → Closed
- NOC: Draft → UnderReview → Approved → Issued → Superseded
- Certificate: Draft → Approved → Issued → Superseded
- RegistrationCase: Draft → Scheduled → UnderVerification → Registered → Certified
- Grievance: New → Assigned → InProgress → Resolved → Reopened/Closed

### Document Management
- All PDFs must include QR code to `/verify` endpoint
- SHA-256 content hash embedded in all documents
- Versioning and watermarks (DRAFT/VOID) supported
- Digital signatures/DSC integration hooks

### Integration Points
- Payment gateways: UPI/NetBanking/RTGS (adapter pattern)
- PFMS hooks (stub initially)
- e-Stamp integration (adapter)
- PAN/Aadhaar/PLRS verification (adapter)
- SMS/Email/WhatsApp (extend existing notification service)
- GIS tile servers (adapter)

### Testing Requirements
- Unit tests for all services
- Integration tests for happy paths
- E2E tests for citizen and officer journeys
- Security tests (authZ, IDOR, upload scanning)
- Performance tests (p95 < 2s requirement)

---

## Parallel Development Strategy

### Phase Grouping for Parallel Work
1. **Group A (Foundation)**: Phase 1 (must complete first)
2. **Group B (Core Features)**: Phases 2, 3, 4 (can work in parallel after Phase 1)
3. **Group C (Services)**: Phases 5, 6, 7 (can work in parallel after Group B dependencies)
4. **Group D (Supporting)**: Phases 8, 9 (can work in parallel)
5. **Group E (Analytics)**: Phase 10 (can work in parallel, needs data from other phases)
6. **Group F (Enhancements)**: Phase 11 (post-MVP, optional)

### Dependency Matrix
```
Phase 1 → Phase 2, 3, 4, 5, 6, 7, 8, 9
Phase 2 → Phase 3, 5
Phase 3 → Phase 4, 5, 6, 7, 8
Phase 4 → Phase 5
Phase 1-9 → Phase 10 (analytics needs data)
Phase 1-10 → Phase 11 (enhancements)
```

### Recommended Agent Assignment
- **Agent 1**: Phase 1 (Foundation) - Critical path
- **Agent 2**: Phase 2 (Schemes & Allotments)
- **Agent 3**: Phase 3 (Property Lifecycle)
- **Agent 4**: Phase 4 (Payments & Ledgers)
- **Agent 5**: Phase 5 (Citizen Portal) + Phase 6 (Construction)
- **Agent 6**: Phase 7 (Utilities) + Phase 8 (Registration)
- **Agent 7**: Phase 9 (Grievance) + Phase 10 (Analytics)
- **Agent 8**: Phase 11 (Enhancements) - Optional

---

## Acceptance Criteria Summary

Each phase must meet:
1. ✅ All database migrations successful
2. ✅ API endpoints functional and tested
3. ✅ State machines implemented correctly
4. ✅ Audit logs captured
5. ✅ Documents include QR codes and hashes
6. ✅ Role-based access control enforced
7. ✅ Unit tests passing (>80% coverage)
8. ✅ Integration tests passing
9. ✅ Performance targets met (p95 < 2s)
10. ✅ Documentation updated

---

## Notes

- All features should be developed under the "Property Management" header/module
- Reuse existing infrastructure: auth, notifications, document management, workflow engine
- Follow existing code patterns and conventions
- Maintain backward compatibility with LAMS features
- Use feature flags for optional enhancements (AI-assist, advanced GIS)

