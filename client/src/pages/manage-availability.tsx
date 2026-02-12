import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { useDoctorAvailability, useCreateAvailability } from "@/hooks/use-availability";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, addHours, setHours, setMinutes } from "date-fns";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function ManageAvailability() {
  const { user } = useAuth();
  const { data: availability, isLoading } = useDoctorAvailability(user?.id || 0);
  const createAvailability = useCreateAvailability();
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("09:00");
  const [duration, setDuration] = useState("60"); // minutes

  const handleAddSlot = () => {
    if (!date) return;

    const [hours, minutes] = startTime.split(':').map(Number);
    const start = setMinutes(setHours(date, hours), minutes);
    const end = addHours(start, Number(duration) / 60);

    createAvailability.mutate({
      startTime: start.toISOString() as unknown as Date, // Cast for API
      endTime: end.toISOString() as unknown as Date,
    });
  };

  const formattedSlots = availability?.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <Layout>
        <div className="max-w-4xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-foreground">Manage Availability</h1>
            <p className="text-muted-foreground mt-1">Set your working hours for patients to book.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-border/50 shadow-md">
              <CardHeader>
                <CardTitle>Add New Slot</CardTitle>
                <CardDescription>Select a date and time range</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex justify-center border rounded-xl p-4 bg-white/50">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 9 }).map((_, i) => {
                          const h = i + 9; // Start at 9 AM
                          return (
                            <SelectItem key={h} value={`${h}:00`}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}</SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Select value={duration} onValueChange={setDuration}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 Mins</SelectItem>
                        <SelectItem value="60">1 Hour</SelectItem>
                        <SelectItem value="90">1.5 Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  className="w-full shadow-lg shadow-primary/25" 
                  onClick={handleAddSlot} 
                  disabled={!date || createAvailability.isPending}
                >
                  {createAvailability.isPending ? "Adding..." : (
                    <>
                      <Plus className="w-4 h-4 mr-2" /> Add Slot
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-md h-full flex flex-col">
              <CardHeader>
                <CardTitle>Current Slots</CardTitle>
                <CardDescription>Your upcoming availability</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto max-h-[500px] pr-2">
                <div className="space-y-3">
                  {isLoading ? (
                    <p className="text-muted-foreground text-sm">Loading slots...</p>
                  ) : !formattedSlots?.length ? (
                    <p className="text-muted-foreground text-sm text-center py-8">No active slots found.</p>
                  ) : (
                    formattedSlots.map((slot) => (
                      <div 
                        key={slot.id} 
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          slot.isBooked ? 'bg-orange-50 border-orange-200' : 'bg-secondary/20 border-border/50'
                        }`}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {format(new Date(slot.startTime), 'MMM do, yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(slot.startTime), 'h:mm a')} - {format(new Date(slot.endTime), 'h:mm a')}
                          </p>
                        </div>
                        {slot.isBooked && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium border border-orange-200">
                            Booked
                          </span>
                        )}
                      </div>
                    ))
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
