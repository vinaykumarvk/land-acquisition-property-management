import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Users, MapPin } from "lucide-react";
import { Link } from "wouter";

export default function PublicPortal() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header with clickable logo */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link href="/public" className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer w-fit">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/assets/puda-logo.png?v=1" 
                alt="PUDA Logo" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('svg')) {
                    parent.innerHTML = '<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>';
                  }
                }}
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold">PUDA</h1>
              <p className="text-sm text-muted-foreground">LAMS & PMS Portal</p>
            </div>
          </Link>
        </div>
      </header>
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Land Acquisition Management System</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Public Portal - Access information about land acquisition processes,
            submit feedback, and view published notices
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto mb-8">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/public/sia")}>
            <CardHeader>
              <FileText className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Social Impact Assessments</CardTitle>
              <CardDescription>
                View published SIAs and provide your feedback
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View SIAs</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/public/notifications")}>
            <CardHeader>
              <AlertCircle className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Land Notifications</CardTitle>
              <CardDescription>
                View Section 11 and Section 19 notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">View Notifications</Button>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setLocation("/citizen/login")}>
            <CardHeader>
              <Users className="h-10 w-10 mb-2 text-primary" />
              <CardTitle>Citizen Portal</CardTitle>
              <CardDescription>
                Login to access your personalized dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full">Citizen Login</Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Need help? Contact the Land Acquisition Office
          </p>
          <Button variant="outline" onClick={() => setLocation("/login")}>
            Staff Login
          </Button>
        </div>
      </div>
    </div>
  );
}

