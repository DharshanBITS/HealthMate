/**
 * Test fixture data for HealthMate tests
 */

export const testPatients = {
    patient1: {
        username: 'patient1',
        password: 'password123',
        role: 'patient' as const,
        name: 'John Doe',
        email: 'john.doe@example.com',
        specialization: null
    },
    patient2: {
        username: 'patient2',
        password: 'password123',
        role: 'patient' as const,
        name: 'Jane Smith',
        email: 'jane.smith@example.com',
        specialization: null
    }
};

export const testDoctors = {
    doctor1: {
        username: 'doctor1',
        password: 'password123',
        role: 'doctor' as const,
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@healthmate.com',
        specialization: 'Cardiology'
    },
    doctor2: {
        username: 'doctor2',
        password: 'password123',
        role: 'doctor' as const,
        name: 'Dr. Michael Chen',
        email: 'michael.chen@healthmate.com',
        specialization: 'General Medicine'
    }
};

export const createAvailabilityData = (doctorId: number, daysFromNow: number = 1) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(9, 0, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(17, 0, 0, 0);

    return {
        doctorId,
        startTime: date,
        endTime
    };
};

export const createAppointmentData = (patientId: number, doctorId: number, daysFromNow: number = 1, hour: number = 10) => {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(hour, 0, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(hour + 1, 0, 0, 0);

    return {
        patientId,
        doctorId,
        startTime: date,
        endTime,
        notes: 'Test appointment'
    };
};

export const createPrescriptionData = (patientId: number, doctorId: number) => ({
    patientId,
    doctorId,
    medicines: JSON.stringify([
        { name: 'Aspirin', dosage: '100mg', frequency: 'Once daily' },
        { name: 'Vitamin D', dosage: '1000IU', frequency: 'Once daily' }
    ]),
    notes: 'Take with food'
});

export const createMessageData = (senderId: number, receiverId: number, content: string = 'Test message') => ({
    senderId,
    receiverId,
    content
});
