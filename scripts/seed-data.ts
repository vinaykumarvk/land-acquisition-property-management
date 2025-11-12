/**
 * Seed Data Script for Property Management and Land Acquisition Modules
 * 
 * This script:
 * 1. Checks existing data counts in the database
 * 2. Generates comprehensive seed data for testing and demos
 * 3. Creates users with appropriate roles
 * 4. Populates LAMS and PMS tables with realistic test data
 */

import 'dotenv/config';
import { db, pool } from '../server/db';
import {
  users,
  parcels,
  owners,
  parcelOwners,
  sia,
  siaFeedback,
  siaHearings,
  landNotifications,
  notificationParcels,
  awards,
  possession,
  parties,
  schemes,
  properties,
  ownership,
  applications,
  allotments,
  demandNotes,
  pmsPayments,
  receipts,
  serviceRequests,
  waterConnections,
  sewerageConnections,
  inspections,
  registrationCases,
} from '../shared/schema';
import { eq, sql, count, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

interface DataCounts {
  users: number;
  // LAMS
  parcels: number;
  owners: number;
  sia: number;
  landNotifications: number;
  awards: number;
  possession: number;
  // PMS
  parties: number;
  schemes: number;
  properties: number;
  applications: number;
  allotments: number;
  demandNotes: number;
  payments: number;
  serviceRequests: number;
  waterConnections: number;
  registrationCases: number;
}

/**
 * Check existing data counts
 */
async function checkDataCounts(): Promise<DataCounts> {
  console.log(`${colors.blue}${colors.bright}Checking existing data counts...${colors.reset}\n`);

  const counts: DataCounts = {
    users: 0,
    parcels: 0,
    owners: 0,
    sia: 0,
    landNotifications: 0,
    awards: 0,
    possession: 0,
    parties: 0,
    schemes: 0,
    properties: 0,
    applications: 0,
    allotments: 0,
    demandNotes: 0,
    payments: 0,
    serviceRequests: 0,
    waterConnections: 0,
    registrationCases: 0,
  };

  try {
    // Check users
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    counts.users = Number(userCount.count);
    console.log(`  Users: ${counts.users}`);

    // Check LAMS tables
    const [parcelCount] = await db.select({ count: sql<number>`count(*)` }).from(parcels);
    counts.parcels = Number(parcelCount.count);
    console.log(`  Parcels (LAMS): ${counts.parcels}`);

    const [ownerCount] = await db.select({ count: sql<number>`count(*)` }).from(owners);
    counts.owners = Number(ownerCount.count);
    console.log(`  Owners (LAMS): ${counts.owners}`);

    const [siaCount] = await db.select({ count: sql<number>`count(*)` }).from(sia);
    counts.sia = Number(siaCount.count);
    console.log(`  SIA (LAMS): ${counts.sia}`);

    const [notifCount] = await db.select({ count: sql<number>`count(*)` }).from(landNotifications);
    counts.landNotifications = Number(notifCount.count);
    console.log(`  Land Notifications (LAMS): ${counts.landNotifications}`);

    const [awardCount] = await db.select({ count: sql<number>`count(*)` }).from(awards);
    counts.awards = Number(awardCount.count);
    console.log(`  Awards (LAMS): ${counts.awards}`);

    const [possessionCount] = await db.select({ count: sql<number>`count(*)` }).from(possession);
    counts.possession = Number(possessionCount.count);
    console.log(`  Possession (LAMS): ${counts.possession}`);

    // Check PMS tables
    const [partyCount] = await db.select({ count: sql<number>`count(*)` }).from(parties);
    counts.parties = Number(partyCount.count);
    console.log(`  Parties (PMS): ${counts.parties}`);

    const [schemeCount] = await db.select({ count: sql<number>`count(*)` }).from(schemes);
    counts.schemes = Number(schemeCount.count);
    console.log(`  Schemes (PMS): ${counts.schemes}`);

    const [propertyCount] = await db.select({ count: sql<number>`count(*)` }).from(properties);
    counts.properties = Number(propertyCount.count);
    console.log(`  Properties (PMS): ${counts.properties}`);

    const [appCount] = await db.select({ count: sql<number>`count(*)` }).from(applications);
    counts.applications = Number(appCount.count);
    console.log(`  Applications (PMS): ${counts.applications}`);

    const [allotmentCount] = await db.select({ count: sql<number>`count(*)` }).from(allotments);
    counts.allotments = Number(allotmentCount.count);
    console.log(`  Allotments (PMS): ${counts.allotments}`);

    const [demandCount] = await db.select({ count: sql<number>`count(*)` }).from(demandNotes);
    counts.demandNotes = Number(demandCount.count);
    console.log(`  Demand Notes (PMS): ${counts.demandNotes}`);

    const [paymentCount] = await db.select({ count: sql<number>`count(*)` }).from(pmsPayments);
    counts.payments = Number(paymentCount.count);
    console.log(`  Payments (PMS): ${counts.payments}`);

    const [srCount] = await db.select({ count: sql<number>`count(*)` }).from(serviceRequests);
    counts.serviceRequests = Number(srCount.count);
    console.log(`  Service Requests (PMS): ${counts.serviceRequests}`);

    const [waterCount] = await db.select({ count: sql<number>`count(*)` }).from(waterConnections);
    counts.waterConnections = Number(waterCount.count);
    console.log(`  Water Connections (PMS): ${counts.waterConnections}`);

    const [regCount] = await db.select({ count: sql<number>`count(*)` }).from(registrationCases);
    counts.registrationCases = Number(regCount.count);
    console.log(`  Registration Cases (PMS): ${counts.registrationCases}`);

    console.log('');
  } catch (error: any) {
    console.error(`${colors.red}Error checking data counts:${colors.reset}`, error.message);
    // Continue anyway - tables might not exist yet
  }

  return counts;
}

/**
 * Generate seed users with appropriate roles
 */
async function seedUsers(): Promise<Map<string, number>> {
  console.log(`${colors.blue}${colors.bright}Seeding users...${colors.reset}`);

  const userMap = new Map<string, number>();
  const passwordHash = await bcrypt.hash('password123', 10);

  const seedUsers = [
    // LAMS roles
    { username: 'admin', email: 'admin@puda.gov.in', firstName: 'System', lastName: 'Administrator', role: 'admin', department: 'IT' },
    { username: 'case_officer', email: 'caseofficer@puda.gov.in', firstName: 'Rajesh', lastName: 'Kumar', role: 'case_officer', department: 'Land Acquisition' },
    { username: 'legal_officer', email: 'legal@puda.gov.in', firstName: 'Priya', lastName: 'Sharma', role: 'legal_officer', department: 'Legal' },
    { username: 'finance_officer', email: 'finance@puda.gov.in', firstName: 'Amit', lastName: 'Singh', role: 'finance_officer', department: 'Finance' },
    { username: 'auditor', email: 'auditor@puda.gov.in', firstName: 'Deepak', lastName: 'Verma', role: 'auditor', department: 'Audit' },
    
    // PMS roles
    { username: 'estate_officer', email: 'estate@puda.gov.in', firstName: 'Vikram', lastName: 'Malhotra', role: 'case_officer', department: 'Estate' },
    { username: 'accounts_officer', email: 'accounts@puda.gov.in', firstName: 'Sunita', lastName: 'Patel', role: 'finance_officer', department: 'Accounts' },
    { username: 'inspector', email: 'inspector@puda.gov.in', firstName: 'Mohan', lastName: 'Lal', role: 'case_officer', department: 'Inspection' },
    { username: 'sro_officer', email: 'sro@puda.gov.in', firstName: 'Kiran', lastName: 'Reddy', role: 'case_officer', department: 'Registration' },
    
    // Citizens
    { username: 'citizen1', email: 'citizen1@example.com', firstName: 'Ravi', lastName: 'Kumar', role: 'citizen', phone: '+919876543210' },
    { username: 'citizen2', email: 'citizen2@example.com', firstName: 'Anita', lastName: 'Devi', role: 'citizen', phone: '+919876543211' },
  ];

  for (const userData of seedUsers) {
    try {
      // Check if user exists
      const [existing] = await db.select().from(users).where(eq(users.username, userData.username)).limit(1);
      
      if (existing) {
        userMap.set(userData.username, existing.id);
        console.log(`  ✓ User ${userData.username} already exists (ID: ${existing.id})`);
      } else {
        const [newUser] = await db.insert(users).values({
          ...userData,
          password: passwordHash,
          isActive: true,
        }).returning();
        userMap.set(userData.username, newUser.id);
        console.log(`  ✓ Created user ${userData.username} (ID: ${newUser.id})`);
      }
    } catch (error: any) {
      console.error(`  ✗ Error creating user ${userData.username}:`, error.message);
    }
  }

  console.log('');
  return userMap;
}

/**
 * Seed LAMS data
 */
async function seedLAMS(userMap: Map<string, number>): Promise<void> {
  console.log(`${colors.blue}${colors.bright}Seeding Land Acquisition (LAMS) data...${colors.reset}`);

  const caseOfficerId = userMap.get('case_officer') || 1;
  const legalOfficerId = userMap.get('legal_officer') || 1;

  try {
    // Seed owners
    const ownerNames = [
      'Ram Singh', 'Shyam Lal', 'Gita Devi', 'Mohan Das', 'Sita Kumari',
      'Rajesh Kumar', 'Priya Sharma', 'Amit Patel', 'Sunita Verma', 'Vikram Malhotra'
    ];
    const ownerIds: number[] = [];

    for (let i = 0; i < ownerNames.length; i++) {
      const name = ownerNames[i];
      const [existing] = await db.select().from(owners).where(eq(owners.name, name)).limit(1);
      
      if (existing) {
        ownerIds.push(existing.id);
      } else {
        const [owner] = await db.insert(owners).values({
          name,
          address: `${i + 1}, Sector ${i + 1}, Mohali, Punjab`,
          phone: `+9198765432${i.toString().padStart(2, '0')}`,
          email: `owner${i + 1}@example.com`,
          aadhaar: `1234${i.toString().padStart(8, '0')}`,
          pan: `ABCDE${i.toString().padStart(4, '0')}F`,
          bankIfsc: 'PUNB0012345',
          bankAcct: `123456789${i.toString().padStart(2, '0')}`,
        }).returning();
        ownerIds.push(owner.id);
        console.log(`  ✓ Created owner: ${name}`);
      }
    }

    // Seed parcels
    const villages = ['Kharar', 'Mohali', 'Zirakpur', 'Banur', 'Kurali'];
    const talukas = ['Kharar', 'Mohali', 'Dera Bassi'];
    const districts = ['SAS Nagar', 'Mohali'];
    const parcelIds: number[] = [];

    for (let i = 0; i < 15; i++) {
      const village = villages[i % villages.length];
      const taluka = talukas[i % talukas.length];
      const district = districts[i % districts.length];
      const parcelNo = `PARCEL-${String(i + 1).padStart(4, '0')}`;

      const [existing] = await db.select().from(parcels).where(eq(parcels.parcelNo, parcelNo)).limit(1);
      
      if (existing) {
        parcelIds.push(existing.id);
      } else {
        const [parcel] = await db.insert(parcels).values({
          parcelNo,
          village,
          taluka,
          district,
          areaSqM: (500 + Math.random() * 2000).toFixed(2),
          landUse: ['agricultural', 'residential', 'commercial'][i % 3],
          status: ['unaffected', 'under_acq', 'awarded', 'possessed'][Math.floor(i / 4)],
          lat: (30.7 + Math.random() * 0.1).toFixed(7),
          lng: (76.7 + Math.random() * 0.1).toFixed(7),
        }).returning();
        parcelIds.push(parcel.id);
        console.log(`  ✓ Created parcel: ${parcelNo}`);

        // Link parcel to owner(s)
        const ownerId = ownerIds[i % ownerIds.length];
        await db.insert(parcelOwners).values({
          parcelId: parcel.id,
          ownerId,
          sharePct: '100.00',
        }).catch(() => {}); // Ignore if already exists
      }
    }

    // Seed multiple SIAs with different statuses and comprehensive descriptions
    const siaData = [
      {
        noticeNo: 'SIA-2024-001',
        title: 'Social Impact Assessment for Industrial Corridor Development',
        description: `# Social Impact Assessment Report
## Industrial Corridor Development Project

### Executive Summary

This Social Impact Assessment (SIA) has been conducted in accordance with Section 4 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013, for the proposed Industrial Corridor Development Project covering approximately 500 acres of land across Kharar and Mohali regions in Punjab.

### Project Overview

The Industrial Corridor Development Project aims to establish a modern industrial zone to promote economic growth, generate employment opportunities, and enhance infrastructure connectivity in the region. The project will include manufacturing units, logistics hubs, and supporting infrastructure facilities.

### Affected Area

- **Total Area**: 500 acres (202.34 hectares)
- **Villages Affected**: Kharar (300 acres), Mohali (200 acres)
- **Number of Land Owners**: Approximately 150 families
- **Agricultural Land**: 420 acres (84% of total area)
- **Residential Structures**: 25 houses
- **Commercial Establishments**: 8 shops and small businesses

### Social Impact Analysis

#### 1. Impact on Agriculture and Livelihoods

The project will affect approximately 420 acres of agricultural land, primarily used for:
- Wheat cultivation (60% of affected area)
- Rice cultivation (25% of affected area)
- Vegetable farming (15% of affected area)

**Livelihood Impact:**
- 120 families primarily dependent on agriculture
- 30 families with mixed income (agriculture + other sources)
- Estimated annual agricultural income loss: ₹2.5 crores

#### 2. Impact on Housing and Infrastructure

- **Residential Displacement**: 25 families will be required to relocate
- **Infrastructure Affected**: 
  - 3 community wells
  - 2 village roads
  - 1 primary school (partial impact)
  - 1 community center

#### 3. Impact on Community Resources

- **Common Property Resources**: 15 acres of common grazing land
- **Religious Structures**: 1 temple (no displacement required)
- **Burial Grounds**: 1 cremation ground (no impact)

### Rehabilitation and Resettlement Plan

#### Compensation Package

1. **Land Compensation**: Market value + 100% solatium as per Act
2. **Structure Compensation**: Replacement cost + transportation allowance
3. **Livelihood Rehabilitation**: 
   - Skill development training for affected families
   - Employment opportunities in industrial units
   - Preference in project-related jobs

#### Resettlement Sites

- **Site 1**: 5 km from Kharar village (for 15 families)
- **Site 2**: 3 km from Mohali village (for 10 families)
- Both sites equipped with basic infrastructure: roads, water supply, electricity, drainage

### Public Consultation

**Consultation Period**: January 1, 2024 to March 31, 2024

**Stakeholder Engagement:**
- 5 Gram Sabha meetings conducted
- 3 public hearings organized
- 150 individual consultations with affected families
- Feedback received from 120 stakeholders

**Key Concerns Raised:**
1. Adequacy of compensation rates
2. Quality of resettlement sites
3. Employment guarantee in industrial units
4. Impact on remaining agricultural land
5. Environmental concerns

### Recommendations

1. Ensure fair and timely compensation payment
2. Complete resettlement before project commencement
3. Provide skill development and employment support
4. Establish grievance redressal mechanism
5. Monitor implementation of rehabilitation plan

### Conclusion

The SIA identifies significant social impacts that require comprehensive rehabilitation and resettlement measures. With proper implementation of the R&R plan, the project can proceed while safeguarding the interests of affected families.

**Assessment Completed By**: Social Impact Assessment Team, PUDA
**Date**: March 31, 2024`,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        status: 'published',
        publishedAt: new Date('2024-01-15'),
      },
      {
        noticeNo: 'SIA-2024-002',
        title: 'Social Impact Assessment for Residential Township Project',
        description: `# Social Impact Assessment Report
## Residential Township Development Project

### Project Details

This Social Impact Assessment has been prepared for the proposed Residential Township Development Project in Zirakpur, covering approximately 200 acres of land. The project aims to develop a modern residential township with housing units, commercial spaces, and community facilities.

### Affected Population

- **Total Families Affected**: 85 families
- **Agricultural Land**: 180 acres
- **Residential Structures**: 45 houses
- **Commercial Units**: 12 shops
- **Community Facilities**: 2 temples, 1 community hall

### Impact Assessment

#### Economic Impact

The project will result in:
- Loss of agricultural income for 65 farming families
- Displacement of 12 commercial establishments
- Impact on daily wage laborers dependent on agricultural activities

#### Social Impact

- Disruption of social networks and community bonds
- Impact on access to education and healthcare
- Changes in lifestyle and cultural practices
- Stress and anxiety among affected families

#### Environmental Impact

- Loss of green cover and agricultural biodiversity
- Impact on local water resources
- Changes in micro-climate
- Increased traffic and pollution

### Rehabilitation Measures

1. **Land for Land**: Provision of developed residential plots
2. **Employment**: Priority in construction and maintenance jobs
3. **Infrastructure**: Schools, healthcare, and community facilities in new location
4. **Financial Support**: Transitional allowance and business re-establishment support

### Public Consultation Status

**Consultation Period**: February 1, 2024 to April 30, 2024

**Meetings Conducted:**
- 3 Gram Sabha meetings
- 2 public hearings scheduled
- Individual consultations in progress

**Next Steps:**
- Complete remaining stakeholder consultations
- Address concerns raised in public hearings
- Finalize rehabilitation and resettlement plan
- Schedule final public hearing

**Assessment Status**: Under Review - Public Hearing Scheduled`,
        startDate: new Date('2024-02-01'),
        endDate: new Date('2024-04-30'),
        status: 'hearing_scheduled',
        publishedAt: new Date('2024-02-15'),
      },
      {
        noticeNo: 'SIA-2024-003',
        title: 'Social Impact Assessment for Commercial Complex Development',
        description: `# Social Impact Assessment Report
## Commercial Complex Development Project, Banur

### Introduction

This Social Impact Assessment evaluates the social, economic, and cultural impacts of the proposed Commercial Complex Development Project in Banur, covering 50 acres of land. The project involves development of shopping malls, office spaces, and entertainment facilities.

### Project Scope

- **Total Area**: 50 acres
- **Development Components**:
  - Shopping complex: 15 acres
  - Office buildings: 20 acres
  - Parking and infrastructure: 15 acres

### Affected Stakeholders

#### Direct Impact

- **Land Owners**: 35 families
- **Commercial Establishments**: 28 shops and businesses
- **Residential Units**: 15 houses
- **Agricultural Land**: 40 acres

#### Indirect Impact

- **Local Traders**: 50+ small businesses in surrounding area
- **Daily Wage Workers**: 80+ individuals
- **Transport Operators**: 15 auto-rickshaw and taxi drivers

### Detailed Impact Analysis

#### 1. Economic Displacement

**Commercial Establishments Affected:**
- 12 grocery stores
- 8 clothing shops
- 5 restaurants
- 3 service providers (tailor, barber, etc.)

**Estimated Economic Loss:**
- Monthly business turnover: ₹45 lakhs
- Employment: 60 direct jobs
- Supplier network: 25 local suppliers

#### 2. Livelihood Impact

- **Traders**: Complete loss of business location
- **Employees**: Job loss for 60 workers
- **Suppliers**: Reduced business opportunities
- **Service Providers**: Loss of customer base

#### 3. Social and Cultural Impact

- Disruption of local market ecosystem
- Impact on traditional shopping patterns
- Changes in social interaction spaces
- Loss of community gathering places

### Rehabilitation Strategy

#### For Commercial Establishments

1. **Relocation Support**: 
   - Priority allocation in new commercial complex
   - Rental subsidy for first 2 years
   - Infrastructure support for business setup

2. **Financial Assistance**:
   - One-time business re-establishment grant
   - Working capital loan facilitation
   - Training for modern business practices

3. **Employment Support**:
   - Skill development programs
   - Job placement assistance
   - Preference in new commercial complex

#### For Residential Displacement

- Replacement housing in nearby developed area
- Transportation allowance
- Transitional support during relocation

### Public Consultation Summary

**Hearing Completed**: June 20, 2024

**Key Outcomes:**
- 45 stakeholders participated
- 28 written submissions received
- Major concerns: business relocation, compensation adequacy, employment opportunities
- Consensus reached on rehabilitation package framework

**Action Items:**
- Finalize individual rehabilitation packages
- Establish business relocation committee
- Set up grievance redressal mechanism

### Recommendations

1. Implement comprehensive business relocation plan
2. Provide adequate financial support for business re-establishment
3. Ensure employment opportunities for affected workers
4. Maintain community spaces in new development
5. Monitor rehabilitation implementation

**Assessment Status**: Public Hearing Completed - Report Generation in Progress`,
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-05-31'),
        status: 'hearing_completed',
        publishedAt: new Date('2024-03-15'),
      },
      {
        noticeNo: 'SIA-2024-004',
        title: 'Social Impact Assessment for Highway Expansion Project',
        description: `# Social Impact Assessment Report
## Highway Expansion Project - NH-5 Widening

### Project Background

This Social Impact Assessment has been conducted for the Highway Expansion Project involving widening of National Highway 5 (NH-5) from 4 lanes to 6 lanes, affecting approximately 300 acres of land across multiple villages in Punjab.

### Project Details

- **Highway Section**: 45 km stretch
- **Current Width**: 4 lanes (60 meters)
- **Proposed Width**: 6 lanes (90 meters)
- **Additional Land Required**: 300 acres
- **Villages Affected**: 8 villages across 3 districts

### Impact Assessment

#### Land Acquisition Details

**Village-wise Breakdown:**

1. **Village A**: 45 acres (15 families)
2. **Village B**: 38 acres (12 families)
3. **Village C**: 42 acres (14 families)
4. **Village D**: 35 acres (11 families)
5. **Village E**: 40 acres (13 families)
6. **Village F**: 33 acres (10 families)
7. **Village G**: 37 acres (12 families)
8. **Village H**: 30 acres (9 families)

**Total Impact:**
- Agricultural Land: 280 acres
- Residential Structures: 18 houses (partial impact)
- Commercial Establishments: 5 shops
- Community Infrastructure: 2 schools (partial), 1 health center

#### Socio-Economic Impact

**Agriculture:**
- Loss of productive agricultural land
- Impact on crop patterns and irrigation
- Reduction in agricultural income
- Effect on agricultural laborers

**Infrastructure:**
- Partial impact on 2 primary schools
- Relocation of 1 health sub-center
- Impact on village roads and connectivity
- Disruption of water supply lines

**Livelihoods:**
- 95 farming families affected
- 25 agricultural laborers
- 5 shop owners
- 12 daily wage workers

### Rehabilitation and Resettlement Plan

#### Compensation Framework

1. **Land Compensation**:
   - Market value assessment completed
   - 100% solatium as per Act
   - Additional compensation for standing crops

2. **Structure Compensation**:
   - Replacement cost for affected structures
   - Transportation and shifting allowance
   - Temporary accommodation support

3. **Livelihood Rehabilitation**:
   - Skill development training
   - Employment in highway construction
   - Preference in highway maintenance jobs
   - Support for alternative livelihoods

#### Infrastructure Rehabilitation

- Reconstruction of affected school buildings
- Relocation and upgradation of health center
- Restoration of village roads
- Re-laying of water supply infrastructure

### Public Consultation Process

**Consultation Period**: April 1, 2024 to June 30, 2024

**Activities Conducted:**
- 8 Gram Sabha meetings (one per village)
- 3 public hearings
- 95 individual consultations
- 45 group discussions

**Feedback Summary:**
- 120 written submissions received
- Major concerns: compensation rates, livelihood support, infrastructure restoration
- Suggestions: employment guarantee, skill training, better connectivity

### SIA Report Status

**Report Generated**: June 30, 2024

**Key Findings:**
1. Significant impact on agricultural livelihoods
2. Need for comprehensive rehabilitation package
3. Infrastructure restoration critical
4. Employment support essential

**Recommendations:**
1. Fair and timely compensation payment
2. Complete infrastructure restoration
3. Comprehensive livelihood rehabilitation
4. Employment opportunities in highway project
5. Continuous monitoring and support

**Next Steps:**
- Final approval of rehabilitation plan
- Implementation of compensation and rehabilitation
- Project commencement after R&R completion

**Assessment Completed**: SIA Report Generated and Submitted`,
        startDate: new Date('2024-04-01'),
        endDate: new Date('2024-06-30'),
        status: 'report_generated',
        publishedAt: new Date('2024-04-15'),
      },
      {
        noticeNo: 'SIA-2024-005',
        title: 'Social Impact Assessment for Educational Institution Campus',
        description: `# Social Impact Assessment Report
## Educational Institution Campus Development Project

### Executive Summary

This Social Impact Assessment has been completed for the proposed Educational Institution Campus Development Project in Kurali, covering 100 acres of land. The project aims to establish a comprehensive educational campus including schools, colleges, and supporting infrastructure.

### Project Overview

**Campus Components:**
- Primary and Secondary School: 20 acres
- College Campus: 40 acres
- Hostel Facilities: 15 acres
- Sports and Recreation: 10 acres
- Administrative and Support: 15 acres

### Impact Analysis

#### Affected Population

- **Land Owners**: 42 families
- **Agricultural Land**: 95 acres
- **Residential Structures**: 8 houses
- **Community Facilities**: 1 community park

#### Positive Impacts

1. **Educational Infrastructure**: Enhanced access to quality education
2. **Employment**: Direct and indirect employment opportunities
3. **Economic Development**: Boost to local economy
4. **Social Development**: Improved educational outcomes

#### Negative Impacts

1. **Agricultural Loss**: 95 acres of productive agricultural land
2. **Displacement**: 8 families requiring relocation
3. **Environmental**: Loss of green cover
4. **Livelihood**: Impact on 35 farming families

### Rehabilitation Measures Implemented

#### Compensation and Resettlement

✅ **Completed:**
- Land compensation paid to all 42 families
- 8 families relocated to nearby developed area
- Replacement housing provided with all amenities
- Transportation and shifting allowance disbursed

#### Livelihood Support

✅ **Completed:**
- Skill development training for 25 affected individuals
- 15 persons employed in campus construction
- 8 persons provided employment in campus operations
- Business support for 5 affected families

#### Infrastructure Development

✅ **Completed:**
- Community park redeveloped in new location
- Improved road connectivity
- Enhanced water supply infrastructure
- Better electricity connectivity

### Public Consultation Summary

**Consultation Period**: May 1, 2024 to July 31, 2024

**Meetings Conducted:**
- 4 Gram Sabha meetings
- 2 public hearings
- 42 individual consultations
- Community feedback sessions

**Outcomes:**
- Consensus on rehabilitation package
- Support for educational development
- Concerns addressed through dialogue
- Final approval obtained

### Project Status

**Current Status**: Rehabilitation and Resettlement Completed

**Implementation:**
- All compensation payments completed
- Resettlement completed successfully
- Infrastructure restoration done
- Livelihood support provided
- Project construction commenced

### Conclusion

The SIA process has been completed successfully with comprehensive rehabilitation and resettlement measures implemented. All affected families have been adequately compensated and rehabilitated. The project is proceeding as planned with positive community support.

**Final Report Date**: July 31, 2024
**Status**: Closed - All R&R Measures Completed`,
        startDate: new Date('2024-05-01'),
        endDate: new Date('2024-07-31'),
        status: 'closed',
        publishedAt: new Date('2024-05-15'),
      },
      {
        noticeNo: 'SIA-2024-006',
        title: 'Social Impact Assessment for IT Park Development',
        description: `# Social Impact Assessment Report
## IT Park Development Project, Mohali

### Project Introduction

This Social Impact Assessment is being prepared for the proposed IT Park Development Project in Mohali, covering approximately 150 acres of land. The project aims to establish a modern IT and technology hub with office spaces, data centers, and supporting infrastructure.

### Project Scope

**Development Components:**
- IT Office Buildings: 80 acres
- Data Center Facilities: 30 acres
- Commercial and Retail: 20 acres
- Parking and Infrastructure: 20 acres

### Preliminary Impact Assessment

#### Affected Area

- **Total Land**: 150 acres
- **Agricultural Land**: 135 acres
- **Residential Area**: 10 acres
- **Commercial Area**: 5 acres

#### Potential Affected Population

- **Land Owners**: 55 families (estimated)
- **Residential Units**: 12 houses (estimated)
- **Commercial Establishments**: 8 units (estimated)
- **Agricultural Families**: 45 families (estimated)

### Impact Categories

#### Economic Impact

- Loss of agricultural production
- Displacement of commercial activities
- Impact on local employment patterns
- Changes in land use and value

#### Social Impact

- Community displacement
- Changes in social structure
- Impact on local services
- Cultural and lifestyle changes

#### Environmental Impact

- Loss of agricultural biodiversity
- Changes in land use pattern
- Impact on local ecosystem
- Water and energy requirements

### Proposed Rehabilitation Framework

#### Compensation Strategy

1. **Land Compensation**: Market value + solatium
2. **Structure Compensation**: Replacement cost
3. **Livelihood Support**: Employment and training
4. **Infrastructure**: Community facilities

#### Employment Opportunities

- Construction phase employment
- IT park operations jobs
- Support services employment
- Skill development for IT sector

### Assessment Status

**Current Phase**: Draft Assessment

**Next Steps:**
1. Complete detailed field survey
2. Conduct stakeholder consultations
3. Prepare comprehensive impact analysis
4. Develop detailed rehabilitation plan
5. Organize public consultations
6. Finalize SIA report

**Expected Completion**: August 31, 2024

**Note**: This is a preliminary assessment. Detailed analysis and public consultation will be conducted as per the Act.`,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31'),
        status: 'draft',
        publishedAt: null,
      },
    ];

    const siaIds: number[] = [];
    for (const siaInfo of siaData) {
      const [existing] = await db.select().from(sia).where(eq(sia.noticeNo, siaInfo.noticeNo)).limit(1);
      if (existing) {
        // Update existing SIA with comprehensive description
        await db.update(sia)
          .set({ description: siaInfo.description })
          .where(eq(sia.id, existing.id));
        siaIds.push(existing.id);
        console.log(`  ✓ Updated SIA: ${existing.noticeNo} (${existing.status})`);
      } else {
        const [siaRecord] = await db.insert(sia).values({
          ...siaInfo,
          createdBy: caseOfficerId,
        }).returning();
        siaIds.push(siaRecord.id);
        console.log(`  ✓ Created SIA: ${siaRecord.noticeNo} (${siaRecord.status})`);
      }
    }

    // Seed SIA feedback for published SIAs
    const feedbackData = [
      { siaIndex: 0, name: 'Ram Singh', contact: '+919876543210', text: 'Concerned about displacement of agricultural land. Need proper rehabilitation plan.' },
      { siaIndex: 0, name: 'Shyam Lal', contact: '+919876543211', text: 'Support the project but request fair compensation for land and livelihood loss.' },
      { siaIndex: 1, name: 'Gita Devi', contact: '+919876543212', text: 'Request for community consultation meeting to discuss impact on local businesses.' },
    ];

    for (const feedback of feedbackData) {
      if (siaIds[feedback.siaIndex]) {
        const [existing] = await db.select().from(siaFeedback)
          .where(eq(siaFeedback.siaId, siaIds[feedback.siaIndex]))
          .where(eq(siaFeedback.citizenContact, feedback.contact))
          .limit(1);
        if (!existing) {
          await db.insert(siaFeedback).values({
            siaId: siaIds[feedback.siaIndex],
            citizenName: feedback.name,
            citizenContact: feedback.contact,
            text: feedback.text,
            status: 'received',
          }).catch(() => {});
        }
      }
    }

    // Seed SIA hearings
    const hearingData = [
      { siaIndex: 1, date: new Date('2024-05-15'), venue: 'Community Hall, Zirakpur', agenda: 'Discussion on residential township impact and rehabilitation plan' },
      { siaIndex: 2, date: new Date('2024-06-20'), venue: 'Town Hall, Banur', agenda: 'Public hearing on commercial complex development and trader displacement' },
    ];

    for (const hearing of hearingData) {
      if (siaIds[hearing.siaIndex]) {
        const [existing] = await db.select().from(siaHearings)
          .where(eq(siaHearings.siaId, siaIds[hearing.siaIndex]))
          .where(eq(siaHearings.date, hearing.date))
          .limit(1);
        if (!existing) {
          await db.insert(siaHearings).values({
            siaId: siaIds[hearing.siaIndex],
            date: hearing.date,
            venue: hearing.venue,
            agenda: hearing.agenda,
            attendeesJson: ['Ram Singh', 'Shyam Lal', 'Gita Devi', 'Mohan Das', 'Case Officer', 'Legal Officer'],
          }).catch(() => {});
        }
      }
    }

    // Seed multiple land notifications with different statuses and comprehensive notification text
    const notificationData = [
      {
        type: 'sec11' as const,
        refNo: 'SEC11-2024-001',
        title: 'Section 11 Notification - Industrial Corridor Development Project',
        bodyHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.8;">
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px;">
NOTIFICATION UNDER SECTION 11<br/>
THE RIGHT TO FAIR COMPENSATION AND TRANSPARENCY IN LAND ACQUISITION,<br/>
REHABILITATION AND RESETTLEMENT ACT, 2013
</h2>

<p style="text-align: center; font-weight: bold; margin-bottom: 15px;">
Punjab Urban Development Authority (PUDA)<br/>
Notification No. SEC11-2024-001<br/>
Dated: 1st February, 2024
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
WHEREAS, the Competent Authority is of the opinion that land is required for a public purpose, namely, <strong>"Industrial Corridor Development Project"</strong> for the establishment of a modern industrial zone to promote economic growth, generate employment opportunities, and enhance infrastructure connectivity in the Kharar and Mohali regions of Punjab;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, a Social Impact Assessment (SIA) has been conducted in accordance with Section 4 of the Act, and the report has been published for public consultation;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
NOW, THEREFORE, in exercise of the powers conferred by sub-section (1) of Section 11 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (30 of 2013), the Competent Authority hereby notifies that the land described in the Schedule below is required for the said public purpose.
</p>

<h3 style="font-size: 16px; font-weight: bold; margin-top: 25px; margin-bottom: 15px;">SCHEDULE</h3>

<p style="margin-bottom: 10px;"><strong>Project:</strong> Industrial Corridor Development Project</p>
<p style="margin-bottom: 10px;"><strong>Total Area:</strong> Approximately 500 acres (202.34 hectares)</p>
<p style="margin-bottom: 10px;"><strong>Location:</strong> Kharar and Mohali regions, District SAS Nagar, Punjab</p>

<p style="margin-top: 20px; margin-bottom: 10px;"><strong>Details of Land Proposed for Acquisition:</strong></p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Village Kharar: Approximately 300 acres</li>
<li>Village Mohali: Approximately 200 acres</li>
<li>Total Number of Parcels: 150+ land parcels</li>
<li>Number of Affected Families: Approximately 150 families</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Purpose of Acquisition:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
The land is required for the development of an Industrial Corridor including manufacturing units, logistics hubs, warehousing facilities, and supporting infrastructure such as roads, water supply, electricity, and other utilities essential for industrial development.
</p>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Compensation and Rehabilitation:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
All affected families shall be entitled to compensation as per the provisions of the Act, including:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Market value of the land plus 100% solatium</li>
<li>Compensation for structures, trees, and standing crops</li>
<li>Rehabilitation and Resettlement benefits as per the Act</li>
<li>Employment opportunities in the industrial units</li>
<li>Skill development and training programs</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Objection Period:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
Any person interested in the land may, within sixty (60) days from the date of publication of this notification, submit objections in writing to the Competent Authority. Objections may be submitted in person or by registered post to the office of the Competent Authority, PUDA, Sector 62, Mohali, Punjab - 160062.
</p>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Inspection of Documents:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
The Social Impact Assessment Report, maps, and other relevant documents are available for inspection at the office of the Competent Authority during office hours (10:00 AM to 5:00 PM) on all working days.
</p>

<p style="margin-top: 30px; text-align: right; margin-bottom: 5px;">
<strong>By Order and in the name of the Governor of Punjab</strong>
</p>

<p style="text-align: right; margin-top: 5px;">
<strong>Competent Authority</strong><br/>
<strong>Punjab Urban Development Authority</strong><br/>
<strong>Mohali, Punjab</strong>
</p>
</div>`,
        publishDate: new Date('2024-02-01'),
        status: 'published',
        siaId: siaIds[0],
        approvedBy: legalOfficerId,
        approvedAt: new Date('2024-01-28'),
      },
      {
        type: 'sec11' as const,
        refNo: 'SEC11-2024-002',
        title: 'Section 11 Notification - Residential Township Project',
        bodyHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.8;">
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px;">
NOTIFICATION UNDER SECTION 11<br/>
THE RIGHT TO FAIR COMPENSATION AND TRANSPARENCY IN LAND ACQUISITION,<br/>
REHABILITATION AND RESETTLEMENT ACT, 2013
</h2>

<p style="text-align: center; font-weight: bold; margin-bottom: 15px;">
Punjab Urban Development Authority (PUDA)<br/>
Notification No. SEC11-2024-002<br/>
Dated: [To be published after legal review]
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
WHEREAS, the Competent Authority is of the opinion that land is required for a public purpose, namely, <strong>"Residential Township Development Project"</strong> for the development of a modern residential township with housing units, commercial spaces, community facilities, and supporting infrastructure in Zirakpur region;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, a Social Impact Assessment (SIA) has been conducted and the preliminary assessment indicates the need for comprehensive rehabilitation and resettlement measures;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
NOW, THEREFORE, in exercise of the powers conferred by sub-section (1) of Section 11 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (30 of 2013), the Competent Authority proposes to notify that the land described in the Schedule below is required for the said public purpose.
</p>

<h3 style="font-size: 16px; font-weight: bold; margin-top: 25px; margin-bottom: 15px;">SCHEDULE</h3>

<p style="margin-bottom: 10px;"><strong>Project:</strong> Residential Township Development Project</p>
<p style="margin-bottom: 10px;"><strong>Total Area:</strong> Approximately 200 acres (80.94 hectares)</p>
<p style="margin-bottom: 10px;"><strong>Location:</strong> Zirakpur region, District SAS Nagar, Punjab</p>

<p style="margin-top: 20px; margin-bottom: 10px;"><strong>Details of Land Proposed for Acquisition:</strong></p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Agricultural Land: 180 acres</li>
<li>Residential Structures: 45 houses</li>
<li>Commercial Units: 12 shops</li>
<li>Community Facilities: 2 temples, 1 community hall</li>
<li>Total Number of Affected Families: 85 families</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Purpose of Acquisition:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
The land is required for the development of a modern residential township including:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Residential plots and housing units</li>
<li>Commercial spaces and retail outlets</li>
<li>Community facilities (schools, healthcare, parks)</li>
<li>Infrastructure (roads, water supply, sewage, electricity)</li>
<li>Recreational and cultural facilities</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Rehabilitation and Resettlement Plan:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
A comprehensive Rehabilitation and Resettlement Plan has been prepared which includes:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Land for land: Provision of developed residential plots</li>
<li>Employment opportunities in construction and maintenance</li>
<li>Infrastructure development in resettlement areas</li>
<li>Financial support for business re-establishment</li>
<li>Transitional allowance and shifting support</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Status:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
This notification is currently under legal review. Upon approval, it will be published in the Official Gazette and local newspapers, and objections will be invited from interested persons.
</p>

<p style="margin-top: 30px; text-align: right; margin-bottom: 5px;">
<strong>By Order and in the name of the Governor of Punjab</strong>
</p>

<p style="text-align: right; margin-top: 5px;">
<strong>Competent Authority</strong><br/>
<strong>Punjab Urban Development Authority</strong><br/>
<strong>Mohali, Punjab</strong>
</p>
</div>`,
        publishDate: null,
        status: 'legal_review',
        siaId: siaIds[1],
        approvedBy: null,
        approvedAt: null,
      },
      {
        type: 'sec11' as const,
        refNo: 'SEC11-2024-003',
        title: 'Section 11 Notification - Commercial Complex Development',
        bodyHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.8;">
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px;">
NOTIFICATION UNDER SECTION 11<br/>
THE RIGHT TO FAIR COMPENSATION AND TRANSPARENCY IN LAND ACQUISITION,<br/>
REHABILITATION AND RESETTLEMENT ACT, 2013
</h2>

<p style="text-align: center; font-weight: bold; margin-bottom: 15px;">
Punjab Urban Development Authority (PUDA)<br/>
Notification No. SEC11-2024-003<br/>
Dated: 1st April, 2024
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
WHEREAS, the Competent Authority is of the opinion that land is required for a public purpose, namely, <strong>"Commercial Complex Development Project"</strong> for the establishment of modern shopping malls, office spaces, entertainment facilities, and supporting commercial infrastructure in Banur;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, a Social Impact Assessment (SIA) has been conducted in accordance with Section 4 of the Act, and public hearings have been completed;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
NOW, THEREFORE, in exercise of the powers conferred by sub-section (1) of Section 11 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (30 of 2013), the Competent Authority hereby notifies that the land described in the Schedule below is required for the said public purpose.
</p>

<h3 style="font-size: 16px; font-weight: bold; margin-top: 25px; margin-bottom: 15px;">SCHEDULE</h3>

<p style="margin-bottom: 10px;"><strong>Project:</strong> Commercial Complex Development Project</p>
<p style="margin-bottom: 10px;"><strong>Total Area:</strong> Approximately 50 acres (20.23 hectares)</p>
<p style="margin-bottom: 10px;"><strong>Location:</strong> Banur, District SAS Nagar, Punjab</p>

<p style="margin-top: 20px; margin-bottom: 10px;"><strong>Details of Land Proposed for Acquisition:</strong></p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Agricultural Land: 40 acres</li>
<li>Commercial Establishments: 28 shops and businesses</li>
<li>Residential Units: 15 houses</li>
<li>Total Number of Affected Families: 35 land-owning families</li>
<li>Commercial Units Affected: 28 businesses</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Purpose of Acquisition:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
The land is required for the development of a modern commercial complex including:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Shopping mall and retail spaces (15 acres)</li>
<li>Office buildings and commercial towers (20 acres)</li>
<li>Parking facilities and infrastructure (15 acres)</li>
<li>Entertainment and recreational facilities</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Compensation and Rehabilitation:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
All affected persons shall be entitled to:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Market value of land plus 100% solatium</li>
<li>Compensation for structures and business assets</li>
<li>Priority allocation in new commercial complex</li>
<li>Rental subsidy for first 2 years</li>
<li>Business re-establishment grant</li>
<li>Employment opportunities in new complex</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>IMPORTANT NOTICE - OBJECTION WINDOW OPEN</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px; background-color: #fff3cd; padding: 15px; border-left: 4px solid #ffc107;">
<strong>Any person interested in the land may, within sixty (60) days from the date of publication of this notification (i.e., on or before 31st May, 2024), submit objections in writing to the Competent Authority.</strong>
</p>

<p style="margin-top: 15px; margin-bottom: 15px;">
<strong>Objections may be submitted:</strong>
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>In person at the office of Competent Authority, PUDA, Sector 62, Mohali</li>
<li>By registered post to: Competent Authority, PUDA, Sector 62, Mohali, Punjab - 160062</li>
<li>Online through the PUDA portal: www.puda.gov.in</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Inspection of Documents:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
The Social Impact Assessment Report, maps showing the boundaries of the land, and other relevant documents are available for inspection at the office of the Competent Authority during office hours (10:00 AM to 5:00 PM) on all working days.
</p>

<p style="margin-top: 30px; text-align: right; margin-bottom: 5px;">
<strong>By Order and in the name of the Governor of Punjab</strong>
</p>

<p style="text-align: right; margin-top: 5px;">
<strong>Competent Authority</strong><br/>
<strong>Punjab Urban Development Authority</strong><br/>
<strong>Mohali, Punjab</strong>
</p>
</div>`,
        publishDate: new Date('2024-04-01'),
        status: 'objection_window_open',
        siaId: siaIds[2],
        approvedBy: legalOfficerId,
        approvedAt: new Date('2024-03-28'),
      },
      {
        type: 'sec19' as const,
        refNo: 'SEC19-2024-001',
        title: 'Section 19 Notification - Industrial Corridor Development Project (Final)',
        bodyHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.8;">
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px;">
NOTIFICATION UNDER SECTION 19<br/>
THE RIGHT TO FAIR COMPENSATION AND TRANSPARENCY IN LAND ACQUISITION,<br/>
REHABILITATION AND RESETTLEMENT ACT, 2013
</h2>

<p style="text-align: center; font-weight: bold; margin-bottom: 15px;">
Punjab Urban Development Authority (PUDA)<br/>
Notification No. SEC19-2024-001<br/>
Dated: 15th May, 2024
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
WHEREAS, a preliminary notification under Section 11 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (30 of 2013) was published in the Official Gazette and local newspapers on 1st February, 2024, notifying that land was required for the <strong>"Industrial Corridor Development Project"</strong>;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, objections were invited from all persons interested in the land, and the objection period closed on 2nd April, 2024;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, the Competent Authority has heard all objections received under Section 15 of the Act, and after due consideration of all objections, representations, and evidence presented, is satisfied that the land is required for the said public purpose;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, the Competent Authority has considered the Social Impact Assessment Report and the Rehabilitation and Resettlement Scheme prepared under the Act;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
NOW, THEREFORE, in exercise of the powers conferred by Section 19 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (30 of 2013), the Competent Authority hereby declares that the land described in the Schedule below is required for the <strong>"Industrial Corridor Development Project"</strong>.
</p>

<h3 style="font-size: 16px; font-weight: bold; margin-top: 25px; margin-bottom: 15px;">SCHEDULE</h3>

<p style="margin-bottom: 10px;"><strong>Project:</strong> Industrial Corridor Development Project</p>
<p style="margin-bottom: 10px;"><strong>Total Area:</strong> 500 acres (202.34 hectares) - Final Declaration</p>
<p style="margin-bottom: 10px;"><strong>Location:</strong> Kharar and Mohali regions, District SAS Nagar, Punjab</p>

<p style="margin-top: 20px; margin-bottom: 10px;"><strong>Final List of Land Declared for Acquisition:</strong></p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Village Kharar: 300 acres (after considering objections)</li>
<li>Village Mohali: 200 acres (after considering objections)</li>
<li>Total Number of Parcels: 148 land parcels (2 parcels excluded based on objections)</li>
<li>Number of Affected Families: 148 families</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Objections Considered:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
A total of 45 objections were received during the objection period. All objections were heard by the Competent Authority. After careful consideration:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>38 objections were found to be without merit and were rejected</li>
<li>5 objections resulted in minor boundary adjustments</li>
<li>2 objections were accepted, and the concerned parcels were excluded from acquisition</li>
<li>All objectors were given opportunity to be heard in person</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Compensation and Rehabilitation:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
The following compensation and rehabilitation measures shall be provided to all affected families:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Market value of land as determined by the Collector plus 100% solatium</li>
<li>Compensation for all structures, trees, and standing crops</li>
<li>Rehabilitation and Resettlement benefits as per the approved R&R Scheme</li>
<li>Employment opportunities in industrial units (minimum 1 job per affected family)</li>
<li>Skill development and training programs</li>
<li>Resettlement in developed sites with all basic amenities</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Next Steps:</strong></p>
<ol style="margin-left: 40px; margin-bottom: 20px;">
<li>Land acquisition proceedings will be initiated by the Collector</li>
<li>Individual notices will be issued to all affected land owners</li>
<li>Compensation awards will be prepared and served</li>
<li>Rehabilitation and resettlement will be completed before taking possession</li>
</ol>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Grievance Redressal:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
Any person aggrieved by this declaration may file an appeal before the appropriate authority within 30 days of the publication of this notification, in accordance with the provisions of the Act.
</p>

<p style="margin-top: 30px; text-align: right; margin-bottom: 5px;">
<strong>By Order and in the name of the Governor of Punjab</strong>
</p>

<p style="text-align: right; margin-top: 5px;">
<strong>Competent Authority</strong><br/>
<strong>Punjab Urban Development Authority</strong><br/>
<strong>Mohali, Punjab</strong>
</p>
</div>`,
        publishDate: new Date('2024-05-15'),
        status: 'published',
        siaId: siaIds[0],
        approvedBy: legalOfficerId,
        approvedAt: new Date('2024-05-10'),
      },
      {
        type: 'sec19' as const,
        refNo: 'SEC19-2024-002',
        title: 'Section 19 Notification - Highway Expansion Project (Final)',
        bodyHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.8;">
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px;">
NOTIFICATION UNDER SECTION 19<br/>
THE RIGHT TO FAIR COMPENSATION AND TRANSPARENCY IN LAND ACQUISITION,<br/>
REHABILITATION AND RESETTLEMENT ACT, 2013
</h2>

<p style="text-align: center; font-weight: bold; margin-bottom: 15px;">
Punjab Urban Development Authority (PUDA)<br/>
Notification No. SEC19-2024-002<br/>
Dated: 1st July, 2024
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
WHEREAS, a preliminary notification under Section 11 was published on 15th April, 2024, for the <strong>"Highway Expansion Project - NH-5 Widening"</strong>;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, all objections received under Section 15 have been heard and considered by the Competent Authority;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, the Social Impact Assessment Report has been finalized and the Rehabilitation and Resettlement Scheme has been approved;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, all compensation and rehabilitation measures have been implemented;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
NOW, THEREFORE, in exercise of the powers conferred by Section 19 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (30 of 2013), the Competent Authority hereby makes the final declaration that the land described in the Schedule below is required for the <strong>"Highway Expansion Project - NH-5 Widening"</strong>.
</p>

<h3 style="font-size: 16px; font-weight: bold; margin-top: 25px; margin-bottom: 15px;">SCHEDULE</h3>

<p style="margin-bottom: 10px;"><strong>Project:</strong> Highway Expansion Project - NH-5 Widening (4 lanes to 6 lanes)</p>
<p style="margin-bottom: 10px;"><strong>Highway Section:</strong> 45 km stretch</p>
<p style="margin-bottom: 10px;"><strong>Total Area:</strong> 300 acres (121.41 hectares)</p>
<p style="margin-bottom: 10px;"><strong>Location:</strong> 8 villages across 3 districts in Punjab</p>

<p style="margin-top: 20px; margin-bottom: 10px;"><strong>Village-wise Land Acquisition:</strong></p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Village A: 45 acres (15 families)</li>
<li>Village B: 38 acres (12 families)</li>
<li>Village C: 42 acres (14 families)</li>
<li>Village D: 35 acres (11 families)</li>
<li>Village E: 40 acres (13 families)</li>
<li>Village F: 33 acres (10 families)</li>
<li>Village G: 37 acres (12 families)</li>
<li>Village H: 30 acres (9 families)</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Implementation Status:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
✅ All compensation payments have been completed<br/>
✅ Rehabilitation and resettlement measures have been implemented<br/>
✅ Infrastructure restoration has been completed<br/>
✅ Employment support has been provided<br/>
✅ Project construction has commenced
</p>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Final Declaration:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
This notification serves as the final declaration under Section 19 of the Act. The land described in the Schedule is hereby declared as acquired for the Highway Expansion Project. All legal formalities have been completed, and the project is proceeding as per schedule.
</p>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Project Benefits:</strong></p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Improved road connectivity and reduced travel time</li>
<li>Enhanced safety with wider roads and better infrastructure</li>
<li>Economic development through improved transportation</li>
<li>Employment opportunities in highway construction and maintenance</li>
</ul>

<p style="margin-top: 30px; text-align: right; margin-bottom: 5px;">
<strong>By Order and in the name of the Governor of Punjab</strong>
</p>

<p style="text-align: right; margin-top: 5px;">
<strong>Competent Authority</strong><br/>
<strong>Punjab Urban Development Authority</strong><br/>
<strong>Mohali, Punjab</strong>
</p>

<p style="margin-top: 30px; text-align: center; font-style: italic; color: #666;">
This notification marks the completion of the land acquisition process for the Highway Expansion Project. All affected families have been compensated and rehabilitated as per the provisions of the Act.
</p>
</div>`,
        publishDate: new Date('2024-07-01'),
        status: 'closed',
        siaId: siaIds[3],
        approvedBy: legalOfficerId,
        approvedAt: new Date('2024-06-25'),
      },
      {
        type: 'sec11' as const,
        refNo: 'SEC11-2024-004',
        title: 'Section 11 Notification - Educational Institution Campus',
        bodyHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.8;">
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px;">
DRAFT NOTIFICATION UNDER SECTION 11<br/>
THE RIGHT TO FAIR COMPENSATION AND TRANSPARENCY IN LAND ACQUISITION,<br/>
REHABILITATION AND RESETTLEMENT ACT, 2013
</h2>

<p style="text-align: center; font-weight: bold; margin-bottom: 15px;">
Punjab Urban Development Authority (PUDA)<br/>
Notification No. SEC11-2024-004<br/>
[DRAFT - Pending Approval]
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
WHEREAS, the Competent Authority is of the opinion that land is required for a public purpose, namely, <strong>"Educational Institution Campus Development Project"</strong> for the establishment of a comprehensive educational campus including schools, colleges, and supporting infrastructure in Kurali;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, a Social Impact Assessment (SIA) has been initiated and is currently in progress;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
NOW, THEREFORE, the Competent Authority proposes to notify that the land described in the Schedule below may be required for the said public purpose, subject to completion of SIA and approval of the notification.
</p>

<h3 style="font-size: 16px; font-weight: bold; margin-top: 25px; margin-bottom: 15px;">PROPOSED SCHEDULE</h3>

<p style="margin-bottom: 10px;"><strong>Project:</strong> Educational Institution Campus Development Project</p>
<p style="margin-bottom: 10px;"><strong>Total Area:</strong> Approximately 100 acres (40.47 hectares)</p>
<p style="margin-bottom: 10px;"><strong>Location:</strong> Kurali, District SAS Nagar, Punjab</p>

<p style="margin-top: 20px; margin-bottom: 10px;"><strong>Proposed Land for Acquisition:</strong></p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Agricultural Land: 95 acres</li>
<li>Residential Structures: 8 houses</li>
<li>Community Facilities: 1 community park</li>
<li>Estimated Affected Families: 42 families</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Purpose of Acquisition:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
The land is proposed for the development of an educational campus including:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Primary and Secondary School (20 acres)</li>
<li>College Campus (40 acres)</li>
<li>Hostel Facilities (15 acres)</li>
<li>Sports and Recreation (10 acres)</li>
<li>Administrative and Support (15 acres)</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Status:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px; background-color: #e7f3ff; padding: 15px; border-left: 4px solid #2196F3;">
<strong>This is a DRAFT notification and has not been published. It is currently under preparation and will be submitted for legal review and approval before publication.</strong>
</p>

<p style="margin-top: 15px; margin-bottom: 15px;">
<strong>Next Steps:</strong>
</p>
<ol style="margin-left: 40px; margin-bottom: 20px;">
<li>Complete Social Impact Assessment</li>
<li>Finalize Rehabilitation and Resettlement Plan</li>
<li>Submit for legal review</li>
<li>Obtain approval from Competent Authority</li>
<li>Publish in Official Gazette and newspapers</li>
</ol>

<p style="margin-top: 30px; text-align: right; margin-bottom: 5px;">
<strong>[DRAFT]</strong>
</p>

<p style="text-align: right; margin-top: 5px;">
<strong>Competent Authority</strong><br/>
<strong>Punjab Urban Development Authority</strong><br/>
<strong>Mohali, Punjab</strong>
</p>
</div>`,
        publishDate: null,
        status: 'draft',
        siaId: siaIds[4],
        approvedBy: null,
        approvedAt: null,
      },
      {
        type: 'sec11' as const,
        refNo: 'SEC11-2024-005',
        title: 'Section 11 Notification - IT Park Development',
        bodyHtml: `<div style="font-family: 'Times New Roman', serif; line-height: 1.8;">
<h2 style="text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px;">
NOTIFICATION UNDER SECTION 11<br/>
THE RIGHT TO FAIR COMPENSATION AND TRANSPARENCY IN LAND ACQUISITION,<br/>
REHABILITATION AND RESETTLEMENT ACT, 2013
</h2>

<p style="text-align: center; font-weight: bold; margin-bottom: 15px;">
Punjab Urban Development Authority (PUDA)<br/>
Notification No. SEC11-2024-005<br/>
Dated: [Approved - Awaiting Publication]
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
WHEREAS, the Competent Authority is of the opinion that land is required for a public purpose, namely, <strong>"IT Park Development Project"</strong> for the establishment of a modern IT and technology hub with office spaces, data centers, and supporting infrastructure in Mohali;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, a preliminary Social Impact Assessment (SIA) has been conducted and indicates the need for comprehensive assessment;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
AND WHEREAS, this notification has been approved by the Legal Officer and is ready for publication;
</p>

<p style="text-indent: 30px; margin-bottom: 15px;">
NOW, THEREFORE, in exercise of the powers conferred by sub-section (1) of Section 11 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013 (30 of 2013), the Competent Authority hereby notifies that the land described in the Schedule below is required for the said public purpose.
</p>

<h3 style="font-size: 16px; font-weight: bold; margin-top: 25px; margin-bottom: 15px;">SCHEDULE</h3>

<p style="margin-bottom: 10px;"><strong>Project:</strong> IT Park Development Project</p>
<p style="margin-bottom: 10px;"><strong>Total Area:</strong> Approximately 150 acres (60.70 hectares)</p>
<p style="margin-bottom: 10px;"><strong>Location:</strong> Mohali, District SAS Nagar, Punjab</p>

<p style="margin-top: 20px; margin-bottom: 10px;"><strong>Details of Land Proposed for Acquisition:</strong></p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Agricultural Land: 135 acres</li>
<li>Residential Area: 10 acres (12 houses estimated)</li>
<li>Commercial Area: 5 acres (8 establishments estimated)</li>
<li>Total Number of Affected Families: 55 families (estimated)</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Purpose of Acquisition:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
The land is required for the development of a modern IT Park including:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>IT Office Buildings: 80 acres</li>
<li>Data Center Facilities: 30 acres</li>
<li>Commercial and Retail Spaces: 20 acres</li>
<li>Parking and Infrastructure: 20 acres</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Expected Benefits:</strong></p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Employment generation: 5000+ direct jobs</li>
<li>Technology infrastructure development</li>
<li>Economic growth and investment attraction</li>
<li>Skill development opportunities for local youth</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Compensation and Rehabilitation Framework:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px;">
All affected families shall be entitled to:
</p>
<ul style="margin-left: 40px; margin-bottom: 20px;">
<li>Market value of land plus 100% solatium</li>
<li>Compensation for structures and assets</li>
<li>Employment opportunities in IT park</li>
<li>Skill development for IT sector</li>
<li>Resettlement support</li>
</ul>

<p style="margin-top: 20px; margin-bottom: 15px;"><strong>Status:</strong></p>
<p style="text-indent: 30px; margin-bottom: 15px; background-color: #d4edda; padding: 15px; border-left: 4px solid #28a745;">
<strong>This notification has been approved by the Legal Officer and is ready for publication. Upon publication, objections will be invited from interested persons.</strong>
</p>

<p style="margin-top: 30px; text-align: right; margin-bottom: 5px;">
<strong>By Order and in the name of the Governor of Punjab</strong>
</p>

<p style="text-align: right; margin-top: 5px;">
<strong>Competent Authority</strong><br/>
<strong>Punjab Urban Development Authority</strong><br/>
<strong>Mohali, Punjab</strong>
</p>
</div>`,
        publishDate: null,
        status: 'approved',
        siaId: siaIds[5],
        approvedBy: legalOfficerId,
        approvedAt: new Date('2024-07-10'),
      },
    ];

    const notificationIds: number[] = [];
    for (const notifInfo of notificationData) {
      const [existing] = await db.select().from(landNotifications).where(eq(landNotifications.refNo, notifInfo.refNo)).limit(1);
      if (existing) {
        // Update existing notification with comprehensive bodyHtml
        await db.update(landNotifications)
          .set({ bodyHtml: notifInfo.bodyHtml })
          .where(eq(landNotifications.id, existing.id));
        notificationIds.push(existing.id);
        console.log(`  ✓ Updated land notification: ${existing.refNo} (${existing.type}, ${existing.status})`);
      } else {
        const [notif] = await db.insert(landNotifications).values({
          ...notifInfo,
          createdBy: caseOfficerId,
        }).returning();
        notificationIds.push(notif.id);
        console.log(`  ✓ Created land notification: ${notif.refNo} (${notif.type}, ${notif.status})`);

        // Link notification to parcels (link first 3-5 parcels to each notification)
        const parcelsToLink = parcelIds.slice(0, Math.min(5, parcelIds.length));
        for (const parcelId of parcelsToLink) {
          await db.insert(notificationParcels).values({
            notificationId: notif.id,
            parcelId,
          }).catch(() => {}); // Ignore if already exists
        }
      }
    }

    // Seed awards
    for (let i = 0; i < 5 && i < parcelIds.length; i++) {
      const [existing] = await db.select().from(awards).where(eq(awards.parcelId, parcelIds[i])).limit(1);
      if (!existing) {
        await db.insert(awards).values({
          awardNo: `AWARD-${String(i + 1).padStart(4, '0')}`,
          parcelId: parcelIds[i],
          ownerId: ownerIds[i % ownerIds.length],
          awardDate: new Date(`2024-0${i + 1}-15`),
          compensationAmount: (500000 + Math.random() * 2000000).toFixed(2),
          status: ['draft', 'issued', 'accepted'][i % 3],
          createdBy: caseOfficerId,
        }).catch(() => {});
        console.log(`  ✓ Created award for parcel ${parcelIds[i]}`);
      }
    }

    console.log(`${colors.green}  ✓ LAMS data seeded${colors.reset}\n`);
  } catch (error: any) {
    console.error(`${colors.red}  ✗ Error seeding LAMS data:${colors.reset}`, error.message);
  }
}

/**
 * Seed PMS data
 */
async function seedPMS(userMap: Map<string, number>): Promise<void> {
  console.log(`${colors.blue}${colors.bright}Seeding Property Management (PMS) data...${colors.reset}`);

  const estateOfficerId = userMap.get('estate_officer') || 1;
  const accountsOfficerId = userMap.get('accounts_officer') || 1;

  try {
    // Seed parties
    const partyNames = [
      'Ravi Kumar', 'Anita Devi', 'Suresh Patel', 'Meera Singh', 'Rajesh Verma',
      'Kavita Sharma', 'Amit Malhotra', 'Sunita Reddy', 'Vikram Das', 'Priya Lal'
    ];
    const partyIds: number[] = [];

    for (let i = 0; i < partyNames.length; i++) {
      const name = partyNames[i];
      const [existing] = await db.select().from(parties).where(eq(parties.name, name)).limit(1);
      
      if (existing) {
        partyIds.push(existing.id);
      } else {
        const [party] = await db.insert(parties).values({
          type: 'individual',
          name,
          address: `${i + 1}, Block ${i + 1}, Sector ${i + 1}, Mohali, Punjab`,
          phone: `+9198765432${i.toString().padStart(2, '0')}`,
          email: `party${i + 1}@example.com`,
          aadhaar: `5678${i.toString().padStart(8, '0')}`,
          pan: `FGHIJ${i.toString().padStart(4, '0')}K`,
          bankIfsc: 'HDFC0001234',
          bankAcct: `987654321${i.toString().padStart(2, '0')}`,
        }).returning();
        partyIds.push(party.id);
        console.log(`  ✓ Created party: ${name}`);
      }
    }

    // Seed schemes - create more schemes for better dashboard data
    const schemeData = [
      { name: 'Affordable Housing Scheme 2024', category: 'residential', status: 'published' },
      { name: 'Commercial Plots Scheme', category: 'commercial', status: 'published' },
      { name: 'Industrial Plots Scheme', category: 'industrial', status: 'published' },
      { name: 'Premium Housing Scheme 2024', category: 'residential', status: 'published' },
      { name: 'Mixed Use Development', category: 'commercial', status: 'published' },
      { name: 'Eco-Friendly Housing', category: 'residential', status: 'published' },
      { name: 'Old Housing Scheme 2023', category: 'residential', status: 'closed' },
      { name: 'Completed Commercial Scheme', category: 'commercial', status: 'closed' },
    ];
    const schemeIds: number[] = [];

    for (const schemeInfo of schemeData) {
      const [existing] = await db.select().from(schemes).where(eq(schemes.name, schemeInfo.name)).limit(1);
      
      if (existing) {
        schemeIds.push(existing.id);
      } else {
        const [scheme] = await db.insert(schemes).values({
          name: schemeInfo.name,
          category: schemeInfo.category,
          eligibilityJson: {
            minAge: 18,
            maxAge: 65,
            incomeLimit: schemeInfo.category === 'residential' ? 500000 : null,
            documents: ['aadhaar', 'pan', 'income_certificate'],
          },
          inventoryJson: {
            totalPlots: 50,
            availablePlots: 30,
            plotSizes: ['100 sqm', '150 sqm', '200 sqm'],
          },
          status: schemeInfo.status,
          createdBy: estateOfficerId,
        }).returning();
        schemeIds.push(scheme.id);
        console.log(`  ✓ Created scheme: ${schemeInfo.name}`);
      }
    }

    // Seed properties - create more properties for better dashboard data
    const propertyIds: number[] = [];
    for (let i = 0; i < 50; i++) {
      const schemeId = schemeIds[i % schemeIds.length] || null;
      const parcelNo = `PROP-${String(i + 1).padStart(4, '0')}`;

      const [existing] = await db.select().from(properties).where(eq(properties.parcelNo, parcelNo)).limit(1);
      
      if (existing) {
        propertyIds.push(existing.id);
      } else {
        const statusIndex = Math.floor(i / 10);
        const statuses = ['available', 'available', 'allotted', 'allotted', 'transferred'];
        const [property] = await db.insert(properties).values({
          schemeId,
          parcelNo,
          address: `${i + 1}, Block ${Math.floor(i / 5) + 1}, Sector ${(i % 5) + 1}, Mohali, Punjab`,
          area: (100 + Math.random() * 200).toFixed(2),
          landUse: ['residential', 'commercial', 'industrial'][i % 3],
          status: statuses[statusIndex] || 'available',
          lat: (30.7 + Math.random() * 0.1).toFixed(7),
          lng: (76.7 + Math.random() * 0.1).toFixed(7),
        }).returning();
        propertyIds.push(property.id);
        if (i < 10) console.log(`  ✓ Created property: ${parcelNo}`);

        // Create ownership if property is allotted
        if (property.status === 'allotted' || property.status === 'transferred') {
          const partyId = partyIds[i % partyIds.length];
          await db.insert(ownership).values({
            propertyId: property.id,
            partyId,
            sharePct: '100.00',
          }).catch(() => {});
        }
      }
    }

    // Seed applications - create more applications with better status distribution
    // Dashboard expects: submitted/verified (pending), selected (selected)
    const applicationStatuses = [
      'submitted', 'submitted', 'submitted', // pending
      'verified', 'verified', 'verified', // pending
      'in_draw', 'in_draw',
      'selected', 'selected', 'selected', // selected
      'allotted', 'allotted',
      'rejected', 'draft'
    ];
    
    for (let i = 0; i < 50; i++) {
      const schemeId = schemeIds[i % schemeIds.length];
      const partyId = partyIds[i % partyIds.length];
      const status = applicationStatuses[i % applicationStatuses.length];
      
      // Check if this exact combination exists
      const [existing] = await db.select()
        .from(applications)
        .where(and(
          eq(applications.schemeId, schemeId),
          eq(applications.partyId, partyId),
          eq(applications.status, status)
        ))
        .limit(1);
      
      if (!existing) {
        await db.insert(applications).values({
          schemeId,
          partyId,
          docsJson: { aadhaar: true, pan: true, income_cert: true },
          status,
          score: (60 + Math.random() * 40).toFixed(2),
          drawSeq: (status === 'in_draw' || status === 'selected' || status === 'allotted') && i < 30 ? i + 1 : null,
        }).catch(() => {});
        if (i < 10) console.log(`  ✓ Created application ${i + 1} (${status})`);
      }
    }

    // Seed allotments - create more with better status distribution
    // Dashboard expects: issued, accepted
    const allotmentStatuses = ['issued', 'issued', 'issued', 'accepted', 'accepted', 'draft'];
    
    for (let i = 0; i < 25 && i < propertyIds.length; i++) {
      if (propertyIds[i]) {
        const status = allotmentStatuses[i % allotmentStatuses.length];
        const [existing] = await db.select()
          .from(allotments)
          .where(and(
            eq(allotments.propertyId, propertyIds[i]),
            eq(allotments.status, status)
          ))
          .limit(1);
        
        if (!existing) {
          const partyId = partyIds[i % partyIds.length];
          // Create a valid issue date
          const month = Math.floor(i / 3) + 1;
          const day = (i % 28) + 1;
          const issueDate = new Date(2024, month - 1, day);
          
          await db.insert(allotments).values({
            propertyId: propertyIds[i],
            partyId,
            letterNo: `ALLOT-${String(i + 1).padStart(4, '0')}`,
            issueDate: issueDate,
            status,
            createdBy: estateOfficerId,
          }).catch(() => {});
          if (i < 5) console.log(`  ✓ Created allotment ${i + 1} (${status})`);
        }
      }
    }

    // Seed demand notes - create more with better status distribution
    // Dashboard expects: issued/part_paid (pending), overdue (overdue)
    const demandNoteStatuses = [
      'issued', 'issued', 'issued', // pending
      'part_paid', 'part_paid', 'part_paid', // pending
      'overdue', 'overdue', // overdue
      'paid', 'draft'
    ];
    
    for (let i = 0; i < 30 && i < propertyIds.length; i++) {
      if (propertyIds[i]) {
        const status = demandNoteStatuses[i % demandNoteStatuses.length];
        const [existing] = await db.select()
          .from(demandNotes)
          .where(and(
            eq(demandNotes.propertyId, propertyIds[i]),
            eq(demandNotes.status, status)
          ))
          .limit(1);
        
        if (!existing) {
          const partyId = partyIds[i % partyIds.length];
          const amount = (100000 + Math.random() * 500000).toFixed(2);
          await db.insert(demandNotes).values({
            propertyId: propertyIds[i],
            partyId,
            noteNo: `DEM-${String(i + 1).padStart(4, '0')}`,
            scheduleJson: {
              principal: amount,
              interest: (parseFloat(amount) * 0.1).toFixed(2),
              penalties: '0.00',
            },
            amount,
            dueDate: (() => {
              const month = Math.floor(i / 3) + 6;
              const day = (i % 28) + 1;
              return new Date(2024, month - 1, day);
            })(),
            status,
            createdBy: accountsOfficerId,
          }).catch(() => {});
          if (i < 5) console.log(`  ✓ Created demand note ${i + 1} (${status})`);
        }
      }
    }

    // Seed service requests - create more with better status distribution
    // Dashboard expects: new/under_review (pending), some overdue (>72 hours)
    const serviceRequestStatuses = [
      'new', 'new', 'new', // pending
      'under_review', 'under_review', 'under_review', // pending
      'approved', 'completed', 'rejected'
    ];
    const requestTypes = ['address_change', 'duplicate_document', 'correction', 'noc_request', 'ownership_transfer'];
    
    for (let i = 0; i < 20 && i < propertyIds.length; i++) {
      if (propertyIds[i]) {
        const status = serviceRequestStatuses[i % serviceRequestStatuses.length];
        const [existing] = await db.select()
          .from(serviceRequests)
          .where(and(
            eq(serviceRequests.propertyId, propertyIds[i]),
            eq(serviceRequests.status, status)
          ))
          .limit(1);
        
        if (!existing) {
          const partyId = partyIds[i % partyIds.length];
          
          const values: any = {
            propertyId: propertyIds[i],
            partyId,
            requestType: requestTypes[i % requestTypes.length],
            refNo: `SR-${String(i + 1).padStart(4, '0')}`,
            description: `Service request for ${requestTypes[i % requestTypes.length]}`,
            status,
            assignedTo: estateOfficerId,
          };
          // Add createdAt if the field exists and we want to set it for overdue calculation
          // Note: createdAt might be auto-generated, so we only set it if needed for overdue calculation
          try {
            if (status === 'new' || status === 'under_review') {
              const daysAgo = i % 3 === 0 ? 4 : 1; // Some 4 days old (overdue), some 1 day old
              const pastDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
              if (!isNaN(pastDate.getTime())) {
                values.createdAt = pastDate;
              }
            }
          } catch (e) {
            // If createdAt can't be set, continue without it
          }
          await db.insert(serviceRequests).values(values).catch((err) => {
            // Log error but continue - might be schema issue
            if (i < 3) console.log(`  ⚠ Skipped service request ${i + 1} due to error`);
          });
          if (i < 5) console.log(`  ✓ Created service request ${i + 1} (${status})`);
        }
      }
    }

    // Seed water connections
    for (let i = 0; i < 5 && i < propertyIds.length; i++) {
      if (propertyIds[i]) {
        const [existing] = await db.select()
          .from(waterConnections)
          .where(eq(waterConnections.propertyId, propertyIds[i]))
          .limit(1);
        
        if (!existing) {
          const partyId = partyIds[i % partyIds.length];
          await db.insert(waterConnections).values({
            propertyId: propertyIds[i],
            partyId,
            connectionNo: `WC-${String(i + 1).padStart(4, '0')}`,
            applicationDate: new Date(`2024-0${i + 1}-01`),
            connectionType: ['domestic', 'commercial', 'industrial'][i % 3],
            fee: (5000 + Math.random() * 15000).toFixed(2),
            status: ['applied', 'inspection_scheduled', 'sanctioned', 'active'][i % 4],
            createdBy: estateOfficerId,
          }).catch(() => {});
          if (i < 2) console.log(`  ✓ Created water connection ${i + 1}`);
        }
      }
    }

    // Seed registration cases
    for (let i = 0; i < 3 && i < propertyIds.length; i++) {
      if (propertyIds[i]) {
        const [existing] = await db.select()
          .from(registrationCases)
          .where(eq(registrationCases.propertyId, propertyIds[i]))
          .limit(1);
        
        if (!existing) {
          const fromPartyId = partyIds[i % partyIds.length];
          const toPartyId = partyIds[(i + 1) % partyIds.length];
          await db.insert(registrationCases).values({
            propertyId: propertyIds[i],
            caseNo: `REG-${String(i + 1).padStart(4, '0')}`,
            deedType: 'sale',
            fromPartyId,
            toPartyId,
            considerationAmount: (500000 + Math.random() * 1000000).toFixed(2),
            valuation: (600000 + Math.random() * 1200000).toFixed(2),
            stampDuty: (50000 + Math.random() * 100000).toFixed(2),
            registrationFee: (10000 + Math.random() * 20000).toFixed(2),
            status: ['draft', 'scheduled', 'under_verification', 'registered'][i % 4],
            kycVerified: i > 0,
            encumbranceChecked: i > 0,
            createdBy: estateOfficerId,
          }).catch(() => {});
          if (i < 2) console.log(`  ✓ Created registration case ${i + 1}`);
        }
      }
    }

    console.log(`${colors.green}  ✓ PMS data seeded${colors.reset}\n`);
  } catch (error: any) {
    console.error(`${colors.red}  ✗ Error seeding PMS data:${colors.reset}`, error.message);
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  Seed Data Script for PMS & LAMS${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (!process.env.DATABASE_URL) {
    console.error(`${colors.red}Error: DATABASE_URL environment variable is not set${colors.reset}`);
    process.exit(1);
  }

  try {
    // Check existing data
    const counts = await checkDataCounts();

    // Determine if we need to seed
    const needsSeeding = 
      counts.users < 5 ||
      counts.parcels < 10 ||
      counts.parties < 5 ||
      counts.schemes < 2 ||
      counts.properties < 10;

    // Always seed users first (they may be needed for LAMS/PMS data)
    const userMap = await seedUsers();

    if (!needsSeeding) {
      console.log(`${colors.yellow}Basic data appears to be already seeded.${colors.reset}\n`);
      console.log(`${colors.blue}Ensuring comprehensive LAMS data (SIAs and Notifications) exists...${colors.reset}\n`);
      
      // Always ensure comprehensive LAMS data exists
      await seedLAMS(userMap);
      
      // Always ensure comprehensive PMS data exists for dashboard
      console.log(`${colors.blue}Ensuring comprehensive PMS data exists for dashboards...${colors.reset}\n`);
      await seedPMS(userMap);
      
      console.log(`${colors.green}Data verification complete.${colors.reset}\n`);
      await pool.end();
      return;
    }

    console.log(`${colors.yellow}Insufficient data detected. Seeding database...${colors.reset}\n`);

    // Seed LAMS data
    await seedLAMS(userMap);

    // Seed PMS data
    await seedPMS(userMap);

    // Final check
    const finalCounts = await checkDataCounts();
    
    console.log(`${colors.bright}${colors.green}═══════════════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.green}  Seed Data Generation Complete!${colors.reset}`);
    console.log(`${colors.bright}${colors.green}═══════════════════════════════════════════════════════${colors.reset}\n`);

    console.log(`${colors.green}Summary:${colors.reset}`);
    console.log(`  Users: ${finalCounts.users}`);
    console.log(`  LAMS - Parcels: ${finalCounts.parcels}, Owners: ${finalCounts.owners}, SIA: ${finalCounts.sia}`);
    console.log(`  PMS - Schemes: ${finalCounts.schemes}, Properties: ${finalCounts.properties}, Parties: ${finalCounts.parties}`);
    console.log(`  Applications: ${finalCounts.applications}, Allotments: ${finalCounts.allotments}`);
    console.log(`  Demand Notes: ${finalCounts.demandNotes}, Service Requests: ${finalCounts.serviceRequests}\n`);

    console.log(`${colors.bright}Default login credentials:${colors.reset}`);
    console.log(`  Username: admin / case_officer / estate_officer / citizen1`);
    console.log(`  Password: password123\n`);

  } catch (error: any) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the script
main().catch(console.error);

