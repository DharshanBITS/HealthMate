import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';
import * as schema from '@shared/schema';

const TEST_DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/healthmate_test';

let testPool: Pool | null = null;
let testDb: any = null;

/**
 * Initialize test database connection
 */
export async function initTestDb() {
    if (!testPool) {
        testPool = new Pool({
            connectionString: TEST_DATABASE_URL,
        });
        testDb = drizzle(testPool, { schema });
    }
    return testDb;
}

/**
 * Clear all data from test database
 */
export async function clearDatabase() {
    const db = await initTestDb();

    // Delete in order to respect foreign key constraints
    await db.delete(schema.messages);
    await db.delete(schema.medicalRecords);
    await db.delete(schema.prescriptions);
    await db.delete(schema.appointments);
    await db.delete(schema.availabilities);
    await db.delete(schema.users);
}

/**
 * Close test database connection
 */
export async function closeTestDb() {
    if (testPool) {
        await testPool.end();
        testPool = null;
        testDb = null;
    }
}

/**
 * Create database tables (run this before tests)
 */
export async function setupTestDatabase() {
    const db = await initTestDb();

    if (!testPool) return;

    // Create tables if they don't exist
    try {
        await testPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        specialization TEXT
      )
    `);

        await testPool.query(`
      CREATE TABLE IF NOT EXISTS availabilities (
        id SERIAL PRIMARY KEY,
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        is_booked BOOLEAN DEFAULT false
      )
    `);

        await testPool.query(`
      CREATE TABLE IF NOT EXISTS appointments (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP NOT NULL,
        status TEXT DEFAULT 'confirmed',
        notes TEXT
      )
    `);

        // Add unique constraint if it doesn't exist
        await testPool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE c.relname = 'unique_booking_idx'
          AND n.nspname = 'public'
        ) THEN
          CREATE UNIQUE INDEX unique_booking_idx ON appointments (doctor_id, start_time);
        END IF;
      END
      $$;
    `);

        await testPool.query(`
      CREATE TABLE IF NOT EXISTS prescriptions (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        date TIMESTAMP DEFAULT NOW() NOT NULL,
        medicines TEXT NOT NULL,
        notes TEXT
      )
    `);

        await testPool.query(`
      CREATE TABLE IF NOT EXISTS medical_records (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        file_type TEXT NOT NULL,
        upload_date TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

        await testPool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        receiver_id INTEGER NOT NULL REFERENCES users(id),
        content TEXT NOT NULL,
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL,
        is_read BOOLEAN DEFAULT false
      )
    `);
    } catch (error) {
        console.error('Error setting up test database:', error);
        throw error;
    }
}

/**
 * Drop all tables (cleanup)
 */
export async function dropTestDatabase() {
    if (!testPool) return;

    try {
        await testPool.query('DROP TABLE IF EXISTS messages CASCADE');
        await testPool.query('DROP TABLE IF EXISTS medical_records CASCADE');
        await testPool.query('DROP TABLE IF EXISTS prescriptions CASCADE');
        await testPool.query('DROP TABLE IF EXISTS appointments CASCADE');
        await testPool.query('DROP TABLE IF EXISTS availabilities CASCADE');
        await testPool.query('DROP TABLE IF EXISTS users CASCADE');
    } catch (error) {
        console.error('Error dropping test database:', error);
    }
}
