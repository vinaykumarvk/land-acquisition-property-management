# LAMS Functional Test Results

**Test Execution Date**: Wed Nov 12 03:57:48 IST 2025
**Base URL**: http://localhost:5000

## Test Summary

| Module | Passed | Failed | Skipped | Total |
|--------|--------|--------|---------|-------|
| TC-SIA-001 | Create Draft SIA | PASS | SIA created with ID: 13 |
| TC-SIA-002 | Publish SIA | PASS | SIA published successfully |
| TC-SIA-003 | Schedule Hearing | PASS | Hearing scheduled with ID: 11 |
| TC-NOT-001 | Create Section 11 Notification | PASS | Notification created with ID: 14 |
| TC-NOT-002 | Submit for Legal Review | PASS | Notification submitted for legal review |
| TC-NOT-003 | Legal Officer Approves | PASS | Notification approved (status: draft) |
| TC-OBJ-001 | Submit Public Objection | FAIL | Failed to submit: {"message":"Objections can only be submitted for published notifications"} (Notification status: draft) |
| TC-OBJ-002 | View Objections | PASS | Objections retrieved successfully |
| TC-OBJ-003 | Resolve Objection | SKIP | No objection ID available |
| TC-COMP-001 | Create Parcel Valuation | PASS | Valuation created with ID: 13 |
| TC-COMP-002 | Draft Compensation Award | PASS | Award drafted with ID: 12 |
