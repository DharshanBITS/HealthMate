# HealthMate Database Schema

## Tables

### patients
- id (PK)
- email (unique)
- password_hash
- first_name
- last_name
- phone
- date_of_birth
- created_at
- updated_at

### doctors
- id (PK)
- email (unique)
- password_hash
- first_name
- last_name
- specialization
- phone
- created_at
- updated_at

### appointments
- id (PK)
- patient_id (FK)
- doctor_id (FK)
- appointment_date
- start_time
- end_time
- status (scheduled, completed, cancelled, no-show)
- notes
- created_at
- updated_at

### doctor_availability
- id (PK)
- doctor_id (FK)
- day_of_week
- start_time
- end_time
- is_available

### notifications
- id (PK)
- appointment_id (FK)
- type (email, sms, push)
- status (pending, sent, failed)
- sent_at

---

*Detailed schema diagrams coming soon...*