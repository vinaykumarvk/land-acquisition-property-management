**Property Management System (PMS)**  
**Business Requirements Document (BRD)**  
**– Single-Service, Top-Class Edition –**

*Version: 1.0 • Date: November 11, 2025 • Owner: Project Steering Committee*

This BRD defines a single-service, full‑stack web application for the Property Management System (PMS) aligned to the PUDA RFP Scope of Work (Section 7). It consolidates estate/property lifecycle needs—scheme and allotments, citizen-facing services, post-allotment and ownership management, property registration, payments & ledgers, construction services, water/sewer connections, grievance and legal—into one deployable application. It expands baseline requirements with best‑in‑class capabilities for GIS, security, privacy, accessibility, analytics, AI‑assist, and verifiable documents.

# **1\. Executive Summary**

* Purpose: Deliver a unified, single‑service application to manage the end‑to‑end property lifecycle across PUDA & Regional Authorities.  
* Core Value: Transparent, citizen-first services with strong auditability, statutory compliance, and streamlined officer workflows.  
* Outcome: Faster allotments and transfers, error‑free ledgers and payments, tamper‑evident documents, and measurable SLA adherence.

# **2\. Vision & Success Criteria**

* Citizen-first, paperless-by-default, multilingual, WCAG‑aligned application.  
* End‑to‑end digitization: scheme → allotment → post‑allotment services → registration → connections → closure.  
* Single deployable app (monolith) with modular layers for maintainability.  
* Verifiable documents (QR \+ SHA‑256), robust RBAC, and comprehensive audit trails.  
* Operational excellence: p95 response \< 2s, ≥99.5% availability, RTO ≤ 2h / RPO ≤ 15m.

# **3\. Scope & Boundaries**

## **In Scope**

* Scheme Management & Allotments: e-draw, notifications, selection, allotment letters.  
* Property Lifecycle & Post-Allotment: transfers, conveyance deed generation, mortgage permissions, NOCs, ownership changes, legal documentation.  
* Citizen Services: property details, passbook, downloadable documents, self-service requests, status tracking.  
* Payments & Ledgers: installments/penalties, demand notes, receipts, refunds/amnesty, auto-recovery notices; integration with Accounts.  
* Construction Services: demarcation, DPC, Occupancy/Completion Certificates; layout modifications; deviations.  
* Utilities: water / sewerage connection requests, inspections, fees, and integration to metering/billing systems.  
* Property Registration: deed preparation, slot booking, valuation (circle rates), e‑Stamp, PAN/Aadhaar verification, encumbrance, PLRS integration, SRO workflow.  
* Grievance & Legal: complaint intake, SLA tracking, court case tracking, order compliance.  
* e‑Auction integration hooks: bidder onboarding, bid tracking, payments.  
* Document Management, Notifications (Email/SMS/WhatsApp), GIS linkage, analytics & reporting, admin configuration.

## **Out of Scope (V1)**

* Advanced ERP functions beyond ledgers/reconciliation defined herein.  
* Deep third‑party billing/ERP implementations (kept as adapters/stubs initially).  
* AR/VR visualizations beyond basic map overlay (kept as roadmap).

# **4\. Stakeholders & Roles**

* Citizen/Allottee/Applicant: apply, pay, track, download documents, request services.  
* Estate Officer/Case Officer: manage schemes, allotments, approvals, services, documents.  
* Accounts/Finance Officer: demand notes, receipts, refunds, reconciliation, amnesty schemes.  
* Legal Officer: opinions, notices, litigation tracking, order compliance.  
* SRO / Registration Staff: deed verification, valuation, slot management, final registration.  
* Technical/Inspection Staff: site inspections (demarcation/DPC/OC), water/sewerage checks.  
* Administrator: users/roles, templates, circle rates, fees, objection windows, sequences.  
* Auditor/Oversight: read-only access to audit logs, evidence packs, and compliance dashboards.

# **5\. End-to-End Journey Map**

1. Scheme creation → online applications → eligibility & e‑draw → allotment letter generation.  
2. Property account creation → demand schedule → installment payments → passbook & ledger updates.  
3. Post‑allotment services → transfer/mortgage/NOCs → legal scrutiny → document issuance.  
4. Construction services → demarcation → DPC → Completion/Occupancy Certificates.  
5. Utility connections → inspection → fees → integration to metering/billing.  
6. Registration (as applicable) → valuation & e‑stamp → slot booking → biometric/eKYC → encumbrance verification → deed registration.  
7. Grievances/legal matters → SLA tracking → resolution → orders & compliance.

# **6\. Functional Requirements (Detailed)**

## **6.1 Scheme Management & Allotments**

* Create schemes with inventory (plots/units), categories, eligibility criteria, documents.  
* Online applications with auto‑validation and document uploads.  
* Automated public draw (randomization \+ audit log) with real‑time notifications.  
* Generate allotment letters with numbering, QR code, and integrity hash.  
* Waitlist management, substitutions, and cancellations with refund/penalty rules.

## **6.2 Property Lifecycle & Post‑Allotment**

* Property master with lifecycle timeline; ownership history & traceability.  
* Transfers (sale/gift/inheritance), mortgage permissions, hypothecation management.  
* Conveyance deed generation (templates), issuance, and archival.  
* NOCs (sale/mortgage/possession/etc.) with configurable checklists and SLAs.  
* Modifications: area/usage/partner/firm changes with maker‑checker and fees.  
* Demand Notes: automated schedule (principal/interest/penalties/waivers), re‑calculation on events (reschedule, amnesty).  
* Refunds & adjustments with approvals, reason capture, and audit trail.

## **6.3 Citizen Services**

* Property ‘360’ view: owner(s), dues, payments, documents, status; downloadable passbook.  
* Self‑service requests: address change, duplicate documents, corrections, NOCs.  
* Status tracker by reference \+ OTP; multilingual UI and PDFs.  
* Guided forms with autosave; accessibility (keyboard navigation, high‑contrast).

## **6.4 Payments & Ledgers**

* Gateways: UPI/NetBanking/RTGS; PFMS hooks; idempotent callbacks.  
* Installments & Dues: auto‑calculated per schedule; late fee/interest with configurable formulas.  
* Demand Notes: number series; PDF with QR/hash; online payment links.  
* Receipts & Reconciliation: 3‑way reconciliation with Accounts; export to finance.  
* Refunds & Amnesty: workflows with maker‑checker; MIS on concessions & recoveries.

## **6.5 Construction & Certificates**

* Demarcation request → inspection scheduling → report → certificate issuance.  
* DPC & Occupancy/Completion Certificates with checklists, site photos, and officer e‑signs.  
* Deviation management: record deviations and levy fees/penalties; rectify workflow.

## **6.6 Water & Sewerage Connections**

* Application intake; inspection; fees; connection sanction; meter integration hooks.  
* Serviceability checks via GIS; SLA timers; renewal/closure flows.

## **6.7 Property Registration (Integrated)**

* Deed types: Sale, Gift, Mortgage, Lease, Partition, Exchange, POA, Will.  
* Valuation: circle rate based; stamp duty & registration fee calculator; e‑Stamp integration.  
* KYC: PAN/Aadhaar/PLRS linkages; encumbrance certificate generation.  
* SRO workflow: slot booking/rescheduling; biometric/face capture (where permitted); document scanning & archival.  
* Certified copy services; historical transaction search; real‑time status.

## **6.8 Grievance & Legal**

* Omni‑channel complaint intake (web, mobile, helpdesk).  
* SLA‑based routing & escalation; resolution orders; citizen feedback & rating.  
* Legal matter tracking: case diary, hearing dates, orders, compliance tracking.

## **6.9 Documents & DMS**

* Templates for allotment letters, NOCs, conveyance deeds, demand notes, receipts, certificates.  
* PDFs with QR to /verify endpoint and embedded SHA‑256 content hash.  
* Versioning, watermarks (DRAFT/VOID), digital signatures/DSC, and retention policies.  
* OCR for scanned deeds & legacy files; secure indexing for search.

## **6.10 Notifications & Comms**

* Email/SMS/WhatsApp adapters; citizen preferences & opt‑out.  
* Events: e‑draw results, allotment issue, demand notes, due reminders, approvals, inspections, certificates, registration slots, grievances, legal updates.  
* Delivery logs, retries, and templated content with merge fields.

# **7\. Best‑in‑Class Enhancements**

## **7.1 Data Quality & MDM**

* Duplicate detection on parties (name \+ Aadhaar \+ phone \+ bank), fuzzy matching.  
* Address normalization, IFSC validation, PAN checksum; ownership share totals \= 100%.  
* Health dashboards for stale data, missing KYC, and unresolved discrepancies.

## **7.2 GIS & Spatial Intelligence**

* Parcel geometry (GeoJSON) storage; overlays for zoning/serviceability.  
* Distance/buffer checks (e.g., school/hospital proximity constraints).  
* Map context in certificates (optional mini‑maps) and property 360 pages.

## **7.3 AI‑Assist (opt‑in)**

* Drafting assistant for letters, deeds, and notices using approved templates.  
* Smart triage: cluster grievances/legal matters; recommend precedents.  
* Natural‑language search over policies/SOPs with cited sources.

## **7.4 Fraud & Compliance Controls**

* Perceptual hashing for image dedupe; EXIF verification for site photos.  
* KYC/AML rule alerts (multiple high‑value transfers, frequent pledging).  
* Benami/prohibited list checks; legal hold flags; defensible deletion workflow.

## **7.5 Analytics & SLA**

* Dashboards: scheme funnel, demand vs. dues, receivables, refunds, amnesty impacts.  
* Aging & bottlenecks by stage; SLA breach predictors; exception drill‑downs.  
* Exportable audit packs with approvals, documents, and timelines.

# **8\. Non‑Functional Requirements & SLAs**

## **8.1 Performance & Reliability**

* p95 \< 2 seconds on officer dashboards; server‑side pagination; async PDF jobs for batches.  
* Availability ≥ 99.5% monthly; maintenance windows announced 72h in advance.  
* Backups: daily; DR targets RTO ≤ 2h, RPO ≤ 15m; restore drill documented.

## **8.2 Security & Privacy**

* RBAC; CSRF; rate limiting; strong password policy; optional OTP for citizens.  
* Field‑level encryption for PII/bank details; signed URLs for downloads; AV scan on uploads.  
* Consent capture; PII redaction in public documents; retention & legal hold policies.

## **8.3 Accessibility & Localization**

* WCAG 2.2 AA alignment; large fonts and high‑contrast themes; keyboard navigation.  
* Multilingual UI \+ PDFs (English, Punjabi, Hindi).

## **8.4 Observability & Audit**

* Structured logs with correlation ID; health/readiness; metrics on SLAs and queues.  
* AuditLog of CRUD and state transitions with before/after snapshots and actor/time/reason.

# **9\. Data Model (Relational, single DB)**

* User(id, name, email, phone, role, password\_hash, active)  
* Party(id, type, name, aadhaar?, pan?, address, phone, bank\_ifsc?, bank\_acct?)  
* Property(id, scheme\_id?, parcel\_no, address, area, land\_use, status, lat?, lng?)  
* Ownership(id, property\_id, party\_id, share\_pct)  
* Scheme(id, name, category, eligibility\_json, inventory\_json, status)  
* Application(id, scheme\_id, party\_id, docs\_json, status, score?, draw\_seq?)  
* Allotment(id, property\_id, party\_id, letter\_no, issue\_date, pdf\_path, status)  
* DemandNote(id, property\_id, party\_id, schedule\_json, amount, due\_date, status, pdf\_path)  
* Payment(id, demand\_id?, amount, mode, ref\_no, paid\_on, status, receipt\_pdf)  
* ServiceRequest(id, property\_id, type, data\_json, status, sla\_due, assigned\_to)  
* NOC(id, property\_id, type, checklist\_json, status, pdf\_path)  
* Modification(id, property\_id, kind, old\_json, new\_json, fee, status)  
* Inspection(id, property\_id, type, scheduled\_at, result\_json, photos\[\])  
* Certificate(id, property\_id, type, number, pdf\_path, status, issued\_at)  
* RegistrationCase(id, property\_id, deed\_type, valuation, stamp\_duty, slot\_at, status)  
* Encumbrance(id, property\_id, details\_json, cert\_pdf)  
* Grievance(id, ref\_no, party\_id?, property\_id?, category, text, status, sla\_due, resolution\_pdf?)  
* LegalCase(id, property\_id?, court, case\_no, hearings\_json, status)  
* Document(id, kind, entity\_type, entity\_id, file\_path, sha256, version, is\_public)  
* AuditLog(id, entity\_type, entity\_id, action, actor\_id, before\_json, after\_json, at)

# **10\. State Machines**

* Application: Draft → Submitted → Verified → InDraw → Selected/Rejected → Allotted → Closed  
* Allotment: Draft → Issued → Accepted → Cancelled → Reinstated  
* DemandNote: Draft → Issued → PartPaid → Paid → Overdue → WrittenOff  
* ServiceRequest: New → UnderReview → Inspection → Approved/Rejected → Closed  
* NOC: Draft → UnderReview → Approved → Issued → Superseded  
* Certificate: Draft → Approved → Issued → Superseded  
* RegistrationCase: Draft → Scheduled → UnderVerification → Registered → Certified  
* Grievance: New → Assigned → InProgress → Resolved → Reopened/Closed

# **11\. Pages & Routes (single app, indicative)**

## **Public/Citizen**

* Home, scheme list & apply, application tracker (ref \+ OTP).  
* Property search, passbook view, demand/receipt download, service requests.  
* Registration appointment booking & status, encumbrance certificate request.  
* Grievance submission and tracker.

## **Officer**

* Dashboard with SLA tiles and workload.  
* Scheme workspace (create, inventory, eligibility, draw, allotments).  
* Property 360; post‑allotment services; NOCs; inspections; certificates.  
* Demand notes & payments; refunds; amnesty controls; reconciliation exports.  
* Registration queue; valuation & e‑Stamp checks; biometric/slot management.  
* Grievance/legal console; reports & analytics; admin (users, templates, config).

# **12\. Integrations (pluggable adapters)**

* Payments/PFMS; SMS/Email/WhatsApp; e‑Stamp; PAN/Aadhaar/PLRS; banks; metering/billing; GIS tile servers.  
* e‑Gazette export packs (where required); SRO systems; document e‑sign/DSC provider.

# **13\. Business Rules & Validations (selected)**

* Eligibility checks for schemes (age/income/documents) must pass before draw.  
* Allotment letter issuance requires cleared application verification checks.  
* Ownership shares must total 100%; transfers require supporting documents and fees.  
* Demand Note numbering is unique; overdue logic computes interest and penalties.  
* Payments are idempotent; award/receipt status flips only on confirmed success.  
* Certificates/NOCs require checklists to be complete and inspections (as applicable).  
* Registration cannot be marked ‘Registered’ until KYC, valuation, duty payment, and encumbrance check pass.  
* All public PDFs include QR \+ hash and can be verified at /verify.

# **14\. Reports & Dashboards**

* Scheme funnel, draw statistics, allotment issuance and acceptance rates.  
* Receivables & aging, recovery & amnesty impact, refunds.  
* Service request aging and SLA compliance, inspection outcomes, certificate volumes.  
* Registration volumes by deed type, fees collected, appointment utilization.  
* Spatial heatmaps for grievances, dues, and service bottlenecks.

# **15\. Testing & Acceptance (AI‑dev ready)**

* Unit tests for models, calculators (valuation/interest), guards, and state transitions.  
* Integration tests for happy paths: apply→draw→allot; demand→payment→receipt; transfer→NOC→conveyance; inspection→certificate; registration flow.  
* E2E tests (Playwright/Cypress) for citizen and officer journeys with negative guards (e.g., registration blocked without duty).  
* Security tests: authZ denials, IDOR, upload scanning, QR/hash verification endpoint.  
* Performance tests on list endpoints, PDF batch generation, and reconciliation exports.

# **16\. Delivery Plan (single service)**

8. Phase 1: Auth/RBAC, audit, DB schema, templates (letters/NOCs/certificates), admin setup.  
9. Phase 2: Schemes & Allotments \+ public portal \+ notifications.  
10. Phase 3: Property 360 \+ post‑allotment services \+ demand/receipts \+ reconciliation exports.  
11. Phase 4: Construction services \+ inspections \+ certificates \+ water/sewerage connections.  
12. Phase 5: Registration integration (valuation, slot, KYC, encumbrance, e‑Stamp).  
13. Phase 6: Analytics dashboards \+ OCR \+ AI‑assist (feature‑flag) \+ GIS overlays.  
14. Phase 7: Security/performance hardening, accessibility audit, UAT, go‑live & O\&M.

# **17\. Admin & Configuration**

* Users/Roles; sequences for documents; fee tables; circle rates; objection windows.  
* Document templates (HTML→PDF) with localized labels and watermarks.  
* Notification templates and rate limits; GIS layer endpoints; payment gateway keys.  
* Feature flags for AI‑assist & advanced GIS; retention schedules and legal holds.

# **18\. Acceptance Criteria (Definition of Done)**

* End‑to‑end flows functional with seed data: apply→draw→allot→pay→services→certificates→registration.  
* Every state change audited with before/after snapshots; documents carry QR \+ hash and verify at /verify.  
* Dashboards operational; CSV/PDF exports; role permissions enforced.  
* Backups/restores validated; accessibility checks pass; p95 \< 2s on key pages.

# **19\. Appendix: Seed & Templates**

* Seed users (Admin, Estate Officer, Accounts, Legal, SRO, Inspector, Citizen).  
* 20 sample properties; 3 schemes; 50 applications; sample draw outcomes.  
* Circle rates, fee tables, duty/registration calculators; sample demand schedules.  
* Templates: Allotment Letter, Demand Note, Receipt, NOC variants, Demarcation/DPC/OC, Conveyance Deed, Encumbrance, Registration Appointment, Certified Copy.