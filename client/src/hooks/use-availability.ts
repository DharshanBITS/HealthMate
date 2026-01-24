import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { getAuthHeaders } from "./use-auth";
import { Availability, InsertAvailability } from "@shared/schema";
import { useToast } from "./use-toast";

export function useDoctorAvailability(doctorId: number) {
  return useQuery({
    queryKey: [api.availabilities.list.path, doctorId],
    queryFn: async () => {
      const url = buildUrl(api.availabilities.list.path, { id: doctorId });
      const res = await fetch(url, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch availability");
      return await res.json() as Availability[];
    },
    enabled: !!doctorId,
  });
}

export function useCreateAvailability() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: Omit<InsertAvailability, "doctorId">) => {
      const res = await fetch(api.availabilities.create.path, {
        method: api.availabilities.create.method,
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to create availability");
      return await res.json() as Availability;
    },
    onSuccess: (data) => {
      // Invalidate the specific doctor's availability list
      const url = buildUrl(api.availabilities.list.path, { id: data.doctorId });
      queryClient.invalidateQueries({ queryKey: [url] }); // This might be tricky if key structure varies
      // A more robust way might be invalidating based on the prefix or if we know the current user's ID
      // For now, let's invalidate all availabilities logic to be safe or refine query keys
      queryClient.invalidateQueries({ queryKey: [api.availabilities.list.path] });
      toast({ title: "Success", description: "Availability slot added" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add slot", variant: "destructive" });
    },
  });
}
