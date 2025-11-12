/**
 * User Role Definitions for LAMS (Land Acquisition Management System)
 * 
 * Supports both LAMS roles and legacy Investment Portal roles for backward compatibility
 */

// LAMS Roles
export const LAMS_ROLES = {
  ADMIN: 'admin',
  CASE_OFFICER: 'case_officer',
  LEGAL_OFFICER: 'legal_officer',
  FINANCE_OFFICER: 'finance_officer',
  CITIZEN: 'citizen',
  AUDITOR: 'auditor',
} as const;

// Legacy Investment Portal Roles (for backward compatibility)
export const LEGACY_ROLES = {
  ANALYST: 'analyst',
  MANAGER: 'manager',
  COMMITTEE_MEMBER: 'committee_member',
  FINANCE: 'finance',
  ADMIN: 'admin',
} as const;

// All roles combined
export const ALL_ROLES = {
  ...LAMS_ROLES,
  ...LEGACY_ROLES,
} as const;

export type LAMSRole = typeof LAMS_ROLES[keyof typeof LAMS_ROLES];
export type LegacyRole = typeof LEGACY_ROLES[keyof typeof LEGACY_ROLES];
export type UserRole = LAMSRole | LegacyRole;

// Role hierarchy for permissions (higher number = more permissions)
// Note: LAMS_ROLES.ADMIN and LEGACY_ROLES.ADMIN both have value 'admin', so we only include one
export const ROLE_HIERARCHY: Record<string, number> = {
  [LAMS_ROLES.ADMIN]: 100, // Same as LEGACY_ROLES.ADMIN
  [LAMS_ROLES.CASE_OFFICER]: 80,
  [LAMS_ROLES.LEGAL_OFFICER]: 70,
  [LAMS_ROLES.FINANCE_OFFICER]: 70, // Same as LEGACY_ROLES.FINANCE
  [LAMS_ROLES.AUDITOR]: 50,
  [LAMS_ROLES.CITIZEN]: 10,
  // Legacy roles (excluding duplicates)
  [LEGACY_ROLES.MANAGER]: 80,
  [LEGACY_ROLES.COMMITTEE_MEMBER]: 70,
  [LEGACY_ROLES.ANALYST]: 50,
};

// Role display names
// Note: LAMS_ROLES.ADMIN and LEGACY_ROLES.ADMIN both have value 'admin', so we only include one
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  [LAMS_ROLES.ADMIN]: 'Administrator', // Same as LEGACY_ROLES.ADMIN
  [LAMS_ROLES.CASE_OFFICER]: 'Case Officer',
  [LAMS_ROLES.LEGAL_OFFICER]: 'Legal Officer',
  [LAMS_ROLES.FINANCE_OFFICER]: 'Finance Officer', // Same as LEGACY_ROLES.FINANCE
  [LAMS_ROLES.CITIZEN]: 'Citizen',
  [LAMS_ROLES.AUDITOR]: 'Auditor',
  // Legacy roles (excluding duplicates)
  [LEGACY_ROLES.MANAGER]: 'Manager',
  [LEGACY_ROLES.COMMITTEE_MEMBER]: 'Committee Member',
  [LEGACY_ROLES.ANALYST]: 'Analyst',
};

// Role permissions matrix
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  [LAMS_ROLES.ADMIN]: [
    'all', // Admin has all permissions
  ],
  [LAMS_ROLES.CASE_OFFICER]: [
    'sia.create',
    'sia.edit',
    'sia.publish',
    'notification.create',
    'notification.edit',
    'objection.resolve',
    'valuation.create',
    'award.create',
    'award.edit',
    'possession.schedule',
    'possession.certificate',
  ],
  [LAMS_ROLES.LEGAL_OFFICER]: [
    'notification.approve',
    'notification.publish',
    'objection.review',
  ],
  [LAMS_ROLES.FINANCE_OFFICER]: [
    'award.approve',
    'payment.create',
    'payment.approve',
  ],
  [LAMS_ROLES.CITIZEN]: [
    'sia.feedback',
    'objection.submit',
    'document.view',
  ],
  [LAMS_ROLES.AUDITOR]: [
    'all.view',
    'report.view',
  ],
};

// Helper functions
export function hasPermission(role: string, permission: string): boolean {
  if (role === LAMS_ROLES.ADMIN || role === LEGACY_ROLES.ADMIN) {
    return true;
  }
  
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission) || permissions.includes('all');
}

export function getRoleDisplayName(role: string): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

export function isLAMSRole(role: string): boolean {
  return Object.values(LAMS_ROLES).includes(role as LAMSRole);
}

export function isLegacyRole(role: string): boolean {
  return Object.values(LEGACY_ROLES).includes(role as LegacyRole);
}

export function canAccessFeature(role: string, feature: string): boolean {
  // Admin can access everything
  if (role === LAMS_ROLES.ADMIN || role === LEGACY_ROLES.ADMIN) {
    return true;
  }

  // Feature-based access control
  const featureAccess: Record<string, string[]> = {
    'sia_management': [LAMS_ROLES.ADMIN, LAMS_ROLES.CASE_OFFICER],
    'notification_management': [LAMS_ROLES.ADMIN, LAMS_ROLES.CASE_OFFICER, LAMS_ROLES.LEGAL_OFFICER],
    'objection_management': [LAMS_ROLES.ADMIN, LAMS_ROLES.CASE_OFFICER, LAMS_ROLES.LEGAL_OFFICER],
    'compensation_management': [LAMS_ROLES.ADMIN, LAMS_ROLES.CASE_OFFICER, LAMS_ROLES.FINANCE_OFFICER],
    'possession_management': [LAMS_ROLES.ADMIN, LAMS_ROLES.CASE_OFFICER],
    'reports': [LAMS_ROLES.ADMIN, LAMS_ROLES.AUDITOR, LAMS_ROLES.CASE_OFFICER],
    'citizen_portal': [LAMS_ROLES.CITIZEN],
    // Legacy features
    'investment_management': [LEGACY_ROLES.ADMIN, LEGACY_ROLES.ANALYST],
    'approval_workflow': [LEGACY_ROLES.ADMIN, LEGACY_ROLES.MANAGER, LEGACY_ROLES.COMMITTEE_MEMBER, LEGACY_ROLES.FINANCE],
  };

  const allowedRoles = featureAccess[feature] || [];
  return allowedRoles.includes(role);
}

