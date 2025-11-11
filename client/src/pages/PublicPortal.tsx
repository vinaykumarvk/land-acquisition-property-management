import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, AlertCircle, Users, MapPin } from "lucide-react";

export default function PublicPortal() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
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

