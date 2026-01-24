import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { getAuthHeaders } from "./use-auth";
import { Appointment, InsertAppointment, User } from "@shared/schema";
import { useToast } from "./use-toast";

type AppointmentWithRelations = Appointment & {
  doctor?: User;
  patient?: User;
};

export function useAppointments() {
  return useQuery({
    queryKey: [api.appointments.list.path],
    queryFn: async () => {
      const res = await fetch(api.appointments.list.path, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch appointments");
      return await res.json() as AppointmentWithRelations[];
    },
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<InsertAppointment, "patientId" | "status">) => {
      const res = await fetch(api.appointments.create.path, {
        method: api.appointments.create.method,
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 409) throw new Error("This slot is already booked");
        throw new Error("Failed to book appointment");
      }
      return await res.json() as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.availabilities.list.path] }); // Refresh slots
      toast({ title: "Booked!", description: "Your appointment is confirmed." });
    },
    onError: (err: Error) => {
      toast({ title: "Booking failed", description: err.message, variant: "destructive" });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.appointments.cancel.path, { id });
      const res = await fetch(url, {
        method: api.appointments.cancel.method,
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error("Failed to cancel appointment");
      return await res.json() as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      toast({ title: "Cancelled", description: "Appointment has been cancelled." });
    },
    onError: () => {
      toast({ title: "Error", description: "Could not cancel appointment", variant: "destructive" });
    },
  });
}

export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, startTime, endTime }: { id: number, startTime: Date, endTime: Date }) => {
      const url = buildUrl(api.appointments.reschedule.path, { id });
      const res = await fetch(url, {
        method: api.appointments.reschedule.method,
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ startTime, endTime }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to reschedule appointment");
      }
      return await res.json() as Appointment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.availabilities.list.path] });
      toast({ title: "Rescheduled", description: "Appointment has been updated." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
