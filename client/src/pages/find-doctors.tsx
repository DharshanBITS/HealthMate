import { Layout } from "@/components/layout";
import { ProtectedRoute } from "@/lib/protected-route";
import { useDoctors } from "@/hooks/use-doctors";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, MapPin, Star, Calendar } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function FindDoctors() {
  const { data: doctors, isLoading } = useDoctors();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDoctors = doctors?.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    doc.specialization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <ProtectedRoute allowedRoles={['patient']}>
      <Layout>
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center md:text-left space-y-2">
            <h1 className="text-3xl font-display font-bold text-foreground">Find a Specialist</h1>
            <p className="text-muted-foreground">Book appointments with top rated doctors near you.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input 
              placeholder="Search by name or specialization..." 
              className="pl-12 h-12 text-lg rounded-2xl bg-white shadow-sm border-border/50 focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-40 bg-muted/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredDoctors?.map(doctor => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))}
              {filteredDoctors?.length === 0 && (
                <div className="col-span-2 text-center py-12 text-muted-foreground">
                  No doctors found matching "{searchTerm}"
                </div>
              )}
            </div>
          )}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

function DoctorCard({ doctor }: { doctor: any }) {
  // Generate random initials for avatar if no image
  const initials = doctor.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <Card className="hover:shadow-lg hover:border-primary/30 transition-all duration-300 group overflow-hidden">
      <CardContent className="p-6">
        <div className="flex gap-4">
          <Avatar className="h-16 w-16 rounded-2xl border-2 border-white shadow-sm">
            <AvatarImage src={`https://ui-avatars.com/api/?name=${doctor.name}&background=0D9488&color=fff`} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">
              {doctor.name}
            </h3>
            <p className="text-primary font-medium text-sm mb-1">{doctor.specialization}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-4">
              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold text-foreground">4.8</span>
              <span>(120+ reviews)</span>
            </div>
            
            <Link href={`/doctor/${doctor.id}`}>
              <Button className="w-full bg-secondary/50 text-foreground hover:bg-primary hover:text-white transition-all shadow-none border border-transparent hover:shadow-lg hover:shadow-primary/25">
                <Calendar className="w-4 h-4 mr-2" />
                View Availability
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
