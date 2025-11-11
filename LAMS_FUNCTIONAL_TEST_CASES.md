# LAMS Functional Test Cases

## Test Plan Overview
This document outlines comprehensive functional test cases for the Land Acquisition Management System (LAMS). Tests are organized by module and cover all major workflows.

## Test Environment Setup
- **Base URL**: http://localhost:5000
- **Authentication**: Session-based (login required for officer routes)
- **Test Data**: Will be created during test execution

---

## Module 1: SIA (Social Impact Assessment) Management

### TC-SIA-001: Create Draft SIA
**Objective**: Verify that a Case Officer can create a new SIA in draft status.

**Steps**:
1. Login as Case Officer (case_officer role)
2. Navigate to `/lams/sia`
3. Fill in SIA form:
   - Title: "Test SIA - Sector 21 Acquisition"
   - Description: "Acquisition of parcels in Sector 21 for infrastructure development"
   - Start Date: Future date (e.g., tomorrow)
   - End Date: Date after start date (e.g., 30 days from start)
4. Click "Create SIA"
5. Verify SIA appears in "Existing SIAs" list with status "draft"
6. Verify notice number is auto-generated (format: SIA-YYYY-XXX)

**Expected Result**: SIA created successfully with draft status and auto-generated notice number.

---

### TC-SIA-002: Publish SIA
**Objective**: Verify that a draft SIA can be published to make it public.

**Prerequisites**: TC-SIA-001 completed

**Steps**:
1. Find the draft SIA created in TC-SIA-001
2. Click "Publish" button
3. Verify status changes to "published"
4. Verify SIA is accessible via public portal at `/public/sia`

**Expected Result**: SIA status changes to "published" and becomes publicly accessible.

---

### TC-SIA-003: Schedule Hearing
**Objective**: Verify that a hearing can be scheduled for a published SIA.

**Prerequisites**: TC-SIA-002 completed

**Steps**:
1. Navigate to `/lams/sia`
2. Select the published SIA from dropdown
3. Fill hearing form:
   - Date: Future datetime
   - Venue: "Community Hall, Sector 21"
   - Agenda: "Public hearing for land acquisition"
4. Click "Schedule Hearing"
5. Verify hearing appears in "Scheduled Hearings" section

**Expected Result**: Hearing scheduled successfully and displayed in hearings list.

---

### TC-SIA-004: Complete Hearing
**Objective**: Verify that a scheduled hearing can be marked as completed with minutes.

**Prerequisites**: TC-SIA-003 completed

**Steps**:
1. Select the SIA with scheduled hearing
2. Select the hearing from "Complete Hearing" dropdown
3. Upload a minutes file (PDF/DOC)
4. Enter attendees: "John Doe, Jane Smith, Officer ABC"
5. Click "Mark Completed"
6. Verify hearing status shows "Minutes uploaded"

**Expected Result**: Hearing marked as completed with minutes file attached.

---

### TC-SIA-005: Generate SIA Report
**Objective**: Verify that an SIA report can be generated after hearing completion.

**Prerequisites**: TC-SIA-004 completed

**Steps**:
1. Find SIA with completed hearing (status should be "hearing_completed")
2. Click "Generate Report" button
3. Verify status changes to "report_generated"
4. Verify report PDF is generated (if applicable)

**Expected Result**: SIA report generated successfully, status updated.

---

### TC-SIA-006: Close SIA
**Objective**: Verify that an SIA can be closed after report generation.

**Prerequisites**: TC-SIA-005 completed

**Steps**:
1. Find SIA with status "report_generated"
2. Click "Close SIA" button
3. Verify status changes to "closed"

**Expected Result**: SIA closed successfully.

---

### TC-SIA-007: Update Draft SIA
**Objective**: Verify that a draft SIA can be updated.

**Prerequisites**: TC-SIA-001 completed

**Steps**:
1. Create a new draft SIA
2. Update title and description
3. Save changes
4. Verify changes are reflected

**Expected Result**: Draft SIA updated successfully.

---

### TC-SIA-008: Validation - End Date Before Start Date
**Objective**: Verify that validation prevents end date before start date.

**Steps**:
1. Create SIA with end date before start date
2. Attempt to save

**Expected Result**: Error message displayed, SIA not created.

---

## Module 2: Notifications (Section 11 & 19)

### TC-NOT-001: Create Section 11 Notification
**Objective**: Verify that a Section 11 (preliminary) notification can be created.

**Prerequisites**: At least one parcel exists in system

**Steps**:
1. Navigate to `/lams/notifications`
2. Fill notification form:
   - Type: "Section 11 - Preliminary"
   - Title: "Section 11 Notification - Sector 21"
   - Body: "Preliminary notification for acquisition of parcels..."
   - Select at least one parcel from checklist
   - (Optional) Link to SIA
3. Click "Create Notification"
4. Verify notification appears in list with status "draft"

**Expected Result**: Section 11 notification created in draft status.

---

### TC-NOT-002: Submit Notification for Legal Review
**Objective**: Verify that a draft notification can be submitted for legal review.

**Prerequisites**: TC-NOT-001 completed

**Steps**:
1. Find draft notification from TC-NOT-001
2. Click "Submit for Legal Review"
3. Verify status changes to "legal_review"

**Expected Result**: Notification status updated to "legal_review".

---

### TC-NOT-003: Legal Officer Approves Notification
**Objective**: Verify that a Legal Officer can approve a notification in legal review.

**Prerequisites**: TC-NOT-002 completed, login as legal_officer

**Steps**:
1. Login as Legal Officer
2. Navigate to `/lams/notifications`
3. Find notification in "legal_review" status
4. Click "Approve" button
5. Verify status changes to "approved"

**Expected Result**: Notification approved by legal officer, status updated.

---

### TC-NOT-004: Publish Notification
**Objective**: Verify that an approved notification can be published.

**Prerequisites**: TC-NOT-003 completed

**Steps**:
1. Find approved notification
2. Set publish date/time
3. Select notification channels (Email, SMS, WhatsApp)
4. Click "Publish" button
5. Verify status changes to "published"
6. Verify notification is accessible via public portal

**Expected Result**: Notification published successfully and publicly accessible.

---

### TC-NOT-005: Preview Notification PDF
**Objective**: Verify that notification PDF preview can be generated.

**Prerequisites**: TC-NOT-003 completed

**Steps**:
1. Find approved notification
2. Set publish date
3. Click "Preview PDF" button
4. Verify PDF opens in new tab

**Expected Result**: PDF preview generated and displayed.

---

### TC-NOT-006: Create Section 19 Notification
**Objective**: Verify that a Section 19 (final) notification can be created.

**Steps**:
1. Follow TC-NOT-001 steps but select "Section 19 - Final" type
2. Verify notification created with type "sec19"

**Expected Result**: Section 19 notification created successfully.

---

### TC-NOT-007: Validation - No Parcels Selected
**Objective**: Verify that notification cannot be created without selecting parcels.

**Steps**:
1. Fill notification form without selecting any parcels
2. Attempt to create notification

**Expected Result**: Error message displayed, notification not created.

---

## Module 3: Objections

### TC-OBJ-001: Submit Public Objection
**Objective**: Verify that a citizen can submit an objection to a published notification.

**Prerequisites**: TC-NOT-004 completed (published notification)

**Steps**:
1. Navigate to public portal `/public/notifications`
2. Find published notification
3. Click "Submit Objection"
4. Fill objection form:
   - Name: "Test Citizen"
   - Phone: "9876543210"
   - Text: "I object to this acquisition because..."
   - (Optional) Upload attachment
5. Submit objection
6. Verify objection is submitted

**Expected Result**: Objection submitted successfully.

---

### TC-OBJ-002: View Objections (Officer)
**Objective**: Verify that officers can view submitted objections.

**Prerequisites**: TC-OBJ-001 completed

**Steps**:
1. Login as Case Officer
2. Navigate to `/lams/objections`
3. Verify objection from TC-OBJ-001 appears in list
4. Verify objection details are displayed (name, phone, text, attachments)

**Expected Result**: Objections list displays all submitted objections with details.

---

### TC-OBJ-003: Resolve Objection
**Objective**: Verify that an officer can resolve an objection.

**Prerequisites**: TC-OBJ-002 completed

**Steps**:
1. Find pending objection
2. Enter resolution text: "Objection reviewed and addressed..."
3. Select status: "Resolved"
4. Click "Update"
5. Verify status changes to "resolved"

**Expected Result**: Objection resolved successfully.

---

### TC-OBJ-004: Reject Objection
**Objective**: Verify that an officer can reject an objection.

**Prerequisites**: TC-OBJ-002 completed

**Steps**:
1. Find pending objection
2. Enter resolution text: "Objection rejected due to..."
3. Select status: "Rejected"
4. Click "Update"
5. Verify status changes to "rejected"

**Expected Result**: Objection rejected successfully.

---

### TC-OBJ-005: Validation - Resolution Required
**Objective**: Verify that resolution text is required before updating objection.

**Steps**:
1. Find pending objection
2. Select status without entering resolution text
3. Attempt to update

**Expected Result**: Error message displayed, objection not updated.

---

## Module 4: Compensation & Awards

### TC-COMP-001: Create Parcel Valuation
**Objective**: Verify that a valuation can be created for a parcel.

**Prerequisites**: At least one parcel exists

**Steps**:
1. Navigate to `/lams/compensation`
2. Fill valuation form:
   - Parcel: Select a parcel
   - Basis: "Circle Rate"
   - Circle Rate: "5000" (per sq. m)
   - Multipliers: `{"landUse": 1.2}` (optional JSON)
   - Justification Notes: "Based on current market rates"
3. Click "Record Valuation"
4. Verify valuation appears in "Recent Valuations" list

**Expected Result**: Valuation created successfully with computed amount.

---

### TC-COMP-002: Draft Compensation Award
**Objective**: Verify that a compensation award can be drafted.

**Prerequisites**: TC-COMP-001 completed, at least one owner exists

**Steps**:
1. Fill award form:
   - Parcel: Select parcel with valuation
   - Owner: Select an owner
   - Mode: "Cash"
2. Click "Draft Award"
3. Verify award appears in "Award Pipeline" with status "draft"

**Expected Result**: Award drafted successfully.

---

### TC-COMP-003: Submit Award for Finance Review
**Objective**: Verify that an award can be submitted for finance review.

**Prerequisites**: TC-COMP-002 completed

**Steps**:
1. Find draft award
2. Submit for finance review (if applicable)
3. Verify status changes

**Expected Result**: Award submitted for finance review.

---

### TC-COMP-004: Approve Award
**Objective**: Verify that a Finance Officer can approve an award.

**Prerequisites**: TC-COMP-003 completed, login as finance_officer

**Steps**:
1. Login as Finance Officer
2. Find award in finance review
3. Approve award
4. Verify status changes to "award_issued"

**Expected Result**: Award approved and issued.

---

### TC-COMP-005: Record Payment
**Objective**: Verify that a payment can be recorded for an award.

**Prerequisites**: TC-COMP-004 completed

**Steps**:
1. Find issued award
2. Record payment:
   - Amount: Match award amount
   - Mode: "RTGS"
   - Reference: "TXN123456"
   - Date: Today
3. Verify payment recorded

**Expected Result**: Payment recorded successfully.

---

### TC-COMP-006: Validation - Invalid JSON Multipliers
**Objective**: Verify that invalid JSON in multipliers field is rejected.

**Steps**:
1. Enter invalid JSON in multipliers field: `{invalid json}`
2. Attempt to create valuation

**Expected Result**: Error message displayed, valuation not created.

---

## Module 5: Possession

### TC-POS-001: Schedule Possession
**Objective**: Verify that a possession can be scheduled for a parcel.

**Prerequisites**: At least one parcel exists

**Steps**:
1. Navigate to `/lams/possession`
2. Fill schedule form:
   - Parcel: Select a parcel
   - Schedule Date: Future datetime
   - Remarks: "Scheduled for possession"
3. Click "Schedule"
4. Verify possession appears in "Possession Workflow" with status "scheduled"

**Expected Result**: Possession scheduled successfully.

---

### TC-POS-002: Start Possession
**Objective**: Verify that a scheduled possession can be started.

**Prerequisites**: TC-POS-001 completed

**Steps**:
1. Find scheduled possession
2. Click "Start" button
3. Verify status changes to "in_progress"

**Expected Result**: Possession started successfully.

---

### TC-POS-003: Upload Evidence with GPS
**Objective**: Verify that geo-tagged evidence can be uploaded for possession.

**Prerequisites**: TC-POS-002 completed

**Steps**:
1. Find possession in "in_progress" status
2. Upload a photo (with or without EXIF GPS data)
3. If photo has EXIF GPS:
   - Verify coordinates auto-filled
   - Verify coordinate source shows "Photo metadata"
4. If no EXIF GPS:
   - Enter latitude and longitude manually OR
   - Click "Use Current Location" to get device GPS
5. Add additional photos (up to 3)
6. Click "Upload Evidence"
7. Verify evidence appears in "Captured Evidence" section

**Expected Result**: Evidence uploaded with GPS coordinates and hash.

---

### TC-POS-004: Generate Possession Certificate
**Objective**: Verify that a possession certificate can be generated.

**Prerequisites**: TC-POS-003 completed (evidence uploaded)

**Steps**:
1. Find possession with evidence
2. Click "Generate Certificate"
3. Verify certificate PDF generated (if applicable)
4. Verify status updated

**Expected Result**: Possession certificate generated successfully.

---

### TC-POS-005: Update Registry
**Objective**: Verify that registry can be updated after certificate generation.

**Prerequisites**: TC-POS-004 completed

**Steps**:
1. Find possession with certificate
2. Click "Update Registry"
3. Verify registry updated

**Expected Result**: Registry updated successfully.

---

### TC-POS-006: Close Possession Case
**Objective**: Verify that a possession case can be closed.

**Prerequisites**: TC-POS-005 completed

**Steps**:
1. Find possession case
2. Click "Close Case"
3. Verify status changes to "closed"

**Expected Result**: Possession case closed successfully.

---

### TC-POS-007: Validation - Evidence Required
**Objective**: Verify that evidence is required before generating certificate.

**Steps**:
1. Start a possession without uploading evidence
2. Attempt to generate certificate

**Expected Result**: Error message displayed, certificate not generated.

---

## Module 6: Dashboard & Analytics

### TC-DASH-001: View LAMS Dashboard
**Objective**: Verify that LAMS dashboard displays correct statistics.

**Steps**:
1. Login as Case Officer
2. Navigate to `/lams`
3. Verify dashboard displays:
   - Active SIAs count
   - Active Notifications count
   - Pending Objections count
4. Verify latest SIAs and notifications are listed

**Expected Result**: Dashboard displays accurate statistics and recent items.

---

### TC-DASH-002: Navigation Links
**Objective**: Verify that all navigation links work correctly.

**Steps**:
1. From dashboard, click each navigation button:
   - "Manage SIAs" → Should navigate to `/lams/sia`
   - "Manage Notifications" → Should navigate to `/lams/notifications`
2. Verify pages load correctly

**Expected Result**: All navigation links work correctly.

---

## Module 7: Public Portal

### TC-PUB-001: View Public SIA List
**Objective**: Verify that public can view published SIAs.

**Steps**:
1. Navigate to `/public/sia` (no login required)
2. Verify published SIAs are listed
3. Verify draft SIAs are NOT listed

**Expected Result**: Only published SIAs are visible to public.

---

### TC-PUB-002: View SIA Details
**Objective**: Verify that public can view SIA details.

**Steps**:
1. Click on a published SIA from list
2. Verify SIA details are displayed (title, description, dates)
3. Verify feedback submission form is available

**Expected Result**: SIA details displayed correctly.

---

### TC-PUB-003: Submit SIA Feedback
**Objective**: Verify that public can submit feedback on published SIAs.

**Steps**:
1. Navigate to SIA detail page
2. Fill feedback form:
   - Name: "Test Citizen"
   - Email: "test@example.com"
   - Phone: "9876543210"
   - Feedback: "I have concerns about..."
   - (Optional) Upload attachment
3. Submit feedback
4. Verify feedback submitted

**Expected Result**: Feedback submitted successfully.

---

### TC-PUB-004: View Public Notifications
**Objective**: Verify that public can view published notifications.

**Steps**:
1. Navigate to `/public/notifications` (no login required)
2. Verify published notifications are listed
3. Verify draft/legal_review notifications are NOT listed

**Expected Result**: Only published notifications are visible to public.

---

## Module 8: Error Handling & Edge Cases

### TC-ERR-001: Unauthorized Access
**Objective**: Verify that unauthorized users cannot access officer routes.

**Steps**:
1. Without logging in, attempt to access `/lams/sia`
2. Verify redirect to login page

**Expected Result**: Unauthorized access blocked, redirect to login.

---

### TC-ERR-002: Invalid Data Submission
**Objective**: Verify that invalid data is rejected with appropriate errors.

**Steps**:
1. Attempt to create SIA with invalid dates
2. Attempt to create notification without required fields
3. Verify error messages displayed

**Expected Result**: Appropriate error messages displayed for invalid data.

---

### TC-ERR-003: State Transition Validation
**Objective**: Verify that invalid state transitions are prevented.

**Steps**:
1. Attempt to publish SIA directly from draft (if workflow requires intermediate steps)
2. Attempt to close SIA without completing required steps
3. Verify appropriate errors

**Expected Result**: Invalid state transitions prevented.

---

## Test Execution Summary

### Test Coverage
- **SIA Management**: 8 test cases
- **Notifications**: 7 test cases
- **Objections**: 5 test cases
- **Compensation**: 6 test cases
- **Possession**: 7 test cases
- **Dashboard**: 2 test cases
- **Public Portal**: 4 test cases
- **Error Handling**: 3 test cases

**Total Test Cases**: 42

### Priority
- **P0 (Critical)**: TC-SIA-001, TC-NOT-001, TC-OBJ-001, TC-COMP-001, TC-POS-001
- **P1 (High)**: TC-SIA-002, TC-NOT-004, TC-OBJ-003, TC-COMP-002, TC-POS-003
- **P2 (Medium)**: All other test cases

### Test Data Requirements
- At least 3 parcels
- At least 2 owners
- At least 1 SIA in each status
- At least 1 notification in each status
- Test user accounts for each role (case_officer, legal_officer, finance_officer, admin)

