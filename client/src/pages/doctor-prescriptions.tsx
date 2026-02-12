import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Plus, Pill, User, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPrescriptionSchema } from "@shared/schema";
import { Form, FormControl,FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

export default function DoctorPrescriptions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const { data: prescriptions, isLoading: loadingPrescriptions } = useQuery<any[]>({
    queryKey: [api.appointments.prescriptions.list.path],
  });

  const { data: patients } = useQuery<any[]>({
    queryKey: [api.appointments.messages.conversations.path],
    queryFn: async () => {
      const res = await fetch(api.appointments.messages.conversations.path, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch patients');
      return res.json();
    }
  });

  const form = useForm({
    resolver: zodResolver(insertPrescriptionSchema.omit({ doctorId: true })),
    defaultValues: {
      patientId: 0,
      medicines: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", api.appointments.prescriptions.create.path, {
        ...data,
        patientId: Number(data.patientId)
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.appointments.prescriptions.list.path] });
      toast({ title: "Success", description: "Prescription issued successfully" });
      setOpen(false);
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  });

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Prescriptions</h1>
            <p className="text-muted-foreground">Issue and track patient medications</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Prescription
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Issue New Prescription</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4 pt-4">
                  <FormField
                    control={form.control}
                    name="patientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient</FormLabel>
                        <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a patient" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {patients?.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="medicines"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Medicines</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Amoxicillin 500mg, Twice daily" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Any additional notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Issue Prescription
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {loadingPrescriptions ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2].map(i => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
          </div>
        ) : prescriptions && prescriptions.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {prescriptions.map((p) => (
              <Card key={p.id} className="border-border/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-primary" />
                    <CardTitle className="text-lg">{p.medicines}</CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(p.date), "MMM d, yyyy")}</span>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="w-3 h-3" />
                      Patient: <span className="text-foreground font-medium">{p.patient?.name || "Patient"}</span>
                    </div>
                    <p className="text-sm line-clamp-2">{p.notes}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Pill className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <CardTitle className="mb-2">No prescriptions issued</CardTitle>
              <p className="text-muted-foreground">Issue your first digital prescription to a patient.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
