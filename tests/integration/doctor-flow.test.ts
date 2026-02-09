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

describe('Doctor User Journey Integration Test', () => {
    it('should complete full doctor workflow successfully', async () => {
        // 1. Doctor registers
        const doctorRegRes = await request(app)
            .post('/api/auth/register')
            .send(testDoctors.doctor1)
            .expect(201);

        expect(doctorRegRes.body).toHaveProperty('token');
        expect(doctorRegRes.body.user.role).toBe('doctor');
        const doctorToken = doctorRegRes.body.token;
        const doctorId = doctorRegRes.body.user.id;

        // 2. Doctor logs in
        const loginRes = await request(app)
            .post('/api/auth/login')
            .send({
                username: testDoctors.doctor1.username,
                password: testDoctors.doctor1.password
            })
            .expect(200);

        expect(loginRes.body.token).toBeTruthy();

        // 3. Doctor sets availability for tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        const availEndTime = new Date(tomorrow);
        availEndTime.setHours(17, 0, 0, 0);

        const availRes = await request(app)
            .post('/api/availability')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({
                doctorId,
                startTime: tomorrow,
                endTime: availEndTime
            })
            .expect(201);

        expect(availRes.body.doctorId).toBe(doctorId);

        // 4. Doctor sets availability for next week
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(9, 0, 0, 0);
        const nextWeekEnd = new Date(nextWeek);
        nextWeekEnd.setHours(17, 0, 0, 0);

        await request(app)
            .post('/api/availability')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({
                doctorId,
                startTime: nextWeek,
                endTime: nextWeekEnd
            })
            .expect(201);

        // 5. Patient registers and books appointment
        const patientRes = await request(app)
            .post('/api/auth/register')
            .send(testPatients.patient1);

        const patientToken = patientRes.body.token;
        const patientId = patientRes.body.user.id;

        const apptTime = new Date(tomorrow);
        apptTime.setHours(10, 0, 0, 0);
        const apptEndTime = new Date(apptTime);
        apptEndTime.setHours(11, 0, 0, 0);

        await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patientToken}`)
            .send({
                doctorId,
                startTime: apptTime,
                endTime: apptEndTime,
                notes: 'Consultation needed'
            })
            .expect(201);

        // 6. Doctor views their appointments
        const apptsRes = await request(app)
            .get('/api/appointments')
            .set('Authorization', `Bearer ${doctorToken}`)
            .expect(200);

        expect(apptsRes.body.length).toBe(1);
        expect(apptsRes.body[0]).toHaveProperty('patient');
        expect(apptsRes.body[0].patient.name).toBe(testPatients.patient1.name);

        // 7. Doctor creates prescription for patient
        const prescriptionRes = await request(app)
            .post('/api/prescriptions')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({
                patientId,
                doctorId,
                medicines: JSON.stringify([
                    { name: 'Paracetamol', dosage: '500mg', frequency: 'Twice daily' }
                ]),
                notes: 'Take after meals'
            })
            .expect(201);

        expect(prescriptionRes.body.patientId).toBe(patientId);

        // 8. Doctor views their prescriptions
        const prescriptionsRes = await request(app)
            .get('/api/prescriptions')
            .set('Authorization', `Bearer ${doctorToken}`)
            .expect(200);

        expect(prescriptionsRes.body.length).toBe(1);
        expect(prescriptionsRes.body[0]).toHaveProperty('patient');

        // 9. Doctor sends message to patient
        await request(app)
            .post('/api/messages')
            .set('Authorization', `Bearer ${doctorToken}`)
            .send({
                receiverId: patientId,
                content: 'Please arrive 15 minutes early for your appointment'
            })
            .expect(201);

        // 10. Doctor checks messages
        const messagesRes = await request(app)
            .get(`/api/messages/${patientId}`)
            .set('Authorization', `Bearer ${doctorToken}`)
            .expect(200);

        expect(messagesRes.body.length).toBe(1);

        // 11. Doctor views analytics
        const analyticsRes = await request(app)
            .get('/api/doctor/analytics')
            .set('Authorization', `Bearer ${doctorToken}`)
            .expect(200);

        expect(analyticsRes.body).toHaveProperty('totalAppointments');
        expect(analyticsRes.body).toHaveProperty('completedAppointments');
        expect(analyticsRes.body).toHaveProperty('cancelledAppointments');
        expect(analyticsRes.body).toHaveProperty('trends');
        expect(analyticsRes.body.totalAppointments).toBe(1);

        // 12. Create another patient and appointment
        const patient2Res = await request(app)
            .post('/api/auth/register')
            .send(testPatients.patient2);

        const patient2Token = patient2Res.body.token;

        const appt2Time = new Date(tomorrow);
        appt2Time.setHours(12, 0, 0, 0);
        const appt2EndTime = new Date(appt2Time);
        appt2EndTime.setHours(13, 0, 0, 0);

        await request(app)
            .post('/api/appointments')
            .set('Authorization', `Bearer ${patient2Token}`)
            .send({
                doctorId,
                startTime: appt2Time,
                endTime: appt2EndTime,
                notes: 'Follow-up visit'
            })
            .expect(201);

        // 13. Verify doctor sees both appointments
        const allApptsRes = await request(app)
            .get('/api/appointments')
            .set('Authorization', `Bearer ${doctorToken}`)
            .expect(200);

        expect(allApptsRes.body.length).toBe(2);

        // 14. Doctor checks conversation list
        const conversationsRes = await request(app)
            .get('/api/conversations')
            .set('Authorization', `Bearer ${doctorToken}`)
            .expect(200);

        // Should show both patients
        expect(conversationsRes.body.length).toBeGreaterThanOrEqual(2);
    });
});
