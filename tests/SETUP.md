# HealthMate Test Suite - Quick Setup Guide

## ⚠️ IMPORTANT: Database Configuration Required

**Current Status**: The test suite is configured but needs database.credentials to run.

**Error you're seeing**: `SASL: SCRAM-SERVER-FIRST-MESSAGE` - This means PostgreSQL cannot authenticate with the credentials in `tests/.env.test`.

### Step 1: Create Test Database

Open PostgreSQL command line (psql) or pgAdmin and run:

```sql
CREATE DATABASE healthmate_test;
```

To verify it was created:
```sql
\l
-- or in pgAdmin, refresh the database list
```

### Step 2: Update Test Environment Variables **← MUST DO THIS**

Edit `tests/.env.test` with your **ACTUAL** PostgreSQL credentials:

```env
DATABASE_URL=postgresql://postgres:YOUR_ACTUAL_PASSWORD@localhost:5432/healthmate_test
SESSION_SECRET=test_session_secret_for_testing_only
NODE_ENV=test
```

**Example** (if your PostgreSQL password is "admin123"):
```env
DATABASE_URL=postgresql://postgres:admin123@localhost:5432/healthmate_test
```

### Step 3: Run Tests

```bash
# Run all unit tests
npm run test:unit

# Run a single test file to verify setup
npm test -- tests/unit/auth.test.ts --no-coverage
```

## Common Issues

### Issue: "Cannot connect to database"

**Solution**: 
1. Check that PostgreSQL is running
2. Verify your credentials in `tests/.env.test`
3. Ensure the `healthmate_test` database exists

### Issue: Tests hang or timeout

**Solution**:
1. The test database might not be properly configured
2. Try manually connecting to the database:
   ```bash
   psql -U YOUR_USERNAME -d healthmate_test
   ```
3. If that works, the issue is with the connection string format

### Issue: "Table does not exist"

**Solution**: The tables are created automatically on first test run. If you see this error, try:
1. Drop and recreate the test database:
   ```sql
   DROP DATABASE healthmate_test;
   CREATE DATABASE healthmate_test;
   ```
2. Run tests again

## Test Commands

```bash
# All tests
npm test

# Unit tests only  
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode (useful during development)
npm run test:watch

# With coverage report
npm run test:coverage
```

## What the Tests Cover

✅ Authentication (registration, login, JWT)  
✅ Doctor management  
✅ Availability scheduling  
✅ Appointment booking with conflict detection  
✅ Prescriptions  
✅ Messaging  
✅ Complete patient & doctor workflows  

The test suite is completely isolated and won't affect your development database!
