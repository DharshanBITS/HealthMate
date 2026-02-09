import request from 'supertest';
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from '../../server/routes';
import { setupTestDatabase, clearDatabase, closeTestDb } from '../helpers/test-db';
import { testPatients, testDoctors } from '../fixtures/test-data';

let app: express.Express;
let server: any;

beforeAll(async () => {
    // Setup test database
    await setupTestDatabase();

    // Create Express app for testing
    app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));

    const httpServer = createServer(app);
    server = await registerRoutes(httpServer, app);
});

beforeEach(async () => {
    // Clear database before each test
    await clearDatabase();
});

afterAll(async () => {
    await closeTestDb();
});

describe('Authentication API', () => {
    describe('POST /api/auth/register', () => {
        it('should register a new patient successfully', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testPatients.patient1)
                .expect(201);

            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.username).toBe(testPatients.patient1.username);
            expect(response.body.user.role).toBe('patient');
            expect(response.body.user).not.toHaveProperty('password');
        });

        it('should register a new doctor successfully', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testDoctors.doctor1)
                .expect(201);

            expect(response.body).toHaveProperty('token');
            expect(response.body.user.username).toBe(testDoctors.doctor1.username);
            expect(response.body.user.role).toBe('doctor');
            expect(response.body.user.specialization).toBe(testDoctors.doctor1.specialization);
        });

        it('should reject registration with duplicate username', async () => {
            // Register first time
            await request(app)
                .post('/api/auth/register')
                .send(testPatients.patient1)
                .expect(201);

            // Try to register again with same username
            const response = await request(app)
                .post('/api/auth/register')
                .send(testPatients.patient1)
                .expect(409);

            expect(response.body.message).toContain('already exists');
        });

        it('should reject registration with invalid email', async () => {
            const invalidUser = {
                ...testPatients.patient1,
                email: 'invalid-email'
            };

            await request(app)
                .post('/api/auth/register')
                .send(invalidUser)
                .expect(400);
        });

        it('should reject registration with short password', async () => {
            const invalidUser = {
                ...testPatients.patient1,
                password: '12345' // Less than 6 characters
            };

            await request(app)
                .post('/api/auth/register')
                .send(invalidUser)
                .expect(400);
        });

        it('should hash password before storing', async () => {
            const response = await request(app)
                .post('/api/auth/register')
                .send(testPatients.patient1)
                .expect(201);

            // Password should not be returned
            expect(response.body.user).not.toHaveProperty('password');

            // Verify we can login with the plain password
            const loginResponse = await request(app)
                .post('/api/auth/login')
                .send({
                    username: testPatients.patient1.username,
                    password: testPatients.patient1.password
                })
                .expect(200);

            expect(loginResponse.body).toHaveProperty('token');
        });
    });

    describe('POST /api/auth/login', () => {
        beforeEach(async () => {
            // Register a user before each login test
            await request(app)
                .post('/api/auth/register')
                .send(testPatients.patient1);
        });

        it('should login successfully with valid credentials', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: testPatients.patient1.username,
                    password: testPatients.patient1.password
                })
                .expect(200);

            expect(response.body).toHaveProperty('token');
            expect(response.body).toHaveProperty('user');
            expect(response.body.user.username).toBe(testPatients.patient1.username);
        });

        it('should reject login with invalid username', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: 'nonexistent',
                    password: 'password123'
                })
                .expect(401);

            expect(response.body.message).toContain('Invalid credentials');
        });

        it('should reject login with invalid password', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: testPatients.patient1.username,
                    password: 'wrongpassword'
                })
                .expect(401);

            expect(response.body.message).toContain('Invalid credentials');
        });

        it('should return a valid JWT token', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .send({
                    username: testPatients.patient1.username,
                    password: testPatients.patient1.password
                })
                .expect(200);

            const token = response.body.token;
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);

            // Token should have 3 parts separated by dots
            const parts = token.split('.');
            expect(parts.length).toBe(3);
        });
    });

    describe('GET /api/auth/me', () => {
        let token: string;

        beforeEach(async () => {
            // Register and login to get token
            const response = await request(app)
                .post('/api/auth/register')
                .send(testPatients.patient1);

            token = response.body.token;
        });

        it('should return current user with valid token', async () => {
            const response = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.username).toBe(testPatients.patient1.username);
            expect(response.body.role).toBe('patient');
        });

        it('should reject request without token', async () => {
            await request(app)
                .get('/api/auth/me')
                .expect(401);
        });

        it('should reject request with invalid token', async () => {
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'Bearer invalid.token.here')
                .expect(403);
        });

        it('should reject request with malformed authorization header', async () => {
            await request(app)
                .get('/api/auth/me')
                .set('Authorization', 'InvalidFormat')
                .expect(401);
        });
    });
});
