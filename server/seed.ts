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

  // 2. Create Availability for next 7 days (9am - 5pm)
  const today = startOfDay(new Date());
  
  for (const doc of createdDoctors) {
    for (let i = 0; i < 7; i++) {
      const day = addDays(today, i);
      // Create a single block 9am-5pm for simplicity
      // Or create simpler blocks? Let's do 9-12 and 1-5
      
      const morningStart = setMinutes(setHours(day, 9), 0);
      const morningEnd = setMinutes(setHours(day, 12), 0);
      
      const afternoonStart = setMinutes(setHours(day, 13), 0);
      const afternoonEnd = setMinutes(setHours(day, 17), 0);

      await storage.createAvailability({
        doctorId: doc.id,
        startTime: morningStart,
        endTime: morningEnd,
      });

      await storage.createAvailability({
        doctorId: doc.id,
        startTime: afternoonStart,
        endTime: afternoonEnd,
      });
    }
    console.log(`Created availability for ${doc.username}`);
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
