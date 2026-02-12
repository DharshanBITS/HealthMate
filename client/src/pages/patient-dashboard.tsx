import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { useAppointments, useCancelAppointment, useRescheduleAppointment } from "@/hooks/use-appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, User as UserIcon, XCircle, AlertCircle, Plus, RefreshCw } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useDoctorAvailability } from "@/hooks/use-availability";

export default function PatientDashboard() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <Layout>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Welcome, {user?.name}</h1>
              <p className="text-muted-foreground mt-1">Here's your upcoming schedule.</p>
            </div>
            <Link href="/find-doctors">
              <Button className="shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all">
                <Plus className="w-4 h-4 mr-2" />
                Book New Appointment
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-muted/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {(!appointments || appointments.length === 0) ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-border/60 text-center">
                  <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No appointments yet</h3>
                  <p className="text-muted-foreground max-w-sm mb-6">You haven't booked any appointments. Find a doctor to get started.</p>
                  <Link href="/find-doctors">
                    <Button variant="outline">Find a Doctor</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {appointments.map((apt) => (
                    <AppointmentCard key={apt.id} appointment={apt} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function AppointmentCard({ appointment }: { appointment: any }) {
  const cancelMutation = useCancelAppointment();
  const rescheduleMutation = useRescheduleAppointment();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  const { data: availability, isLoading: isLoadingSlots } = useDoctorAvailability(appointment.doctorId);

  const date = new Date(appointment.startTime);
  const isPast = new Date() > date;
  
  const statusColors = {
    confirmed: "bg-green-100 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    completed: "bg-gray-100 text-gray-700 border-gray-200",
  };

  const availableSlots = availability?.filter(slot => 
    !slot.isBooked && 
    selectedDate && 
    isSameDay(parseISO(slot.startTime as unknown as string), selectedDate)
  ) || [];

  const handleReschedule = () => {
    if (!selectedSlot) return;
    rescheduleMutation.mutate({
      id: appointment.id,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
    }, {
      onSuccess: () => {
        setIsRescheduleOpen(false);
        setSelectedSlot(null);
      }
    });
  };

  return (
    <Card className="overflow-hidden border-border/60 hover:border-primary/30 transition-colors shadow-sm hover:shadow-md">
      <CardContent className="p-0 flex flex-col md:flex-row">
        {/* Date Column */}
        <div className="bg-secondary/30 p-6 flex flex-col items-center justify-center min-w-[120px] border-b md:border-b-0 md:border-r border-border/50">
          <span className="text-3xl font-bold text-primary font-display">{format(date, "d")}</span>
          <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{format(date, "MMM")}</span>
          <span className="text-xs text-muted-foreground mt-1">{format(date, "yyyy")}</span>
        </div>
        
        {/* Info Column */}
        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg">{appointment.doctor?.name}</h3>
                <p className="text-sm text-primary font-medium">{appointment.doctor?.specialization}</p>
              </div>
              <Badge variant="outline" className={statusColors[appointment.status as keyof typeof statusColors]}>
                {appointment.status}
              </Badge>
            </div>
            
            <div className="space-y-2 text-sm text-muted-foreground mb-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{format(date, "h:mm a")} - {format(new Date(appointment.endTime), "h:mm a")}</span>
              </div>
              {appointment.notes && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5" />
                  <span>{appointment.notes}</span>
                </div>
              )}
            </div>
          </div>

          {appointment.status === 'confirmed' && !isPast && (
            <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
              <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="h-8 px-3 text-xs gap-1">
                    <RefreshCw className="w-3 h-3" />
                    Reschedule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Reschedule Appointment</DialogTitle>
                    <DialogDescription>
                      Choose a new time for your appointment with {appointment.doctor?.name}.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col md:flex-row gap-6 py-4">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      className="rounded-xl border shadow-sm p-3"
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                    <div className="flex-1">
                      <h4 className="font-medium mb-3 text-sm text-muted-foreground uppercase tracking-wide">
                        Available Slots
                      </h4>
                      {isLoadingSlots ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted/50 rounded animate-pulse" />)}
                        </div>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No slots for this date.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {availableSlots.map((slot) => (
                            <Button
                              key={slot.id}
                              variant={selectedSlot?.id === slot.id ? "default" : "outline"}
                              className="w-full text-xs"
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {format(new Date(slot.startTime), 'h:mm a')}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRescheduleOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={handleReschedule} 
                      disabled={!selectedSlot || rescheduleMutation.isPending}
                    >
                      {rescheduleMutation.isPending ? "Rescheduling..." : "Confirm Reschedule"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-3 text-xs">
                    Cancel Appointment
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Appointment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will cancel your appointment with {appointment.doctor?.name}. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep it</AlertDialogCancel>
                    <AlertDialogAction 
                      className="bg-destructive hover:bg-destructive/90"
                      onClick={() => cancelMutation.mutate(appointment.id)}
                    >
                      Yes, Cancel
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
