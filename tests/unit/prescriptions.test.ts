import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../../server/routes';
import { setupTestDatabase, clearDatabase, closeTestDb } from '../helpers/test-db';
import { testPatients, testDoctors, createPrescriptionData } from '../fixtures/test-data';

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

describe('Prescriptions API', () => {
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
    });

    describe('POST /api/prescriptions', () => {
        it('should create prescription successfully', async () => {
            const prescriptionData = createPrescriptionData(patientId, doctorId);

            const response = await request(app)
                .post('/api/prescriptions')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(prescriptionData)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.patientId).toBe(patientId);
            expect(response.body.doctorId).toBe(doctorId);
            expect(response.body).toHaveProperty('date');
            expect(response.body.medicines).toBeTruthy();
        });

        it('should reject prescription creation by patient', async () => {
            const prescriptionData = createPrescriptionData(patientId, doctorId);

            await request(app)
                .post('/api/prescriptions')
                .set('Authorization', `Bearer ${patientToken}`)
                .send(prescriptionData)
                .expect(403);
        });

        it('should automatically set doctorId to authenticated doctor', async () => {
            const prescriptionData = createPrescriptionData(patientId, 999);

            const response = await request(app)
                .post('/api/prescriptions')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(prescriptionData)
                .expect(201);

            expect(response.body.doctorId).toBe(doctorId);
        });

        it('should validate medicines field is present', async () => {
            const invalidData = {
                patientId,
                doctorId,
                notes: 'Test'
                // missing medicines
            };

            const res = await request(app)
                .post('/api/prescriptions')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(invalidData);

            if (res.status === 500) {
                console.log("500 Error Body:", res.body);
            }
            expect(res.status).toBe(400);
        });

        it('should accept notes field', async () => {
            const prescriptionData = {
                ...createPrescriptionData(patientId, doctorId),
                notes: 'Take with food, avoid alcohol'
            };

            const response = await request(app)
                .post('/api/prescriptions')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(prescriptionData)
                .expect(201);

            expect(response.body.notes).toBe(prescriptionData.notes);
        });

        it('should require authentication', async () => {
            const prescriptionData = createPrescriptionData(patientId, doctorId);

            await request(app)
                .post('/api/prescriptions')
                .send(prescriptionData)
                .expect(401);
        });
    });

    describe('GET /api/prescriptions', () => {
        beforeEach(async () => {
            // Create test prescription
            const prescriptionData = createPrescriptionData(patientId, doctorId);
            await request(app)
                .post('/api/prescriptions')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send(prescriptionData);
        });

        it('should list prescriptions for patient', async () => {
            const response = await request(app)
                .get('/api/prescriptions')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].patientId).toBe(patientId);
            expect(response.body[0]).toHaveProperty('doctor');
            expect(response.body[0].doctor.name).toBe(testDoctors.doctor1.name);
        });

        it('should list prescriptions created by doctor', async () => {
            const response = await request(app)
                .get('/api/prescriptions')
                .set('Authorization', `Bearer ${doctorToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].doctorId).toBe(doctorId);
            expect(response.body[0]).toHaveProperty('patient');
            expect(response.body[0].patient.name).toBe(testPatients.patient1.name);
        });

        it('should return empty array for user with no prescriptions', async () => {
            // Register new patient without prescriptions
            const newPatient = await request(app)
                .post('/api/auth/register')
                .send(testPatients.patient2);

            const response = await request(app)
                .get('/api/prescriptions')
                .set('Authorization', `Bearer ${newPatient.body.token}`)
                .expect(200);

            expect(response.body).toEqual([]);
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/prescriptions')
                .expect(401);
        });
    });
});
