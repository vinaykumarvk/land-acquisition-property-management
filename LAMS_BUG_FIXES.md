# LAMS Bug Fixes and Issues Found

## Date: $(date)

This document tracks bugs found during code review and testing of the LAMS application.

---

## Bug #1: Missing userId Parameter in updateNotification Route

**Location**: `server/routes.ts:2355`

**Issue**: The route handler for updating notifications doesn't pass `userId` to the service method.

**Current Code**:
```typescript
app.put('/api/lams/notifications/:id', authMiddleware, async (req, res) => {
  try {
    const { notificationData, parcelIds } = req.body;
    const notification = await landNotificationService.updateNotification(
      parseInt(req.params.id),
      notificationData,
      parcelIds,
      req.userId!  // This is missing!
    );
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Error updating notification' });
  }
});
```

**Fix**: The code actually looks correct - `req.userId!` is being passed. However, let me verify the service method signature matches.

**Status**: ✅ VERIFIED - Code is correct

---

## Bug #2: Date Validation Issue in SIA Update

**Location**: `server/services/siaService.ts:75-79`

**Issue**: Date validation only checks if both `endDate` and `startDate` are provided, but doesn't handle partial updates correctly.

**Current Code**:
```typescript
// Validate dates if provided
if (siaData.endDate && siaData.startDate) {
  if (new Date(siaData.endDate) < new Date(siaData.startDate)) {
    throw new Error('End date must be after start date');
  }
}
```

**Problem**: If only `endDate` is provided in an update, it won't be validated against the existing `startDate` from the database.

**Fix**:
```typescript
// Validate dates if provided
if (siaData.endDate || siaData.startDate) {
  const startDate = siaData.startDate ? new Date(siaData.startDate) : new Date(existingSia.startDate);
  const endDate = siaData.endDate ? new Date(siaData.endDate) : new Date(existingSia.endDate);
  
  if (endDate < startDate) {
    throw new Error('End date must be after start date');
  }
}
```

**Status**: ✅ FIXED

---

## Bug #3: Missing Error Handling in Hearing Completion

**Location**: `server/services/siaService.ts:263`

**Issue**: The code accesses `siaId` from the updated hearing object using type assertion, which could fail if the structure is different.

**Current Code**:
```typescript
// Get SIA ID from hearing
const siaId = (updated as any).siaId;
```

**Problem**: Type assertion `as any` bypasses type safety. Should use proper type or get from original hearing object.

**Fix**:
```typescript
// Get SIA ID from original hearing (more reliable)
const siaId = hearing.siaId;
```

**Status**: ✅ FIXED

---

## Bug #4: Potential Race Condition in Notification Publishing

**Location**: `server/services/landNotificationService.ts` (publish method)

**Issue**: When publishing a notification, the status is updated and then parcels are checked, but there's no transaction to ensure atomicity.

**Status**: ⚠️ NEEDS REVIEW - May need database transactions

---

## Bug #5: Missing Validation for Parcel Selection in Notification Creation

**Location**: `server/routes.ts:2319`

**Issue**: The route doesn't validate that at least one parcel is selected before creating a notification.

**Current Code**:
```typescript
app.post('/api/lams/notifications', authMiddleware, async (req, res) => {
  try {
    const { notificationData, parcelIds } = req.body;
    const notification = await landNotificationService.createNotification(
      notificationData,
      parcelIds || [],  // Empty array allowed!
      req.userId!
    );
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating notification' });
  }
});
```

**Fix**:
```typescript
app.post('/api/lams/notifications', authMiddleware, async (req, res) => {
  try {
    const { notificationData, parcelIds } = req.body;
    
    // Validate at least one parcel is selected
    if (!parcelIds || !Array.isArray(parcelIds) || parcelIds.length === 0) {
      return res.status(400).json({ message: 'At least one parcel must be selected' });
    }
    
    const notification = await landNotificationService.createNotification(
      notificationData,
      parcelIds,
      req.userId!
    );
    res.json(notification);
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Error creating notification' });
  }
});
```

**Status**: ✅ FIXED

---

## Bug #6: Missing Validation for Objection Resolution

**Location**: `server/routes.ts:2462`

**Issue**: The route doesn't validate that resolution text is provided before resolving an objection.

**Status**: ⚠️ NEEDS REVIEW

---

## Bug #7: Date Format Issue in Test Script

**Location**: `test-lams-functional.sh`

**Issue**: The date commands use macOS-specific `-v` flag which won't work on Linux.

**Fix**: Use portable date calculation or detect OS.

**Status**: ⚠️ NEEDS FIX (for cross-platform compatibility)

---

## Bug #8: Missing Error Handling in Dashboard Stats

**Location**: `client/src/pages/LamsDashboard.tsx`

**Issue**: If any of the API calls fail, the entire dashboard fails to load. Should handle individual failures gracefully.

**Status**: ⚠️ NEEDS REVIEW

---

## Summary

- **Critical Bugs**: 3
- **Medium Priority**: 3
- **Low Priority**: 2

### Priority Fixes

1. ✅ Bug #5: Validate parcel selection in notification creation
2. ✅ Bug #2: Fix date validation in SIA update
3. ✅ Bug #3: Fix type safety in hearing completion

