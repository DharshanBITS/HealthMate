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

describe('Doctors API', () => {
    let patientToken: string;
    let doctor1Token: string;
    let doctor2Token: string;
    let doctor1Id: number;
    let doctor2Id: number;

    beforeEach(async () => {
        // Register patient
        const patientRes = await request(app)
            .post('/api/auth/register')
            .send(testPatients.patient1);
        patientToken = patientRes.body.token;

        // Register doctors
        const doctor1Res = await request(app)
            .post('/api/auth/register')
            .send(testDoctors.doctor1);
        doctor1Token = doctor1Res.body.token;
        doctor1Id = doctor1Res.body.user.id;

        const doctor2Res = await request(app)
            .post('/api/auth/register')
            .send(testDoctors.doctor2);
        doctor2Token = doctor2Res.body.token;
        doctor2Id = doctor2Res.body.user.id;
    });

    describe('GET /api/doctors', () => {
        it('should list all doctors', async () => {
            const response = await request(app)
                .get('/api/doctors')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);

            const specializations = response.body.map((d: any) => d.specialization);
            expect(specializations).toContain('Cardiology');
            expect(specializations).toContain('General Medicine');
        });

        it('should not include passwords in response', async () => {
            const response = await request(app)
                .get('/api/doctors')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            response.body.forEach((doctor: any) => {
                expect(doctor).not.toHaveProperty('password');
            });
        });

        it('should only return users with doctor role', async () => {
            const response = await request(app)
                .get('/api/doctors')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            response.body.forEach((user: any) => {
                expect(user.role).toBe('doctor');
            });
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/doctors')
                .expect(401);
        });
    });

    describe('GET /api/doctors/:id', () => {
        it('should get specific doctor details', async () => {
            const response = await request(app)
                .get(`/api/doctors/${doctor1Id}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(200);

            expect(response.body.id).toBe(doctor1Id);
            expect(response.body.name).toBe(testDoctors.doctor1.name);
            expect(response.body.specialization).toBe(testDoctors.doctor1.specialization);
            expect(response.body).not.toHaveProperty('password');
        });

        it('should return 404 for non-existent doctor', async () => {
            await request(app)
                .get('/api/doctors/99999')
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(404);
        });

        it('should return 404 when requesting patient as doctor', async () => {
            // Get patient ID
            const patientRes = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${patientToken}`);

            const patientId = patientRes.body.id;

            // Try to get patient via doctors endpoint
            await request(app)
                .get(`/api/doctors/${patientId}`)
                .set('Authorization', `Bearer ${patientToken}`)
                .expect(404);
        });

        it('should require authentication', async () => {
            await request(app)
                .get(`/api/doctors/${doctor1Id}`)
                .expect(401);
        });
    });
});
