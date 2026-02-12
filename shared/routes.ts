import { z } from 'zod';
import { 
  insertUserSchema, 
  loginSchema, 
  registerSchema,
  insertAvailabilitySchema, 
  insertAppointmentSchema,
  insertPrescriptionSchema,
  insertMedicalRecordSchema,
  insertMessageSchema,
  users, 
  availabilities, 
  appointments,
  prescriptions,
  medicalRecords,
  messages
} from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    register: {
      method: 'POST' as const,
      path: '/api/auth/register',
      input: registerSchema,
      responses: {
        201: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        400: errorSchemas.validation,
        409: errorSchemas.conflict,
      },
    },
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: loginSchema,
      responses: {
        200: z.object({ token: z.string(), user: z.custom<typeof users.$inferSelect>() }),
        401: errorSchemas.unauthorized,
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  doctors: {
    list: {
      method: 'GET' as const,
      path: '/api/doctors',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/doctors/:id',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  availabilities: {
    list: { // Get availability for a specific doctor
      method: 'GET' as const,
      path: '/api/doctors/:id/availability',
      responses: {
        200: z.array(z.custom<typeof availabilities.$inferSelect>()),
      },
    },
    create: { // Doctor sets availability
      method: 'POST' as const,
      path: '/api/availability',
      input: insertAvailabilitySchema.omit({ doctorId: true }), // doctorId inferred from auth
      responses: {
        201: z.custom<typeof availabilities.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  appointments: {
    list: { // For current user (doctor or patient)
      method: 'GET' as const,
      path: '/api/appointments',
      responses: {
        200: z.array(z.custom<typeof appointments.$inferSelect & { 
          doctor?: typeof users.$inferSelect, 
          patient?: typeof users.$inferSelect 
        }>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: { // Book an appointment
      method: 'POST' as const,
      path: '/api/appointments',
      input: insertAppointmentSchema.omit({ patientId: true, status: true }), // patientId from auth, status default
      responses: {
        201: z.custom<typeof appointments.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        409: errorSchemas.conflict, // Double booking
      },
    },
    cancel: {
      method: 'PATCH' as const,
      path: '/api/appointments/:id/cancel',
      responses: {
        200: z.custom<typeof appointments.$inferSelect>(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    reschedule: {
      method: 'PATCH' as const,
      path: '/api/appointments/:id/reschedule',
      input: z.object({
        startTime: z.coerce.date(),
        endTime: z.coerce.date(),
      }),
      responses: {
        200: z.custom<typeof appointments.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
        409: errorSchemas.conflict,
      },
    },
    prescriptions: {
      list: {
        method: 'GET' as const,
        path: '/api/prescriptions',
        responses: {
          200: z.array(z.custom<typeof prescriptions.$inferSelect>()),
          401: errorSchemas.unauthorized,
        },
      },
      create: {
        method: 'POST' as const,
        path: '/api/prescriptions',
        input: insertPrescriptionSchema,
        responses: {
          201: z.custom<typeof prescriptions.$inferSelect>(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        },
      },
    },
    medicalRecords: {
      list: {
        method: 'GET' as const,
        path: '/api/medical-records',
        responses: {
          200: z.array(z.custom<typeof medicalRecords.$inferSelect>()),
          401: errorSchemas.unauthorized,
        },
      },
      upload: {
        method: 'POST' as const,
        path: '/api/medical-records',
        input: insertMedicalRecordSchema,
        responses: {
          201: z.custom<typeof medicalRecords.$inferSelect>(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        },
      },
    },
    messages: {
      list: {
        method: 'GET' as const,
        path: '/api/messages/:otherUserId',
        responses: {
          200: z.array(z.custom<typeof messages.$inferSelect>()),
          401: errorSchemas.unauthorized,
        },
      },
      send: {
        method: 'POST' as const,
        path: '/api/messages',
        input: insertMessageSchema,
        responses: {
          201: z.custom<typeof messages.$inferSelect>(),
          400: errorSchemas.validation,
          401: errorSchemas.unauthorized,
        },
      },
      conversations: {
        method: 'GET' as const,
        path: '/api/conversations',
        responses: {
          200: z.array(z.custom<typeof users.$inferSelect>()),
          401: errorSchemas.unauthorized,
        },
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type RegisterInput = z.infer<typeof api.auth.register.input>;
export type LoginInput = z.infer<typeof api.auth.login.input>;
export type AuthResponse = z.infer<typeof api.auth.login.responses[200]>;
