import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/protected-route";
import { useDoctor } from "@/hooks/use-doctors";
import { useDoctorAvailability } from "@/hooks/use-availability";
import { useCreateAppointment } from "@/hooks/use-appointments";
import { useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar as CalendarIcon, Clock, CheckCircle2, MapPin } from "lucide-react";
import { format, isSameDay, parseISO } from "date-fns";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function DoctorProfile() {
  const [, params] = useRoute("/doctor/:id");
  const doctorId = Number(params?.id);
  const { data: doctor, isLoading: isLoadingDoctor } = useDoctor(doctorId);
  const { data: availability, isLoading: isLoadingSlots } = useDoctorAvailability(doctorId);
  
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const createAppointment = useCreateAppointment();

  const handleBook = () => {
    if (!selectedSlot || !doctor) return;
    
    createAppointment.mutate({
      doctorId: doctor.id,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      notes: notes
    }, {
      onSuccess: () => {
        setIsDialogOpen(false);
        setNotes("");
        setSelectedSlot(null);
      }
    });
  };

  // Filter slots for selected date
  const availableSlots = availability?.filter(slot => 
    !slot.isBooked && 
    selectedDate && 
    isSameDay(parseISO(slot.startTime as unknown as string), selectedDate)
  ) || [];

  if (isLoadingDoctor) return <div className="p-8">Loading...</div>;
  if (!doctor) return <div className="p-8">Doctor not found</div>;

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <Layout>
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Doctor Info Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="overflow-hidden border-none shadow-xl shadow-black/5">
              <div className="h-32 bg-gradient-to-br from-primary/80 to-primary/40"></div>
              <div className="px-6 relative">
                <Avatar className="h-24 w-24 border-4 border-white shadow-sm absolute -top-12 rounded-2xl">
                  <AvatarImage src={`https://ui-avatars.com/api/?name=${doctor.name}&background=0D9488&color=fff`} />
                  <AvatarFallback>{doctor.name[0]}</AvatarFallback>
                </Avatar>
              </div>
              <CardContent className="pt-16 pb-6 px-6">
                <h1 className="text-2xl font-bold font-display">{doctor.name}</h1>
                <p className="text-primary font-medium mb-4">{doctor.specialization}</p>
                
                <div className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span>Verified Specialist</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>HealthMate Medical Center</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Booking Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="font-display">Select an Appointment Time</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col md:flex-row gap-8">
                <div className="flex-none">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-xl border shadow-sm p-3"
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>
                
                <div className="flex-1">
                  <h3 className="font-medium mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                    Available Slots for {selectedDate ? format(selectedDate, 'MMM do') : 'Selected Date'}
                  </h3>
                  
                  {isLoadingSlots ? (
                    <div className="grid grid-cols-2 gap-3">
                      {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />)}
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center p-8 bg-secondary/30 rounded-xl border border-dashed border-border">
                      <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No slots available for this date.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {availableSlots.map((slot) => (
                        <Dialog key={slot.id} open={isDialogOpen && selectedSlot?.id === slot.id} onOpenChange={(open) => {
                          setIsDialogOpen(open);
                          if (!open) setSelectedSlot(null);
                        }}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="w-full border-primary/20 hover:bg-primary hover:text-white hover:border-primary transition-all"
                              onClick={() => setSelectedSlot(slot)}
                            >
                              {format(new Date(slot.startTime), 'h:mm a')}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirm Appointment</DialogTitle>
                              <DialogDescription>
                                Booking with {doctor.name} on {format(new Date(slot.startTime), 'MMMM do, yyyy')} at {format(new Date(slot.startTime), 'h:mm a')}
                              </DialogDescription>
                            </DialogHeader>
                            
                            <div className="py-4">
                              <label className="text-sm font-medium mb-2 block">Reason for visit (Optional)</label>
                              <Textarea 
                                placeholder="E.g., Annual checkup, headache..." 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="bg-secondary/20"
                              />
                            </div>

                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                              <Button onClick={handleBook} disabled={createAppointment.isPending} className="bg-primary text-white shadow-lg shadow-primary/20">
                                {createAppointment.isPending ? "Confirming..." : "Confirm Booking"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
