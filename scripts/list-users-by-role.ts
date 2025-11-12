#!/usr/bin/env tsx
/**
 * Script to list all users grouped by role
 * Usage: npm run list-users or tsx scripts/list-users-by-role.ts
 */

import { db } from '../server/db';
import { users } from '../shared/schema';
import { asc } from 'drizzle-orm';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
};

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department?: string | null;
  phone?: string | null;
  isActive: boolean;
}

async function listUsersByRole() {
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}  Users by Role${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════════════${colors.reset}\n`);

  if (!process.env.DATABASE_URL) {
    console.error(`${colors.red}Error: DATABASE_URL environment variable is not set${colors.reset}`);
    process.exit(1);
  }

  try {
    // Fetch all users
    const allUsers = await db.select().from(users).orderBy(asc(users.role), asc(users.id));

    if (allUsers.length === 0) {
      console.log(`${colors.yellow}No users found in the database.${colors.reset}`);
      console.log(`${colors.blue}Run 'npm run seed' to create seed users.${colors.reset}\n`);
      return;
    }

    // Group users by role
    const usersByRole: Record<string, User[]> = {};
    
    allUsers.forEach((user) => {
      const role = user.role || 'unknown';
      if (!usersByRole[role]) {
        usersByRole[role] = [];
      }
      usersByRole[role].push({
        id: user.id,
        username: user.username,
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role || '',
        department: user.department,
        phone: user.phone || null,
        isActive: user.isActive ?? true,
      });
    });

    // Display users grouped by role
    const roleOrder = [
      'admin',
      'case_officer',
      'legal_officer',
      'finance_officer',
      'auditor',
      'citizen',
      'manager',
      'committee_member',
      'analyst',
      'finance',
    ];

    // Sort roles: known roles first, then others
    const sortedRoles = [
      ...roleOrder.filter(role => usersByRole[role]),
      ...Object.keys(usersByRole).filter(role => !roleOrder.includes(role)),
    ];

    let totalUsers = 0;

    sortedRoles.forEach((role) => {
      const roleUsers = usersByRole[role];
      totalUsers += roleUsers.length;

      const roleDisplayName = role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      console.log(`${colors.bright}${colors.cyan}${roleDisplayName} (${role})${colors.reset} - ${roleUsers.length} user(s)`);
      console.log(`${colors.gray}${'─'.repeat(70)}${colors.reset}`);

      roleUsers.forEach((user) => {
        const status = user.isActive ? colors.green('Active') : colors.red('Inactive');
        const dept = user.department ? ` | ${user.department}` : '';
        const phone = user.phone ? ` | ${user.phone}` : '';
        
        console.log(
          `  ${colors.yellow}ID: ${user.id.toString().padStart(3)}${colors.reset} | ` +
          `${colors.bright}${user.username}${colors.reset} | ` +
          `${user.firstName} ${user.lastName} | ` +
          `${user.email}${dept}${phone} | ${status}`
        );
      });
      console.log('');
    });

    console.log(`${colors.bright}${colors.green}Total Users: ${totalUsers}${colors.reset}\n`);

    // Summary table
    console.log(`${colors.bright}${colors.blue}Summary by Role:${colors.reset}`);
    console.log(`${colors.gray}${'─'.repeat(40)}${colors.reset}`);
    sortedRoles.forEach((role) => {
      const count = usersByRole[role].length;
      const roleDisplayName = role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      console.log(`  ${roleDisplayName.padEnd(25)} ${colors.yellow}${count}${colors.reset}`);
    });
    console.log('');

  } catch (error: any) {
    console.error(`${colors.red}Error fetching users:${colors.reset}`, error.message);
    process.exit(1);
  }
}

// Run the script
listUsersByRole()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(`${colors.red}Unexpected error:${colors.reset}`, error);
    process.exit(1);
  });

