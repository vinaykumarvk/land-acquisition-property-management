# PMS Test Suite

This directory contains all tests for the Property Management System (PMS).

## Structure

```
tests/
├── setup.ts                    # Test environment setup
├── test-utils/
│   ├── test-helpers.ts        # Test data creation utilities
│   ├── test-skip.ts           # Database availability checks
│   └── lazy-db.ts            # Lazy database imports
├── unit/
│   └── services/
│       └── propertyManagement/
│           ├── schemeService.test.ts
│           ├── demandNoteService.test.ts
│           └── utilityService.test.ts
├── integration/               # (Planned)
└── e2e/                      # (Planned)
```

## Quick Start

1. **Set up environment:**
   ```bash
   export DATABASE_URL="your_database_connection_string"
   ```

2. **Run tests:**
   ```bash
   npm test
   ```

3. **Watch mode:**
   ```bash
   npm run test:watch
   ```

4. **With coverage:**
   ```bash
   npm run test:coverage
   ```

## Test Categories

### Unit Tests
Test individual service methods in isolation.

**Location:** `tests/unit/`

**Coverage:**
- Service methods
- Business logic
- Validators
- Calculators

### Integration Tests (Planned)
Test service interactions and database operations.

**Coverage:**
- Happy paths (apply→draw→allot, demand→payment→receipt)
- Transfer→NOC→conveyance flow
- Inspection→certificate flow
- Registration flow

### E2E Tests (Planned)
Test complete user journeys.

**Framework:** Playwright or Cypress

**Coverage:**
- Citizen journeys
- Officer workflows
- Negative test cases

## Test Utilities

### Creating Test Data

```typescript
import { createTestUser, createTestProperty } from '../test-utils/test-helpers';

const userId = await createTestUser({ role: 'admin' });
const propertyId = await createTestProperty();
```

### Skipping Tests Without Database

Tests automatically skip if `DATABASE_URL` is not set. No manual intervention needed.

## Best Practices

1. **Isolation:** Each test should be independent
2. **Cleanup:** Always clean up test data in `afterEach`
3. **Naming:** Use descriptive test names
4. **One Assertion:** Focus each test on one behavior
5. **Realistic Data:** Use realistic but minimal test data

## Troubleshooting

See [TEST_RESULTS.md](../TEST_RESULTS.md) for detailed troubleshooting guide.

