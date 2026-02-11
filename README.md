# HealthMate — Appointment Scheduler

HealthMate is a full-stack appointment scheduling application connecting patients with doctors. It features user registration/authentication, doctor availability management, appointment booking with conflict detection, and role-based dashboards.

## Features

**Patients:**
- Register & Login (JWT Auth)
- View Dashboard (Upcoming Appointments)
- Find Doctors by name/specialization
- View Doctor Availability
- Book Appointments (Conflict detection enabled)
- Reschedule Appointments
- Cancel Appointments

**Doctors:**
- Register & Login
- Manage Availability (Set working slots)
- View Dashboard (Today's Schedule)

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (JSON Web Tokens) with bcrypt password hashing
- **State Management**: TanStack Query
- **Email notification**: Resend API

## Prerequisites

Before you begin, ensure you have the following installed on your local machine:
- **Node.js**: v20 or higher
- **npm**: v10 or higher
- **PostgreSQL**: v15 or higher (running locally or via a cloud provider like Neon)

## Local Setup Instructions

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd healthmate
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup
You need a PostgreSQL database. You can use a local PostgreSQL installation or a cloud-hosted one (e.g., Neon).

1.  **Create a database**: Create a new database named `healthmate`.
2.  **Environment Variables**: Create a `.env` file in the root directory:
    ```env
    DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/healthmate
    SESSION_SECRET=your_long_random_session_secret
    ```
    *Note: Replace `<username>`, `<password>`, `<host>`, and `<port>` with your actual database credentials.*

### 4. Push Database Schema
Sync your database with the application's schema using Drizzle:
```bash
npm run db:push
```

### 5. Seed Data (Optional)
To populate the database with initial testing data (doctors and patients):
```bash
npx tsx server/seed.ts
```

### 6. Start the Application
Run the development server (starts both frontend and backend):
```bash
npm run dev
```

The application will be available at `http://localhost:5000`.

## Hosting for Assignment

To host this application for your assignment, you can use:
- **Full-stack Hosting**: Platforms like **Render**, **Railway**, or **Fly.io** are recommended as they support both the Node.js server and PostgreSQL database in one environment.

### Production Build
To create a production build locally:
```bash
npm run build
npm start
```
