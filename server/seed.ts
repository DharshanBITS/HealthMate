import { storage } from "./storage";
import { hashPassword } from "./auth";
import { addDays, setHours, setMinutes, startOfDay } from "date-fns";

async function seed() {
  console.log("Seeding database...");

  const existingDoctors = await storage.listDoctors();
  if (existingDoctors.length > 0) {
    console.log("Database already seeded.");
    return;
  }

  // 1. Create Doctors
  const doctorPassword = await hashPassword("password123");
  const doctors = [
    { username: "drsmith", password: doctorPassword, role: "doctor" as const, name: "Dr. Sarah Smith", specialization: "Cardiology" },
    { username: "drjones", password: doctorPassword, role: "doctor" as const, name: "Dr. Michael Jones", specialization: "Pediatrics" },
    { username: "drdoe", password: doctorPassword, role: "doctor" as const, name: "Dr. Emily Doe", specialization: "Dermatology" },
  ];

  const createdDoctors = [];
  for (const doc of doctors) {
    const d = await storage.createUser(doc);
    createdDoctors.push(d);
    console.log(`Created doctor: ${d.username}`);
  }


  // 3. Create Patients
  const patientPassword = await hashPassword("password123");
  const patients = [
    { username: "alice", password: patientPassword, role: "patient" as const, name: "Alice Anderson" },
    { username: "bob", password: patientPassword, role: "patient" as const, name: "Bob Brown" },
    { username: "charlie", password: patientPassword, role: "patient" as const, name: "Charlie Clark" },
  ];

  const createdPatients = [];
  for (const p of patients) {
    const pat = await storage.createUser(p);
    createdPatients.push(pat);
    console.log(`Created patient: ${pat.username}`);
  }

  console.log("Seeding complete!");
 
}

seed().catch(console.error);
