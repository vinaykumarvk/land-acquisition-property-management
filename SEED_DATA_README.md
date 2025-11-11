# Seed Data Script for Property Management & Land Acquisition Modules

## Overview

This document describes the seed data script that checks existing database data and generates comprehensive test/demo data for both Property Management System (PMS) and Land Acquisition Management System (LAMS) modules.

## Script Location

`scripts/seed-data.ts`

## Usage

```bash
# Make sure DATABASE_URL is set in your environment
export DATABASE_URL="your_database_connection_string"

# Run the seed script
npm run seed
```

## What the Script Does

### 1. Data Count Check
The script first checks existing data counts for:
- **Users**: System users with various roles
- **LAMS Tables**: Parcels, Owners, SIA, Land Notifications, Awards, Possession
- **PMS Tables**: Parties, Schemes, Properties, Applications, Allotments, Demand Notes, Payments, Service Requests, Water Connections, Registration Cases

### 2. Smart Seeding
- Only seeds data if insufficient data is detected
- Skips existing records to avoid duplicates
- Creates relationships between entities (parcels-owners, properties-parties, etc.)

### 3. Seed Data Generated

#### Users (10 users)
- **Admin**: System administrator
- **LAMS Roles**: case_officer, legal_officer, finance_officer, auditor
- **PMS Roles**: estate_officer, accounts_officer, inspector, sro_officer
- **Citizens**: citizen1, citizen2

**Default Password**: `password123` (for all users)

#### Land Acquisition (LAMS) Data
- **15 Parcels**: Various villages, talukas, districts with different statuses
- **10 Owners**: Land owners with Aadhaar, PAN, bank details
- **1 SIA**: Social Impact Assessment record
- **1 Land Notification**: Section 11 notification
- **5 Awards**: Award orders linked to parcels and owners

#### Property Management (PMS) Data
- **10 Parties**: Property owners/allottees with complete details
- **3 Schemes**: Residential, Commercial, and Industrial schemes
- **20 Properties**: Properties linked to schemes with various statuses
- **15 Applications**: Scheme applications in various stages
- **8 Allotments**: Allotment letters for properties
- **10 Demand Notes**: Payment demands with schedules
- **5 Service Requests**: Various service request types
- **5 Water Connections**: Connection applications
- **3 Registration Cases**: Property registration workflows

## Data Relationships

The script creates realistic relationships:
- Parcels ↔ Owners (many-to-many with share percentages)
- Schemes → Properties → Ownership → Parties
- Properties → Applications → Allotments
- Properties → Demand Notes → Payments
- Properties → Service Requests
- Properties → Water/Sewerage Connections
- Properties → Registration Cases

## Output

The script provides:
- Color-coded console output showing progress
- Summary of data counts before and after seeding
- Login credentials for test users

## Example Output

```
═══════════════════════════════════════════════════════
  Seed Data Script for PMS & LAMS
═══════════════════════════════════════════════════════

Checking existing data counts...

  Users: 5
  Parcels (LAMS): 0
  Owners (LAMS): 0
  Schemes (PMS): 0
  Properties (PMS): 0
  ...

Insufficient data detected. Seeding database...

Seeding users...
  ✓ Created user admin (ID: 1)
  ✓ Created user case_officer (ID: 2)
  ...

Seeding Land Acquisition (LAMS) data...
  ✓ Created owner: Ram Singh
  ✓ Created parcel: PARCEL-0001
  ...

Seeding Property Management (PMS) data...
  ✓ Created party: Ravi Kumar
  ✓ Created scheme: Affordable Housing Scheme 2024
  ...

═══════════════════════════════════════════════════════
  Seed Data Generation Complete!
═══════════════════════════════════════════════════════

Summary:
  Users: 10
  LAMS - Parcels: 15, Owners: 10, SIA: 1
  PMS - Schemes: 3, Properties: 20, Parties: 10
  Applications: 15, Allotments: 8
  Demand Notes: 10, Service Requests: 5

Default login credentials:
  Username: admin / case_officer / estate_officer / citizen1
  Password: password123
```

## Testing & Demo Use Cases

This seed data enables:

### Property Management Testing
- ✅ Scheme creation and management
- ✅ Application submission and e-draw process
- ✅ Allotment letter generation
- ✅ Demand note creation and payment tracking
- ✅ Service request workflows
- ✅ Water/sewerage connection applications
- ✅ Property registration workflows

### Land Acquisition Testing
- ✅ Parcel management with GIS coordinates
- ✅ Owner management and relationships
- ✅ SIA (Social Impact Assessment) workflows
- ✅ Land notification (Section 11/19) processes
- ✅ Award order generation
- ✅ Possession tracking

## Notes

- The script is idempotent - it can be run multiple times safely
- Existing records are detected and skipped
- All generated data uses realistic Indian addresses, phone numbers, and identifiers
- GIS coordinates are set for Punjab region (Mohali/Kharar area)
- Financial amounts are randomized within realistic ranges

## Troubleshooting

### Error: DATABASE_URL must be set
Make sure you have set the DATABASE_URL environment variable:
```bash
export DATABASE_URL="postgresql://user:password@host:port/database"
```

### Error: Table does not exist
Make sure you have run database migrations:
```bash
npm run db:push
```

### Error: Foreign key constraint violation
This usually means related data is missing. The script handles this by creating data in the correct order (users → owners/parties → parcels/properties → relationships).

## Next Steps

After running the seed script:
1. Verify data in the database using your admin interface
2. Test various workflows using the seeded data
3. Use the test user credentials to log in and explore features
4. Customize seed data as needed for specific test scenarios

