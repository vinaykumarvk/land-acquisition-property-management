/**
 * Seed Data Script for Property Management and Land Acquisition Modules
 * 
 * This script:
 * 1. Checks existing data counts in the database
 * 2. Generates comprehensive seed data for testing and demos
 * 3. Creates users with appropriate roles
 * 4. Populates LAMS and PMS tables with realistic test data
 */

import { db, pool } from '../server/db';
import {
  users,
  parcels,
  owners,
  parcelOwners,
  sia,
  landNotifications,
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

    // Seed SIA
    const [existingSia] = await db.select().from(sia).limit(1);
    if (!existingSia) {
      const [siaRecord] = await db.insert(sia).values({
        noticeNo: 'SIA-2024-001',
        title: 'Social Impact Assessment for Industrial Corridor',
        description: 'Comprehensive SIA for proposed industrial corridor development project',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31'),
        status: 'published',
        publishedAt: new Date('2024-01-01'),
        createdBy: caseOfficerId,
      }).returning();
      console.log(`  ✓ Created SIA: ${siaRecord.noticeNo}`);
    }

    // Seed land notifications
    const [existingNotif] = await db.select().from(landNotifications).limit(1);
    if (!existingNotif) {
      const [notif] = await db.insert(landNotifications).values({
        type: 'sec11',
        refNo: 'SEC11-2024-001',
        title: 'Section 11 Notification - Industrial Corridor Project',
        bodyHtml: '<p>Notice under Section 11 of the Right to Fair Compensation and Transparency in Land Acquisition, Rehabilitation and Resettlement Act, 2013</p>',
        publishDate: new Date('2024-02-01'),
        status: 'published',
        createdBy: caseOfficerId,
        approvedBy: legalOfficerId,
        approvedAt: new Date('2024-01-28'),
      }).returning();
      console.log(`  ✓ Created land notification: ${notif.refNo}`);
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

    // Seed schemes
    const schemeData = [
      { name: 'Affordable Housing Scheme 2024', category: 'residential' },
      { name: 'Commercial Plots Scheme', category: 'commercial' },
      { name: 'Industrial Plots Scheme', category: 'industrial' },
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
          status: ['draft', 'published', 'closed'][schemeIds.length],
          createdBy: estateOfficerId,
        }).returning();
        schemeIds.push(scheme.id);
        console.log(`  ✓ Created scheme: ${schemeInfo.name}`);
      }
    }

    // Seed properties
    const propertyIds: number[] = [];
    for (let i = 0; i < 20; i++) {
      const schemeId = schemeIds[i % schemeIds.length] || null;
      const parcelNo = `PROP-${String(i + 1).padStart(4, '0')}`;

      const [existing] = await db.select().from(properties).where(eq(properties.parcelNo, parcelNo)).limit(1);
      
      if (existing) {
        propertyIds.push(existing.id);
      } else {
        const [property] = await db.insert(properties).values({
          schemeId,
          parcelNo,
          address: `${i + 1}, Block ${Math.floor(i / 5) + 1}, Sector ${(i % 5) + 1}, Mohali, Punjab`,
          area: (100 + Math.random() * 200).toFixed(2),
          landUse: ['residential', 'commercial', 'industrial'][i % 3],
          status: ['available', 'allotted', 'transferred'][Math.floor(i / 7)],
          lat: (30.7 + Math.random() * 0.1).toFixed(7),
          lng: (76.7 + Math.random() * 0.1).toFixed(7),
        }).returning();
        propertyIds.push(property.id);
        console.log(`  ✓ Created property: ${parcelNo}`);

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

    // Seed applications
    for (let i = 0; i < 15; i++) {
      const schemeId = schemeIds[i % schemeIds.length];
      const partyId = partyIds[i % partyIds.length];
      
      const [existing] = await db.select()
        .from(applications)
        .where(and(
          eq(applications.schemeId, schemeId),
          eq(applications.partyId, partyId)
        ))
        .limit(1);
      
      if (!existing) {
        await db.insert(applications).values({
          schemeId,
          partyId,
          docsJson: { aadhaar: true, pan: true, income_cert: true },
          status: ['draft', 'submitted', 'verified', 'in_draw', 'selected', 'allotted'][Math.floor(i / 3)],
          score: (60 + Math.random() * 40).toFixed(2),
          drawSeq: i < 10 ? i + 1 : null,
        }).catch(() => {});
        if (i < 5) console.log(`  ✓ Created application ${i + 1}`);
      }
    }

    // Seed allotments
    for (let i = 0; i < 8 && i < propertyIds.length; i++) {
      if (propertyIds[i]) {
        const [existing] = await db.select()
          .from(allotments)
          .where(eq(allotments.propertyId, propertyIds[i]))
          .limit(1);
        
        if (!existing) {
          const partyId = partyIds[i % partyIds.length];
          await db.insert(allotments).values({
            propertyId: propertyIds[i],
            partyId,
            letterNo: `ALLOT-${String(i + 1).padStart(4, '0')}`,
            issueDate: new Date(`2024-0${Math.floor(i / 3) + 1}-${(i % 28) + 1}`),
            status: ['draft', 'issued', 'accepted'][i % 3],
            createdBy: estateOfficerId,
          }).catch(() => {});
          if (i < 3) console.log(`  ✓ Created allotment ${i + 1}`);
        }
      }
    }

    // Seed demand notes
    for (let i = 0; i < 10 && i < propertyIds.length; i++) {
      if (propertyIds[i]) {
        const [existing] = await db.select()
          .from(demandNotes)
          .where(eq(demandNotes.propertyId, propertyIds[i]))
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
            dueDate: new Date(`2024-${String(Math.floor(i / 3) + 6).padStart(2, '0')}-${(i % 28) + 1}`),
            status: ['draft', 'issued', 'part_paid', 'paid', 'overdue'][i % 5],
            createdBy: accountsOfficerId,
          }).catch(() => {});
          if (i < 3) console.log(`  ✓ Created demand note ${i + 1}`);
        }
      }
    }

    // Seed service requests
    for (let i = 0; i < 5 && i < propertyIds.length; i++) {
      if (propertyIds[i]) {
        const [existing] = await db.select()
          .from(serviceRequests)
          .where(eq(serviceRequests.propertyId, propertyIds[i]))
          .limit(1);
        
        if (!existing) {
          const partyId = partyIds[i % partyIds.length];
          await db.insert(serviceRequests).values({
            propertyId: propertyIds[i],
            partyId,
            requestType: ['address_change', 'duplicate_document', 'correction', 'noc_request'][i % 4],
            refNo: `SR-${String(i + 1).padStart(4, '0')}`,
            description: `Service request for ${['address change', 'duplicate document', 'correction', 'NOC'][i % 4]}`,
            status: ['new', 'under_review', 'approved', 'completed'][i % 4],
            assignedTo: estateOfficerId,
          }).catch(() => {});
          if (i < 2) console.log(`  ✓ Created service request ${i + 1}`);
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

    if (!needsSeeding) {
      console.log(`${colors.yellow}Data appears to be already seeded. Use --force to re-seed.${colors.reset}\n`);
      console.log(`${colors.green}Current data counts look sufficient for testing.${colors.reset}\n`);
      await pool.end();
      return;
    }

    console.log(`${colors.yellow}Insufficient data detected. Seeding database...${colors.reset}\n`);

    // Seed users first
    const userMap = await seedUsers();

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

