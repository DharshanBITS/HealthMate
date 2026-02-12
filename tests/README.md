# HealthMate Test Suite

Comprehensive test suite for the HealthMate appointment scheduling application. The tests are completely isolated from the production code and can be executed separately.

## Overview

This test suite includes:
- **Unit Tests**: Test individual API endpoints and functions
- **Integration Tests**: Test complete user workflows end-to-end
- **Test Coverage**: Automated coverage reporting

## Prerequisites

Before running the tests, ensure you have:

1. **Node.js** v20+ and npm v10+ installed
2. **PostgreSQL** v15+ installed and running
3. A separate test database created (recommended: `healthmate_test`)

## Setup Instructions

### 1. Install Dependencies

All testing dependencies are already installed in the project. If you need to reinstall:

```bash
npm install
```

The following test dependencies are included:
- `jest` - Test framework
- `ts-jest` - TypeScript support for Jest
- `supertest` - HTTP testing library
- `@types/jest` and `@types/supertest` - TypeScript definitions

### 2. Create Test Database

Create a separate PostgreSQL database for testing:

```sql
CREATE DATABASE healthmate_test;
```

> **Important**: The test suite uses a separate database to avoid interfering with your development or production data.

### 3. Configure Test Environment

The test environment is pre-configured in `tests/.env.test`. Update the `DATABASE_URL` if needed:

```env
DATABASE_URL=postgresql://localhost:5432/healthmate_test
SESSION_SECRET=test_session_secret_for_testing_only
NODE_ENV=test
```

**Note**: Replace `localhost:5432` with your PostgreSQL connection details if different.

### 4. Initialize Test Database

The test suite automatically creates database tables on first run. No manual migration is needed.

## Running Tests

### Run All Tests

```bash
npm test
```

This runs both unit and integration tests.

### Run Unit Tests Only

```bash
npm run test:unit
```

Tests individual API endpoints:
- Authentication (register, login, JWT)
- User management
- Doctor listing
- Availability management
- Appointments (create, list, cancel, reschedule)
- Prescriptions
- Messaging
- Analytics

### Run Integration Tests Only

```bash
npm run test:integration
```

Tests complete user workflows:
- Patient journey (registration → booking → messaging → cancellation)
- Doctor journey (setup → appointments → prescriptions → analytics)

### Run Tests in Watch Mode

```bash
npm run test:watch
```

Automatically reruns tests when you save files. Useful during development.

### Generate Coverage Report

```bash
npm run test:coverage
```

Generates a detailed coverage report in the `coverage/` directory. Open `coverage/lcov-report/index.html` in your browser to view the report.

**Coverage targets**:
- Lines: 70%
- Functions: 70%
- Branches: 70%
- Statements: 70%

## Test Structure

```
tests/
├── setup.ts                    # Global test setup
├── .env.test                   # Test environment variables
├── helpers/
│   ├── test-db.ts             # Database utilities
│   └── test-utils.ts          # Helper functions
├── fixtures/
│   └── test-data.ts           # Test data generators
├── unit/                       # Unit tests
│   ├── auth.test.ts
│   ├── appointments.test.ts
│   ├── availability.test.ts
│   ├── doctors.test.ts
│   ├── prescriptions.test.ts
│   └── messaging.test.ts
└── integration/                # Integration tests
    ├── patient-flow.test.ts
    └── doctor-flow.test.ts
```

## Key Features

### Isolated Test Database

- Tests use a dedicated `healthmate_test` database
- Database is cleared before each test to ensure isolation
- No impact on development or production data

### Automatic Email Mocking

- Email sending is automatically mocked during tests
- No actual emails are sent
- Configured in `tests/setup.ts`

### Comprehensive Coverage

The test suite covers:

✅ **Authentication**
- User registration (patients and doctors)
- Login with credentials
- JWT token generation and validation
- Protected route authentication

✅ **Doctors**
- List all doctors
- Get specific doctor details
- Role-based filtering

✅ **Availability**
- Create availability slots (doctors only)
- List available slots
- Filter past and booked slots

✅ **Appointments**
- Book appointments
- Conflict detection (double-booking prevention)
- Cancel appointments
- Reschedule appointments
- List appointments by role

✅ **Prescriptions**
- Create prescriptions (doctors only)
- List prescriptions for patients
- List prescriptions by doctor

✅ **Messaging**
- Send messages between users
- List conversation history
- Get conversation list

✅ **Analytics**
- Doctor analytics dashboard
- Appointment statistics
- 7-day trends

## Troubleshooting

### Tests Fail with Database Connection Error

**Problem**: Cannot connect to PostgreSQL
**Solution**: 
1. Ensure PostgreSQL is running
2. Verify connection details in `tests/.env.test`
3. Check that the test database exists

```bash
# Check if PostgreSQL is running (Windows)
pg_ctl status

# Verify database exists
psql -U postgres -l | findstr healthmate_test
```

### Tests Fail with "Table does not exist"

**Problem**: Database tables not created
**Solution**: The test suite creates tables automatically. If issues persist:
1. Clear the test database
2. Run tests again (tables will be recreated)

```sql
DROP DATABASE healthmate_test;
CREATE DATABASE healthmate_test;
```

### Import/Module Errors

**Problem**: Cannot find modules or TypeScript errors
**Solution**: 
1. Ensure all dependencies are installed: `npm install`
2. Check that `jest.config.js` module mappings are correct

### Port Already in Use

**Problem**: Test server fails to start
**Solution**: The tests create their own isolated Express instance and don't require a specific port. If you see this error, check if something else is using your database connection.

## Test Development Guidelines

### Adding New Tests

1. **Unit Tests**: Add to appropriate file in `tests/unit/`
2. **Integration Tests**: Add to `tests/integration/`
3. Follow existing patterns for consistency
4. Use test helpers from `tests/helpers/` and fixtures from `tests/fixtures/`

### Test Naming Convention

```typescript
describe('Feature Name', () => {
  describe('HTTP_METHOD /api/endpoint', () => {
    it('should do something successfully', async () => {
      // Test implementation
    });
    
    it('should reject invalid input', async () => {
      // Test implementation
    });
  });
});
```

### Best Practices

- ✅ Clear database before each test (`beforeEach`)
- ✅ Use descriptive test names
- ✅ Test both success and error cases
- ✅ Verify response structure and status codes
- ✅ Check authentication and authorization
- ✅ Test edge cases (conflicts, validation, etc.)

## Continuous Integration

To integrate with CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: npm test
  
- name: Generate coverage
  run: npm run test:coverage
```

## Test Execution Time

- **Unit Tests**: ~5-10 seconds
- **Integration Tests**: ~10-15 seconds
- **Full Suite**: ~15-25 seconds

Times may vary based on system performance and database speed.

## Support

If you encounter issues with the test suite:
1. Check this README for troubleshooting steps
2. Verify your database connection
3. Ensure all dependencies are installed
4. Check test output for specific error messages

---

**Happy Testing! 🧪**
