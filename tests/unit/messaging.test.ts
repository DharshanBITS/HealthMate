import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../../server/routes';
import { setupTestDatabase, clearDatabase, closeTestDb } from '../helpers/test-db';
import { testPatients, testDoctors, createMessageData } from '../fixtures/test-data';

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

describe('Messaging API', () => {
    let patient1Token: string;
    let patient2Token: string;
    let doctorToken: string;
    let patient1Id: number;
    let patient2Id: number;
    let doctorId: number;

    beforeEach(async () => {
        // Register users
        const patient1Res = await request(app)
            .post('/api/auth/register')
            .send(testPatients.patient1);
        patient1Token = patient1Res.body.token;
        patient1Id = patient1Res.body.user.id;

        const patient2Res = await request(app)
            .post('/api/auth/register')
            .send(testPatients.patient2);
        patient2Token = patient2Res.body.token;
        patient2Id = patient2Res.body.user.id;

        const doctorRes = await request(app)
            .post('/api/auth/register')
            .send(testDoctors.doctor1);
        doctorToken = doctorRes.body.token;
        doctorId = doctorRes.body.user.id;
    });

    describe('POST /api/messages', () => {
        it('should send message successfully', async () => {
            const messageData = createMessageData(patient1Id, doctorId, 'Hello doctor, I have a question');

            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${patient1Token}`)
                .send({ receiverId: doctorId, content: messageData.content })
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.senderId).toBe(patient1Id);
            expect(response.body.receiverId).toBe(doctorId);
            expect(response.body.content).toBe(messageData.content);
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body.isRead).toBe(false);
        });

        it('should automatically set senderId from authenticated user', async () => {
            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${patient1Token}`)
                .send({
                    senderId: 999, // Should be ignored
                    receiverId: doctorId,
                    content: 'Test message'
                })
                .expect(201);

            expect(response.body.senderId).toBe(patient1Id);
        });

        it('should validate required fields', async () => {
            await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${patient1Token}`)
                .send({
                    receiverId: doctorId
                    // missing content
                })
                .expect(400);
        });

        it('should allow doctor to send message to patient', async () => {
            const response = await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({
                    receiverId: patient1Id,
                    content: 'Regarding your appointment...'
                })
                .expect(201);

            expect(response.body.senderId).toBe(doctorId);
            expect(response.body.receiverId).toBe(patient1Id);
        });

        it('should require authentication', async () => {
            await request(app)
                .post('/api/messages')
                .send({ receiverId: doctorId, content: 'Test' })
                .expect(401);
        });
    });

    describe('GET /api/messages/:otherUserId', () => {
        beforeEach(async () => {
            // Send messages between patient1 and doctor
            await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${patient1Token}`)
                .send({ receiverId: doctorId, content: 'Message 1' });

            await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({ receiverId: patient1Id, content: 'Message 2' });

            await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${patient1Token}`)
                .send({ receiverId: doctorId, content: 'Message 3' });
        });

        it('should list messages between two users', async () => {
            const response = await request(app)
                .get(`/api/messages/${doctorId}`)
                .set('Authorization', `Bearer ${patient1Token}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(3);

            // Check messages are in chronological order
            expect(response.body[0].content).toBe('Message 1');
            expect(response.body[1].content).toBe('Message 2');
            expect(response.body[2].content).toBe('Message 3');
        });

        it('should show same conversation from both sides', async () => {
            const patientView = await request(app)
                .get(`/api/messages/${doctorId}`)
                .set('Authorization', `Bearer ${patient1Token}`)
                .expect(200);

            const doctorView = await request(app)
                .get(`/api/messages/${patient1Id}`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .expect(200);

            expect(patientView.body.length).toBe(doctorView.body.length);
            expect(patientView.body.length).toBe(3);
        });

        it('should not show messages from other conversations', async () => {
            // Send message between patient1 and patient2
            await request(app)
                .post('/api/messages')
                .set('Authorization', `Bearer ${patient1Token}`)
                .send({ receiverId: patient2Id, content: 'Private message' });

            // Doctor should not see this message
            const response = await request(app)
                .get(`/api/messages/${patient1Id}`)
                .set('Authorization', `Bearer ${doctorToken}`)
                .expect(200);

            const hasPrivateMessage = response.body.some((msg: any) =>
                msg.content === 'Private message'
            );
            expect(hasPrivateMessage).toBe(false);
        });

        it('should return empty array for no messages', async () => {
            const response = await request(app)
                .get(`/api/messages/${patient2Id}`)
                .set('Authorization', `Bearer ${patient1Token}`)
                .expect(200);

            expect(response.body).toEqual([]);
        });

        it('should require authentication', async () => {
            await request(app)
                .get(`/api/messages/${doctorId}`)
                .expect(401);
        });
    });

    describe('GET /api/conversations', () => {
        it('should list all doctors for patients', async () => {
            const response = await request(app)
                .get('/api/conversations')
                .set('Authorization', `Bearer ${patient1Token}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBeGreaterThan(0);

            // Should all be doctors
            response.body.forEach((user: any) => {
                expect(user.role).toBe('doctor');
                expect(user).not.toHaveProperty('password');
            });
        });

        it('should list patients with appointments for doctors', async () => {
            // Create availability and appointment first
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(10, 0, 0, 0);
            const endTime = new Date(tomorrow);
            endTime.setHours(17, 0, 0, 0);

            await request(app)
                .post('/api/availability')
                .set('Authorization', `Bearer ${doctorToken}`)
                .send({ doctorId, startTime: tomorrow, endTime });

            const apptTime = new Date(tomorrow);
            apptTime.setHours(11, 0, 0, 0);
            const apptEnd = new Date(apptTime);
            apptEnd.setHours(12, 0, 0, 0);

            await request(app)
                .post('/api/appointments')
                .set('Authorization', `Bearer ${patient1Token}`)
                .send({ doctorId, startTime: apptTime, endTime: apptEnd, notes: 'Test' });

            const response = await request(app)
                .get('/api/conversations')
                .set('Authorization', `Bearer ${doctorToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            // Should include patient1
            const hasPatient1 = response.body.some((user: any) => user.id === patient1Id);
            expect(hasPatient1).toBe(true);
        });

        it('should require authentication', async () => {
            await request(app)
                .get('/api/conversations')
                .expect(401);
        });
    });
});
