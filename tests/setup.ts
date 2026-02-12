/// <reference types="jest" />
import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
config({ path: resolve(__dirname, '.env.test') });

// Mock nodemailer to prevent sending real emails during tests
jest.mock('../server/lib/email', () => ({
    sendEmail: jest.fn().mockResolvedValue(true),
    emailTemplates: {
        appointmentConfirmed: jest.fn((name: string, doctor: string, time: string) => ({
            subject: 'Appointment Confirmed',
            text: `Appointment confirmed for ${name} with ${doctor} at ${time}`
        })),
        newPrescription: jest.fn((name: string, doctor: string) => ({
            subject: 'New Prescription',
            text: `New prescription from ${doctor}`
        })),
        newMessage: jest.fn((sender: string) => ({
            subject: 'New Message',
            text: `New message from ${sender}`
        }))
    }
}));

// Set test timeout
jest.setTimeout(10000);

// Global test setup
beforeAll(async () => {
    // Database will be setup in individual test files or helpers
    console.log('🧪 Test suite starting...');
});

afterAll(async () => {
    console.log('✅ Test suite completed');
});
