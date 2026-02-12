import { signToken } from '../../server/auth';
import { hashPassword } from '../../server/auth';
import type { User, InsertUser } from '@shared/schema';

/**
 * Generate a test JWT token for a user
 */
export function generateTestToken(user: Partial<User> & { id: number; role: string }) {
    return signToken(user as User);
}

/**
 * Create test user data
 */
export async function createTestUser(overrides: Partial<InsertUser> = {}): Promise<InsertUser> {
    const defaults: InsertUser = {
        username: `testuser_${Date.now()}`,
        password: await hashPassword('password123'),
        role: 'patient',
        name: 'Test User',
        email: 'test@example.com',
        specialization: null
    };

    return { ...defaults, ...overrides };
}

/**
 * Create test doctor data
 */
export async function createTestDoctor(overrides: Partial<InsertUser> = {}): Promise<InsertUser> {
    const defaults: InsertUser = {
        username: `testdoctor_${Date.now()}`,
        password: await hashPassword('password123'),
        role: 'doctor',
        name: 'Dr. Test',
        email: 'doctor@example.com',
        specialization: 'General Medicine'
    };

    return { ...defaults, ...overrides };
}

/**
 * Create test appointment data
 */
export function createTestAppointment(patientId: number, doctorId: number, overrides: any = {}) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(11, 0, 0, 0);

    return {
        patientId,
        doctorId,
        startTime: tomorrow,
        endTime,
        notes: 'Test appointment',
        ...overrides
    };
}

/**
 * Create test availability data
 */
export function createTestAvailability(doctorId: number, overrides: any = {}) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const endTime = new Date(tomorrow);
    endTime.setHours(17, 0, 0, 0);

    return {
        doctorId,
        startTime: tomorrow,
        endTime,
        ...overrides
    };
}

/**
 * Wait for a specified time
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date for API requests
 */
export function formatDateForApi(date: Date): string {
    return date.toISOString();
}
