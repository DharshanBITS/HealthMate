import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function sendEmail({ to, subject, html }: { to: string, subject: string, html: string }) {
  console.log('Attempting to send email:', { to, subject });
  if (!resend) {
    console.warn('RESEND_API_KEY not set. Email not sent:', { to, subject });
    return;
  }

  try {
    const data = await resend.emails.send({
      from: 'HealthMate <onboarding@resend.dev>',
      to,
      subject,
      html,
    });
    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Failed to send email:', error);
  }
}

export const emailTemplates = {
  appointmentConfirmed: (patientName: string, doctorName: string, date: string) => ({
    subject: 'Appointment Confirmed - HealthMate',
    html: `
      <h1>Appointment Confirmation</h1>
      <p>Hello ${patientName},</p>
      <p>Your appointment with Dr. ${doctorName} has been confirmed for ${date}.</p>
      <p>Thank you for using HealthMate!</p>
    `
  }),
  newPrescription: (patientName: string, doctorName: string) => ({
    subject: 'New Prescription Issued - HealthMate',
    html: `
      <h1>New Prescription</h1>
      <p>Hello ${patientName},</p>
      <p>Dr. ${doctorName} has issued a new prescription for you. Please log in to your dashboard to view the details.</p>
      <p>Thank you for using HealthMate!</p>
    `
  }),
  newMessage: (senderName: string) => ({
    subject: 'New Message Received - HealthMate',
    html: `
      <h1>New Message</h1>
      <p>You have received a new message from ${senderName}.</p>
      <p>Please log in to your dashboard to read and reply.</p>
      <p>Thank you for using HealthMate!</p>
    `
  })
};
