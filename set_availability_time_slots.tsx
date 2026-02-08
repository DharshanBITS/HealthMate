import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { useAppointments } from "@/hooks/use-appointments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, User, CheckCircle2, Search } from "lucide-react";
import { format, isToday } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { data: appointments, isLoading } = useAppointments();
  const [search, setSearch] = useState("");

  const todayAppointments = appointments?.filter(apt => isToday(new Date(apt.startTime))) || [];
  const upcomingAppointments = appointments?.filter(apt => !isToday(new Date(apt.startTime)) && new Date(apt.startTime) > new Date()) || [];

  const filteredToday = todayAppointments.filter(apt => apt.patient?.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <ProtectedRoute allowedRoles={['doctor']}>
      <Layout>
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground">Doctor's Dashboard</h1>
              <p className="text-muted-foreground mt-1">Manage your schedule and patient appointments.</p>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search patient..." 
                className="pl-9 bg-white shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard 
              label="Today's Appointments" 
              value={todayAppointments.length} 
              icon={Calendar} 
              color="text-blue-500 bg-blue-500/10"
            />
            <StatsCard 
              label="Pending Requests" 
              value={0} 
              icon={Clock} 
              color="text-orange-500 bg-orange-500/10"
            />
            <StatsCard 
              label="Total Patients" 
              value={new Set(appointments?.map(a => a.patientId)).size || 0} 
              icon={User} 
              color="text-green-500 bg-green-500/10"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Today's Schedule */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredToday.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No appointments for today.</p>
                  ) : (
                    filteredToday.map(apt => (
                      <AppointmentItem key={apt.id} appointment={apt} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Upcoming
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingAppointments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No upcoming appointments.</p>
                  ) : (
                    upcomingAppointments.slice(0, 5).map(apt => (
                      <AppointmentItem key={apt.id} appointment={apt} showDate />
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

function StatsCard({ label, value, icon: Icon, color }: any) {
  return (
    <Card className="border-none shadow-md">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <h3 className="text-2xl font-bold font-display">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}

function AppointmentItem({ appointment, showDate }: { appointment: any, showDate?: boolean }) {
  const statusColors = {
    confirmed: "bg-green-100 text-green-700 border-green-200",
    cancelled: "bg-red-100 text-red-700 border-red-200",
    completed: "bg-gray-100 text-gray-700 border-gray-200",
  };

  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-colors border border-transparent hover:border-primary/10">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
          {appointment.patient?.name[0]}
        </div>
        <div>
          <h4 className="font-semibold text-sm">{appointment.patient?.name}</h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {showDate && <span>{format(new Date(appointment.startTime), 'MMM d')} • </span>}
            <span>{format(new Date(appointment.startTime), 'h:mm a')} - {format(new Date(appointment.endTime), 'h:mm a')}</span>
          </div>
        </div>
      </div>
      <Badge variant="outline" className={statusColors[appointment.status as keyof typeof statusColors]}>
        {appointment.status}
      </Badge>
    </div>
  );
}
