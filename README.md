# HealthMate: Appointment Scheduler 🏥

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-orange)

**A clinic scheduling system that empowers patients to book appointments 24/7, provides doctors with intelligent schedule management, and automates reminders to reduce no-shows by 30%.**

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Team](#team)
- [License](#license)

---

## 🎯 Overview

HealthMate is an appointment scheduling platform designed for clinics and healthcare providers. It streamlines the booking process for patients while giving doctors powerful tools to manage their schedules efficiently.

**Project Duration:** 8 weeks (2 Sprints)  
**Team Size:** 4 members  
**Course:** M.Tech Software Engineering - BITS Pilani

---

## ✨ Features

### Sprint 1 (MVP)
- 👤 Patient registration and authentication
- 🩺 Doctor profile listing and search
- 📅 Real-time appointment booking with conflict detection
- 📊 Doctor dashboard with schedule overview
- ⚙️ Doctor availability management
- 📱 Mobile-responsive design

### Sprint 2 (Enhanced)
- 📧 Email reminder system (24h, 1h before appointments)
- 💬 SMS notifications via Twilio
- 🔔 In-app push notifications
- ❌ Appointment cancellation and rescheduling
- 📈 Analytics dashboard with booking insights
- 👨‍⚕️ Doctor performance metrics
- 🏥 Clinic statistics and reporting

---

## 🛠️ Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React.js, HTML5, CSS3, Tailwind CSS |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL |
| **Notifications** | SendGrid (Email), Twilio (SMS) |
| **Version Control** | GitHub |
| **CI/CD** | GitHub Actions |
| **Deployment** | Render / Heroku |
| **Testing** | Jest, React Testing Library |

---

## 🚀 Getting Started

### Prerequisites

```bash
Node.js >= 16.x
npm >= 8.x
PostgreSQL >= 13.x
Git
```

### Installation

```bash
# Clone the repository
git clone https://github.com/DharshanParasu/HealthMate.git
cd HealthMate

# Install frontend dependencies
cd frontend
npm install
cp .env.example .env

# Install backend dependencies
cd ../backend
npm install
cp .env.example .env

# Setup database
psql -U postgres
CREATE DATABASE healthmate;

# Run migrations
npm run migrate
```

### Running the Application

```bash
# Terminal 1 - Backend (Port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (Port 3000)
cd frontend
npm start
```

Visit `http://localhost:3000` to see the application.

---

## 📁 Project Structure

```
HealthMate/
├── frontend/                  # React application
│   ├── public/
│   ├── src/
│   │   ├── components/       # Reusable components
│   │   ├── pages/            # Page components
│   │   ├── services/         # API service layer
│   │   ├── utils/            # Helper functions
│   │   └── App.js
│   └── package.json
│
├── backend/                   # Express API server
│   ├── routes/               # API routes
│   ├── controllers/          # Route handlers
│   ├── models/               # Database models
│   ├── middleware/           # Custom middleware
│   ├── services/             # Business logic
│   ├── config/               # Configuration files
│   └── server.js
│
├── docs/                      # Documentation
│   ├── API.md
│   ├── DATABASE.md
│   └── CONTRIBUTING.md
│
├── .github/                   # GitHub templates
│   ├── workflows/
│   ├── ISSUE_TEMPLATE/
│   └── pull_request_template.md
│
└── README.md
```

---

## 🔄 Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features (e.g., `feature/patient-auth`)
- `fix/*` - Bug fixes (e.g., `fix/booking-conflict`)
- `docs/*` - Documentation updates

### Commit Message Convention

```bash
feat: add email reminder scheduling
fix: resolve double booking conflict
docs: update API documentation
test: add unit tests for booking service
refactor: optimize database queries
chore: update dependencies
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit with conventional messages
3. Push branch and create PR to `develop`
4. Request code review from team member
5. Address feedback and merge after approval
6. Delete feature branch after merge

---

## 👥 Team

| Role | Responsibilities |
|------|------------------|
| **Backend Lead** | API development, database design, authentication |
| **Frontend Lead** | UI/UX design, React components, responsive layout |
| **Full-Stack Dev** | Booking logic, calendar integration, notifications |
| **QA/Backend Dev** | Testing, doctor dashboard, analytics |

---

## 📊 Success Metrics

- ✅ 30% reduction in no-show rates
- ✅ Appointment booking in under 2 minutes
- ✅ 100% mobile responsiveness
- ✅ 99.5% uptime target
- ✅ API response time < 500ms

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](docs/CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

---

## 📧 Contact

**Project Lead:** [Your Name]  
**Email:** [your.email@example.com]  
**Course:** M.Tech Software Engineering - BITS Pilani WILP  
**Academic Year:** 2025-26

---

**Generated:** January 12, 2026  
**Last Updated:** January 12, 2026