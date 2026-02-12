import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../../server/routes';
import { setupTestDatabase, clearDatabase, closeTestDb } from '../helpers/test-db';
import { testPatients, testDoctors } from '../fixtures/test-data';

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

describe('Patient User Journey Integration Test', () => {
    it('should complete full patient workflow successfully', async () => {
        // 1. Register doctor first (needed for appointments)
        const doctorRes = await request(app)
            .post('/api/auth/register')
            .send(testDoctors.doctor1)
            .expect(201);

        const doctorToken = doctorRes.body.token;
        const doctorId = doctorRes.body.user.id;

        // 2. Doctor sets availability
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const availEndTime = new Date(tomorrow);
        availEndTime.setHours(17, 0, 0, 0);

        await request(app)
            .post('/api/availability')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({
                doctorId,
                startTime: tomorrow,
                endTime: availEndTime
            })
            .expect(201);

        // 3. Patient registers
        const patientRegRes = await request(app)
            .post('/api/auth/register')
            .send(testPatients.patient1)
            .expect(201);

        expect(patientRegRes.body).toHaveProperty('token');
        expect(patientRegRes.body.user.role).toBe('patient');
        const patientToken = patientRegRes.body.token;
        const patientId = patientRegRes.body.user.id;

        // 4. Patient logs in again (testing login flow)
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                username: testPatients.patient1.username,
                password: testPatients.patient1.password
            })
            .expect(200);

        expect(loginRes.body.token).toBeTruthy();

        // 5. Patient browses doctors
        const doctorsRes = await request(app)
            .get('/api/doctors')
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(200);

        expect(doctorsRes.body.length).toBeGreaterThan(0);
        expect(doctorsRes.body[0].id).toBe(doctorId);

        // 6. Patient views specific doctor
        const doctorDetailRes = await request(app)
            .get(`/api/doctors/${doctorId}`)
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(200);

        expect(doctorDetailRes.body.specialization).toBe(testDoctors.doctor1.specialization);

        // 7. Patient checks doctor availability
        const availRes = await request(app)
            .get(`/api/doctors/${doctorId}/availability`)
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(200);

        expect(availRes.body.length).toBeGreaterThan(0);

        // 8. Patient books appointment
        const apptTime = new Date(tomorrow);
        apptTime.setHours(10, 0, 0, 0);
        const apptEndTime = new Date(apptTime);
        apptEndTime.setHours(11, 0, 0, 0);

        const bookingRes = await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patientToken}`)
            .send({
                doctorId,
                startTime: apptTime,
                endTime: apptEndTime,
                notes: 'Regular checkup'
            })
            .expect(201);

        const appointmentId = bookingRes.body.id;
        expect(bookingRes.body.status).toBe('confirmed');

        // 9. Patient views their appointments
        const myApptsRes = await request(app)
            .get('/api/appointments')
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(200);

        expect(myApptsRes.body.length).toBe(1);
        expect(myApptsRes.body[0].id).toBe(appointmentId);

        // 10. Patient reschedules appointment
        const newTime = new Date(tomorrow);
        newTime.setHours(14, 0, 0, 0);
        const newEndTime = new Date(newTime);
        newEndTime.setHours(15, 0, 0, 0);

        const rescheduleRes = await request(app)
            .patch(`/api/appointments/${appointmentId}/reschedule`)
            .set('Authorization', `Bearer ${patientToken}`)
            .send({
                startTime: newTime,
                endTime: newEndTime
            })
            .expect(200);

        expect(new Date(rescheduleRes.body.startTime).getHours()).toBe(14);

        // 11. Patient sends message to doctor
        const messageRes = await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${patientToken}`)
            .send({
                receiverId: doctorId,
                content: 'Looking forward to my appointment!'
            })
            .expect(201);

        expect(messageRes.body.content).toBeTruthy();

        // 12. Patient checks messages
        const messagesRes = await request(app)
            .get(`/api/messages/${doctorId}`)
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(200);

        expect(messagesRes.body.length).toBe(1);

        // 13. Patient cancels appointment
        const cancelRes = await request(app)
            .patch(`/api/appointments/${appointmentId}/cancel`)
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(200);

        expect(cancelRes.body.status).toBe('cancelled');

        // 14. Verify appointment is cancelled
        const finalApptsRes = await request(app)
            .get('/api/appointments')
            .set('Authorization', `Bearer ${patientToken}`)
            .expect(200);

        expect(finalApptsRes.body[0].status).toBe('cancelled');
    });
});
