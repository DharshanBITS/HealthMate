import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import NotFound from "@/pages/not-found";

// Pages
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import PatientDashboard from "@/pages/patient-dashboard";
import FindDoctors from "@/pages/find-doctors";
import Prescriptions from "@/pages/prescriptions";
import DoctorDashboard from "@/pages/doctor-dashboard";
import ManageAvailability from "@/pages/manage-availability";
import DoctorProfile from "@/pages/doctor-profile";
import DoctorPrescriptions from "@/pages/doctor-prescriptions";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />

      {/* Patient Routes */}
      <Route path="/patient-dashboard" component={PatientDashboard} />
      <Route path="/prescriptions" component={Prescriptions} />
      <Route path="/find-doctors" component={FindDoctors} />
      <Route path="/doctor/:id" component={DoctorProfile} />

      {/* Doctor Routes */}
      <Route path="/doctor-dashboard" component={DoctorDashboard} />
      <Route path="/manage-availability" component={ManageAvailability} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
