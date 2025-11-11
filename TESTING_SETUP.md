# PMS Testing & QA Setup

## Overview
This document outlines the testing infrastructure and strategy for the Property Management System (PMS).

## Testing Framework
- **Framework**: Vitest (compatible with Vite/TypeScript)
- **Coverage**: @vitest/coverage-v8
- **Location**: `tests/` directory

## Test Structure
```
tests/
├── test-utils/
│   └── test-helpers.ts          # Common test utilities
├── unit/
│   └── services/
│       └── propertyManagement/
│           ├── schemeService.test.ts
│           ├── demandNoteService.test.ts
│           └── utilityService.test.ts
├── integration/
│   └── (to be created)
└── e2e/
    └── (to be created)
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Categories

### 1. Unit Tests
- **Purpose**: Test individual service methods in isolation
- **Location**: `tests/unit/`
- **Coverage**: 
  - Service methods
  - Business logic
  - State transitions
  - Validators
  - Calculators

### 2. Integration Tests (Planned)
- **Purpose**: Test service interactions and database operations
- **Location**: `tests/integration/`
- **Coverage**:
  - Happy paths (apply→draw→allot, demand→payment→receipt)
  - Transfer→NOC→conveyance flow
  - Inspection→certificate flow
  - Registration flow

### 3. E2E Tests (Planned)
- **Purpose**: Test complete user journeys
- **Framework**: Playwright or Cypress
- **Coverage**:
  - Citizen journeys
  - Officer workflows
  - Negative test cases

### 4. Security Tests (Planned)
- **Purpose**: Test security controls
- **Coverage**:
  - Authorization (RBAC)
  - IDOR prevention
  - File upload security
  - QR/hash verification

### 5. Performance Tests (Planned)
- **Purpose**: Verify performance requirements (p95 < 2s)
- **Coverage**:
  - List endpoints
  - PDF generation
  - Dashboard load times

## Test Utilities

### Test Helpers (`tests/test-utils/test-helpers.ts`)
- `createTestUser()` - Create test users
- `createTestParty()` - Create test parties
- `createTestProperty()` - Create test properties
- `createTestScheme()` - Create test schemes
- `createTestApplication()` - Create test applications
- `createTestDemandNote()` - Create test demand notes
- `cleanupTestData()` - Clean up test data
- `wait()` - Wait for async operations
- `mockDate()` - Mock dates for testing

## Current Test Coverage

### ✅ Implemented
- Scheme Service tests
- Demand Note Service tests
- Utility Service tests

### 🚧 In Progress
- Integration tests
- E2E tests
- Security tests
- Performance tests

## Test Data Management

### Test Database
- Tests use the same database as development
- Each test should clean up its data
- Use `beforeEach` and `afterEach` hooks for setup/teardown

### Test Isolation
- Each test should be independent
- Use unique identifiers (timestamps) to avoid conflicts
- Clean up test data after each test

## Best Practices

1. **Test Naming**: Use descriptive test names that explain what is being tested
2. **Arrange-Act-Assert**: Structure tests clearly
3. **One Assertion Per Test**: Focus each test on one behavior
4. **Mock External Dependencies**: Mock database, external APIs, etc.
5. **Test Edge Cases**: Test both happy paths and error cases
6. **Keep Tests Fast**: Unit tests should run quickly
7. **Maintain Test Data**: Keep test data realistic but minimal

## Next Steps

1. ✅ Set up Vitest framework
2. ✅ Create test utilities
3. ✅ Write unit tests for core services
4. 🚧 Write integration tests for happy paths
5. 🚧 Set up E2E testing framework
6. 🚧 Write security tests
7. 🚧 Write performance tests
8. 🚧 Set up CI/CD test pipeline

## Notes

- Tests are currently using the actual database (consider using a test database)
- Some tests may need mocking for external services (GIS, payment gateways)
- Coverage target: >80% for critical services

