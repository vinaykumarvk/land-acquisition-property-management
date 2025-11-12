import React from "react";
import { Switch, Route, useLocation } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";

import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { useUser } from "@/lib/auth";

// Public pages
import PublicPortal from "@/pages/PublicPortal";
import PublicSiaList from "@/pages/PublicSiaList";
import PublicSiaDetail from "@/pages/PublicSiaDetail";
import PublicSiaFeedback from "@/pages/PublicSiaFeedback";
import PublicNotifications from "@/pages/PublicNotifications";
import PublicNotificationDetail from "@/pages/PublicNotificationDetail";
import PublicObjection from "@/pages/PublicObjection";

// Citizen pages
import CitizenLogin from "@/pages/CitizenLogin";
import CitizenDashboard from "@/pages/CitizenDashboard";
import LamsDashboard from "@/pages/LamsDashboard";
import LamsSia from "@/pages/LamsSia";
import LamsNotifications from "@/pages/LamsNotifications";
import LamsObjections from "@/pages/LamsObjections";
import LamsCompensation from "@/pages/LamsCompensation";
import LamsPossession from "@/pages/LamsPossession";

// Property Management pages
import PMSDashboard from "@/pages/propertyManagement/PMSDashboard";
import Schemes from "@/pages/propertyManagement/Schemes";
import SchemeDetail from "@/pages/propertyManagement/SchemeDetail";
import PropertySearch from "@/pages/propertyManagement/PropertySearch";
import Property360 from "@/pages/propertyManagement/Property360";
import PropertyPassbook from "@/pages/propertyManagement/PropertyPassbook";
import ServiceRequests from "@/pages/propertyManagement/ServiceRequests";
import DocumentDownloads from "@/pages/propertyManagement/DocumentDownloads";
import PMSAnalytics from "@/pages/propertyManagement/PMSAnalytics";
import PMSReports from "@/pages/propertyManagement/PMSReports";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, error } = useUser();
  const [, setLocation] = useLocation();

  // Block citizens from accessing staff routes - redirect them to citizen dashboard
  React.useEffect(() => {
    if (user && user.role === 'citizen') {
      console.log("Citizen attempting to access staff route, redirecting to citizen dashboard");
      setLocation("/citizen/dashboard");
    }
  }, [user, setLocation]);

  console.log("ProtectedRoute state:", { user, isLoading, error });

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    console.error("Auth error:", error);
    return <Login />;
  }

  if (!user) {
    console.log("No user, showing login");
    return <Login />;
  }

  // Show redirecting message if citizen
  if (user.role === 'citizen') {
    return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
  }

  console.log("User authenticated, showing app layout");
  return <AppLayout>{children}</AppLayout>;
}

function CitizenRoute({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useUser();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!user || user.role !== 'citizen') {
    return <CitizenLogin />;
  }

  return <AppLayout>{children}</AppLayout>;
}

function RedirectToLams() {
  const [, setLocation] = useLocation();
  React.useEffect(() => {
    setLocation("/lams");
  }, [setLocation]);
  return <div className="min-h-screen flex items-center justify-center">Redirecting...</div>;
}

function Router() {
  return (
    <Switch>
      {/* Public routes (no auth required) */}
      <Route path="/public" component={PublicPortal} />
      <Route path="/public/sia" component={PublicSiaList} />
      <Route path="/public/sia/:id" component={PublicSiaDetail} />
      <Route path="/public/sia/:id/feedback" component={PublicSiaFeedback} />
      <Route path="/public/notifications" component={PublicNotifications} />
      <Route path="/public/notifications/:id" component={PublicNotificationDetail} />
      <Route path="/public/notifications/:id/objection" component={PublicObjection} />

      {/* Citizen authentication */}
      <Route path="/citizen/login" component={CitizenLogin} />
      <Route path="/citizen/dashboard">
        <CitizenRoute>
          <CitizenDashboard />
        </CitizenRoute>
      </Route>

      {/* Staff authentication */}
      <Route path="/login" component={Login} />
      
      {/* Protected staff routes - Default route redirects to LAMS */}
      <Route path="/">
        <ProtectedRoute>
          <RedirectToLams />
        </ProtectedRoute>
      </Route>
      <Route path="/lams">
        <ProtectedRoute>
          <LamsDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/lams/sia">
        <ProtectedRoute>
          <LamsSia />
        </ProtectedRoute>
      </Route>
      <Route path="/lams/notifications">
        <ProtectedRoute>
          <LamsNotifications />
        </ProtectedRoute>
      </Route>
      <Route path="/lams/objections">
        <ProtectedRoute>
          <LamsObjections />
        </ProtectedRoute>
      </Route>
      <Route path="/lams/compensation">
        <ProtectedRoute>
          <LamsCompensation />
        </ProtectedRoute>
      </Route>
      <Route path="/lams/possession">
        <ProtectedRoute>
          <LamsPossession />
        </ProtectedRoute>
      </Route>

      {/* Property Management System (PMS) Routes */}
      <Route path="/pms">
        <ProtectedRoute>
          <PMSDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/pms/analytics">
        <ProtectedRoute>
          <PMSAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/pms/reports">
        <ProtectedRoute>
          <PMSReports />
        </ProtectedRoute>
      </Route>
      <Route path="/pms/schemes">
        <ProtectedRoute>
          <Schemes />
        </ProtectedRoute>
      </Route>
      <Route path="/pms/schemes/:id">
        <ProtectedRoute>
          <SchemeDetail />
        </ProtectedRoute>
      </Route>
      <Route path="/pms/properties">
        <ProtectedRoute>
          <PropertySearch />
        </ProtectedRoute>
      </Route>
      <Route path="/pms/parties">
        <ProtectedRoute>
          <PropertySearch />
        </ProtectedRoute>
      </Route>

      {/* Backward compatibility routes */}
      <Route path="/property-management/dashboard">
        <ProtectedRoute>
          <PMSDashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/property-management/analytics">
        <ProtectedRoute>
          <PMSAnalytics />
        </ProtectedRoute>
      </Route>
      <Route path="/property-management/reports">
        <ProtectedRoute>
          <PMSReports />
        </ProtectedRoute>
      </Route>

      {/* Public Citizen Portal Routes */}
      <Route path="/pms/search">
        <PropertySearch />
      </Route>
      <Route path="/pms/property/:id">
        <Property360 />
      </Route>
      <Route path="/pms/property/:id/passbook">
        <PropertyPassbook />
      </Route>
      <Route path="/pms/service-requests">
        <ServiceRequests />
      </Route>
      <Route path="/pms/documents/:id">
        <DocumentDownloads />
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <Toaster />
      <Router />
    </TooltipProvider>
  );
}

export default App;
