import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Activity, ShieldCheck, Clock, Users, ChevronRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">HealthMate</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <Button variant="ghost" className="font-medium">Log in</Button>
            </Link>
            <Link href="/auth">
              <Button className="font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Abstract shapes */}
        <div className="absolute top-0 right-0 -mr-24 -mt-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 -ml-24 -mb-24 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24 md:pt-32 md:pb-36 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight text-foreground mb-6">
              Modern healthcare <br />
              <span className="text-primary">simplified.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Book appointments with top specialists in seconds. Manage your health journey with a platform designed for clarity and care.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth">
                <Button size="lg" className="h-12 px-8 rounded-full text-lg shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all">
                  Book an Appointment
                </Button>
              </Link>
              <Link href="/auth">
                <Button variant="outline" size="lg" className="h-12 px-8 rounded-full text-lg border-primary/20 text-foreground hover:bg-primary/5">
                  Are you a Doctor?
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-secondary/30 py-24 border-y border-border/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            <FeatureCard 
              icon={Clock} 
              title="Instant Booking" 
              description="View real-time doctor availability and book your slot instantly without phone calls."
            />
            <FeatureCard 
              icon={ShieldCheck} 
              title="Verified Specialists" 
              description="Connect with certified and reviewed medical professionals across various specializations."
            />
            <FeatureCard 
              icon={Users} 
              title="Patient-Centric" 
              description="Your health history and upcoming appointments all in one secure, accessible dashboard."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-background py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-muted-foreground">
          <div className="flex justify-center items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-primary/50" />
            <span className="font-display font-semibold text-foreground/80">HealthMate</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} HealthMate Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: any, title: string, description: string }) {
  return (
    <div className="bg-card p-8 rounded-2xl shadow-sm border border-border/50 hover:shadow-md hover:border-primary/20 transition-all duration-300">
      <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-6 text-primary">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="font-display text-xl font-bold mb-3 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
