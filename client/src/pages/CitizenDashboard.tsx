import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, AlertCircle, MessageSquare, LogOut, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useUser, useLogout } from "@/lib/auth";
import { AppLayout } from "@/components/layout/AppLayout";

export default function CitizenDashboard() {
  const [, setLocation] = useLocation();
  const { data: user } = useUser();
  const logout = useLogout();

  const { data: myObjections, isLoading: objectionsLoading } = useQuery({
    queryKey: ["/api/lams/objections", "citizen"],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequest("GET", "/api/lams/objections");
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!user,
  });

  const handleLogout = async () => {
    await logout.mutateAsync();
    setLocation("/public");
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Citizen Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome, {user.firstName} {user.lastName}
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Social Impact Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View published SIAs and submit your feedback
              </p>
              <Button onClick={() => setLocation("/public/sia")}>
                View SIAs
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Land Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                View Section 11/19 notifications and submit objections
              </p>
              <Button onClick={() => setLocation("/public/notifications")}>
                View Notifications
              </Button>
            </CardContent>
          </Card>
        </div>

        {myObjections && myObjections.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                My Objections
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {myObjections.map((obj: any) => (
                  <div key={obj.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium">{obj.notification?.title || "Objection"}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(obj.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge>{obj.status}</Badge>
                    </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                      {obj.text}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
