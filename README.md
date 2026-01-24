# HealthMate — Appointment Scheduler

A full-stack appointment scheduling application connecting Patients and Doctors.
Built as a Sprint 1 MVP on Replit.

## Features

**Patients:**
- Register & Login (JWT Auth)
- View Dashboard (Upcoming Appointments)
- Find Doctors by name/specialization
- View Doctor Availability
- Book Appointments (Conflict detection enabled)
- Cancel Appointments

**Doctors:**
- Register & Login
- Manage Availability (Set working slots)
- View Dashboard (Today's Schedule)

## Tech Stack

- **Frontend:** React, Tailwind CSS, Shadcn UI, TanStack Query
- **Backend:** Node.js, Express, Drizzle ORM
- **Database:** PostgreSQL (via Replit DB)
- **Auth:** JWT + Bcrypt

## Setup & Run

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   The project is configured to use Replit's PostgreSQL.
   The schema is managed by Drizzle ORM.
   
   To push schema changes:
   ```bash
   npm run db:push
   ```

3. **Seed Data:**
   Populate the database with 3 doctors and 3 patients:
   ```bash
   npx tsx server/seed.ts
   ```

4. **Run Application:**
   Starts both backend (port 5000) and frontend (Vite).
   ```bash
   npm run dev
   ```

## Testing (Manual)

**1. Login as Doctor**
- Username: `drsmith`
- Password: `password123`
- Go to "My Availability" to see generated slots.

**2. Login as Patient**
- Username: `alice`
- Password: `password123`
- Go to "Find Doctors", select Dr. Smith, and book a slot.

**3. Verify Conflict**
- Try to book the same slot again with user `bob`.
- You should see an error: "This slot is already booked".

## Testing (Backend)

Run the included seed script to reset data, then use the frontend to verify flows.
For automated testing, you can add Jest/Supertest.

## Environment Variables

See `.env.example`.
- `DATABASE_URL`: Connection string for PostgreSQL.
- `SESSION_SECRET`: Secret for signing JWTs.
