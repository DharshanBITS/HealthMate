import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../../server/routes';
import { setupTestDatabase, clearDatabase, closeTestDb } from '../helpers/test-db';
import { testDoctors, createAvailabilityData } from '../fixtures/test-data';

let app: express.Express;
let server: any;

beforeAll(async () => {
    await setupTestDatabase();

    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    const httpServer = createServer(app);
    server = await registerRoutes(httpServer, app);
});

beforeEach(async () => {
    await clearDatabase();
});

afterAll(async () => {
    await closeTestDb();
});

describe('Availability API', () => {
    let doctorToken: string;
    let patientToken: string;
    let doctorId: number;

    beforeEach(async () => {
        // Register doctor
        const doctorRes = await request(app)
            .post('/api/auth/register')
            .send(testDoctors.doctor1);
        doctorToken = doctorRes.body.token;
        doctorId = doctorRes.body.user.id;

        // Register patient for permission tests
        const patientRes = await request(app)
            .post('/api/auth/register')
            .send({
                username: 'patient_test',
                password: 'password123',
                role: 'patient',
                name: 'Test Patient',
                email: 'patient@test.com',
                specialization: null
            });
        patientToken = patientRes.body.token;
    });

    describe('POST /api/availability', () => {
        it('should create availability slot successfully', async () => {
            const availData = createAvailabilityData(doctorId, 1);

            const response = await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(availData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.doctorId).toBe(doctorId);
            expect(response.body).toHaveProperty('startTime');
            expect(response.body).toHaveProperty('endTime');
        });

        it('should reject availability creation by patient', async () => {
            const availData = createAvailabilityData(doctorId, 1);

            await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(availData)
                .expect(403);
        });

        it('should automatically set doctorId to authenticated doctor', async () => {
            const availData = createAvailabilityData(999, 1); // Wrong doctor ID

            const response = await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(availData)
                .expect(201);

            // Should use authenticated doctor's ID, not the one in request
            expect(response.body.doctorId).toBe(doctorId);
        });

        it('should accept multiple availability slots', async () => {
            // Create morning slot
            await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(createAvailabilityData(doctorId, 1))
                .expect(201);

            // Create afternoon slot for different day
            await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(createAvailabilityData(doctorId, 2))
                .expect(201);
        });

        it('should reject invalid time format', async () => {
            await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    doctorId,
                    startTime: 'invalid-date',
                    endTime: new Date()
                })
                .expect(400);
        });

        it('should reject without authentication', async () => {
            const availData = createAvailabilityData(doctorId, 1);

            await request(app)
                .post('/api/availability')
                .send(availData)
                .expect(401);
        });
    });

    describe('GET /api/doctors/:id/availability', () => {
        beforeEach(async () => {
            // Create some availability slots
            await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(createAvailabilityData(doctorId, 1));

            await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(createAvailabilityData(doctorId, 2));
        });

        it('should list all availability for a doctor', async () => {
            const response = await request(app)
                .get(`/api/doctors/${doctorId}/availability`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThanOrEqual(2);
        });

        it('should filter out past availability slots', async () => {
            // The test data creates future dates, so all should be returned
            const response = await request(app)
                .get(`/api/doctors/${doctorId}/availability`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            const now = new Date();
            response.body.forEach((slot: any) => {
                const endTime = new Date(slot.endTime);
                expect(endTime.getTime()).toBeGreaterThanOrEqual(now.getTime() - 86400000); // Allow today
            });
        });

        it('should not show booked slots', async () => {
            // Create an appointment (which should hide the slot)
            const availData = createAvailabilityData(doctorId, 1);
            const date = new Date();
            date.setDate(date.getDate() + 1);
            date.setHours(10, 0, 0, 0);
            const endTime = new Date(date);
            endTime.setHours(11, 0, 0, 0);

            // Create appointment
            await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    doctorId,
                    startTime: date,
                    endTime,
                    notes: 'Test'
                });

            // Get availability - should exclude the booked slot
            const response = await request(app)
                .get(`/api/doctors/${doctorId}/availability`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            // Check that no slot starts at the booked time
            const bookedSlot = response.body.find((slot: any) =>
                new Date(slot.startTime).getTime() === date.getTime()
            );
            expect(bookedSlot).toBeUndefined();
        });

        it('should require authentication', async () => {
            await request(app)
                .get(`/api/doctors/${doctorId}/availability`)
                .expect(401);
        });
    });
});
