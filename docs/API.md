# HealthMate API Documentation

**Base URL:** `http://localhost:5000/api/v1`

---

## Authentication Endpoints

### Patient Registration
```http
POST /auth/patient/register
```

### Patient Login
```http
POST /auth/patient/login
```

### Doctor Registration
```http
POST /auth/doctor/register
```

### Doctor Login
```http
POST /auth/doctor/login
```

---

## Appointment Endpoints

### Book Appointment
```http
POST /appointments
```

### Get Patient Appointments
```http
GET /appointments/patient/:patientId
```

### Get Doctor Appointments
```http
GET /appointments/doctor/:doctorId
```

### Cancel Appointment
```http
PUT /appointments/:appointmentId/cancel
```

### Reschedule Appointment
```http
PUT /appointments/:appointmentId/reschedule
```

---

## Doctor Endpoints

### Get All Doctors
```http
GET /doctors
```

### Get Doctor by ID
```http
GET /doctors/:doctorId
```

### Update Doctor Availability
```http
PUT /doctors/:doctorId/availability
```

---

## Analytics Endpoints

### Get Appointment Statistics
```http
GET /analytics/appointments
```

### Get Doctor Performance
```http
GET /analytics/doctors/:doctorId
```

---

*More detailed documentation coming soon...*