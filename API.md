# API Documentation

Base URL: `/api`

## Authentication

### POST /api/auth/register
Register a new user (patient or doctor).
**Body:**
```json
{
  "username": "user1",
  "password": "password123",
  "role": "patient", // or "doctor"
  "name": "John Doe",
  "specialization": "Cardiology" // required if role is doctor
}
```

### POST /api/auth/login
**Body:**
```json
{
  "username": "user1",
  "password": "password123"
}
```
**Response:** `{ "token": "...", "user": {...} }`

### GET /api/auth/me
Get current user profile. Requires `Authorization: Bearer <token>`.

## Doctors

### GET /api/doctors
List all doctors.

### GET /api/doctors/:id
Get doctor details.

### GET /api/doctors/:id/availability
Get availability slots for a doctor.

## Availability

### POST /api/availability
Create availability block (Doctor only).
**Body:**
```json
{
  "startTime": "2023-10-27T09:00:00Z",
  "endTime": "2023-10-27T17:00:00Z"
}
```

## Appointments

### GET /api/appointments
List my appointments.

### POST /api/appointments
Book an appointment (Patient only).
**Body:**
```json
{
  "doctorId": 1,
  "startTime": "2023-10-27T09:00:00Z",
  "endTime": "2023-10-27T09:30:00Z",
  "notes": "Checkup"
}
```

### PATCH /api/appointments/:id/cancel
Cancel an appointment.
