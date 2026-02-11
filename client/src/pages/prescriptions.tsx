import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { Activity, Calendar, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function Prescriptions() {
  const { user } = useAuth();
  const { data: prescriptions, isLoading } = useQuery<any[]>({
    queryKey: [api.appointments.prescriptions.list.path],
    queryFn: async () => {
      const res = await fetch(api.appointments.prescriptions.list.path, {
        headers: { 
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch prescriptions');
      return res.json();
    }
  });

  return (
    <Layout>
      <div className="p-4 md:p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Activity className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Prescriptions</h1>
            <p className="text-muted-foreground">View and manage your digital prescriptions</p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted/50" />
                <CardContent className="h-32" />
              </Card>
            ))}
          </div>
        ) : prescriptions && prescriptions.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {prescriptions.map((prescription) => (
              <Card key={prescription.id} className="hover-elevate transition-all border-border/50">
                <CardHeader>
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      Active
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(prescription.date), "MMM d, yyyy")}
                    </span>
                  </div>
                  <CardTitle className="text-xl font-bold">{prescription.medicines}</CardTitle>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Dr. {prescription.doctor?.name || "Specialist"}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm leading-relaxed">{prescription.notes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-2 bg-muted/30">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-background rounded-full mb-4 shadow-sm">
                <Activity className="w-12 h-12 text-muted-foreground/50" />
              </div>
              <CardTitle className="mb-2">No prescriptions yet</CardTitle>
              <p className="text-muted-foreground max-w-sm">
                Your digital prescriptions will appear here once issued by your doctor.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
