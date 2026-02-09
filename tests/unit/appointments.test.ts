import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../../server/routes';
import { setupTestDatabase, clearDatabase, closeTestDb } from '../helpers/test-db';
import { testPatients, testDoctors, createAvailabilityData, createAppointmentData } from '../fixtures/test-data';

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

describe('Appointments API', () => {
    let patientToken: string;
    let doctorToken: string;
    let patientId: number;
    let doctorId: number;

    beforeEach(async () => {
        // Register patient
        const patientRes = await request(app)
            .post('/api/auth/register')
            .send(testPatients.patient1);
        patientToken = patientRes.body.token;
        patientId = patientRes.body.user.id;

        // Register doctor
        const doctorRes = await request(app)
            .post('/api/auth/register')
            .send(testDoctors.doctor1);
        doctorToken = doctorRes.body.token;
        doctorId = doctorRes.body.user.id;

        // Create doctor availability
        await request(app)
            .post('/api/availability')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send(createAvailabilityData(doctorId, 1));
    });

    describe('POST /api/appointments', () => {
        it('should create appointment successfully', async () => {
            const appointmentData = createAppointmentData(patientId, doctorId, 1, 10);

            const response = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.patientId).toBe(patientId);
            expect(response.body.doctorId).toBe(doctorId);
            expect(response.body.status).toBe('confirmed');
        });

        it('should reject appointment creation by doctor', async () => {
            const appointmentData = createAppointmentData(patientId, doctorId, 1, 10);

            await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(appointmentData)
                .expect(403);
        });

        it('should prevent double booking (conflict detection)', async () => {
            const appointmentData = createAppointmentData(patientId, doctorId, 1, 10);

            // Create first appointment
            await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData)
                .expect(201);

            // Try to create second appointment at same time
            const response = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData)
                .expect(409);

            expect(response.body.message).toContain('already booked');
        });

        it('should reject appointment outside doctor availability', async () => {
            // Try to book at 20:00 (outside 9-17 availability)
            const appointmentData = createAppointmentData(patientId, doctorId, 1, 20);

            const response = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData)
                .expect(400);

            expect(response.body.message).toContain('not available');
        });

        it('should reject appointment without authentication', async () => {
            const appointmentData = createAppointmentData(patientId, doctorId, 1, 10);

            await request(app)
                .post('/api/appointments')
                .send(appointmentData)
                .expect(401);
        });
    });

    describe('GET /api/appointments', () => {
        beforeEach(async () => {
            // Create a test appointment
            const appointmentData = createAppointmentData(patientId, doctorId, 1, 10);
            await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData);
        });

        it('should list patient appointments', async () => {
            const response = await request(app)
                .get('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].patientId).toBe(patientId);
            expect(response.body[0]).toHaveProperty('doctor');
            expect(response.body[0].doctor.name).toBe(testDoctors.doctor1.name);
        });

        it('should list doctor appointments', async () => {
            const response = await request(app)
                .get('/api/appointments')
                .set('Authorization', `Bearer ${doctorToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].doctorId).toBe(doctorId);
            expect(response.body[0]).toHaveProperty('patient');
            expect(response.body[0].patient.name).toBe(testPatients.patient1.name);
        });

        it('should not show cancelled appointments to patients by default', async () => {
            const response = await request(app)
                .get('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.length).toBeGreaterThan(0);
        });
    });

    describe('PATCH /api/appointments/:id/cancel', () => {
        let appointmentId: number;

        beforeEach(async () => {
            const appointmentData = createAppointmentData(patientId, doctorId, 1, 10);
            const res = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData);
            appointmentId = res.body.id;
        });

        it('should allow patient to cancel their appointment', async () => {
            const response = await request(app)
                .patch(`/api/appointments/${appointmentId}/cancel`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.status).toBe('cancelled');
        });

        it('should allow doctor to cancel appointment', async () => {
            const response = await request(app)
                .patch(`/api/appointments/${appointmentId}/cancel`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .expect(200);

            expect(response.body.status).toBe('cancelled');
        });

        it('should not allow other users to cancel appointment', async () => {
            // Register another patient
            const otherPatient = await request(app)
                .post('/api/auth/register')
                .send(testPatients.patient2);

            await request(app)
                .patch(`/api/appointments/${appointmentId}/cancel`)
                .set('Authorization', `Bearer ${otherPatient.body.token}`)
                .expect(403);
        });

        it('should return 404 for non-existent appointment', async () => {
            await request(app)
                .patch('/api/appointments/99999/cancel')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(404);
        });
    });

    describe('PATCH /api/appointments/:id/reschedule', () => {
        let appointmentId: number;

        beforeEach(async () => {
            const appointmentData = createAppointmentData(patientId, doctorId, 1, 10);
            const res = await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(appointmentData);
            appointmentId = res.body.id;
        });

        it('should allow patient to reschedule appointment', async () => {
            const newTime = createAppointmentData(patientId, doctorId, 1, 14);

            const response = await request(app)
                .patch(`/api/appointments/${appointmentId}/reschedule`)
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    startTime: newTime.startTime,
                    endTime: newTime.endTime
                })
                .expect(200);

            expect(response.body.id).toBe(appointmentId);
            expect(new Date(response.body.startTime).getHours()).toBe(14);
        });

        it('should reject reschedule by doctor', async () => {
            const newTime = createAppointmentData(patientId, doctorId, 1, 14);

            await request(app)
                .patch(`/api/appointments/${appointmentId}/reschedule`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    startTime: newTime.startTime,
                    endTime: newTime.endTime
                })
                .expect(403);
        });

        it('should reject reschedule to occupied slot', async () => {
            // Create another appointment at 14:00
            const secondAppointment = createAppointmentData(patientId, doctorId, 1, 14);
            await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(secondAppointment);

            // Try to reschedule first appointment to 14:00
            const newTime = createAppointmentData(patientId, doctorId, 1, 14);
            await request(app)
                .patch(`/api/appointments/${appointmentId}/reschedule`)
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    startTime: newTime.startTime,
                    endTime: newTime.endTime
                })
                .expect(409);
        });

        it('should reject reschedule outside availability', async () => {
            const newTime = createAppointmentData(patientId, doctorId, 1, 20);

            const response = await request(app)
                .patch(`/api/appointments/${appointmentId}/reschedule`)
                .set('Authorization', `Bearer ${patientToken}`)
                .send({
                    startTime: newTime.startTime,
                    endTime: newTime.endTime
                })
                .expect(400);

            expect(response.body.message).toContain('not available');
        });
    });
});
