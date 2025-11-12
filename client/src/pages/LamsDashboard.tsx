import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Target, Shield, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface Sia {
  id: number;
  noticeNo: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
}

interface Notification {
  id: number;
  refNo: string;
  title: string;
  status: string;
  type: "sec11" | "sec19";
}

interface Objection {
  id: number;
  notificationId: number;
  parcelId: number;
  status: string;
  submittedByName?: string | null;
  submittedByPhone?: string | null;
}

export default function LamsDashboard() {
  const [, setLocation] = useLocation();

  const { data: sias, isLoading: siasLoading } = useQuery<Sia[]>({
    queryKey: ["/api/lams/sia"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/sia");
      return response.json();
    },
  });

  const { data: notifications, isLoading: notificationsLoading } = useQuery<Notification[]>({
    queryKey: ["/api/lams/notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/notifications");
      return response.json();
    },
  });

  const { data: objections, isLoading: objectionsLoading } = useQuery<Objection[]>({
    queryKey: ["/api/lams/objections"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/objections");
      return response.json();
    },
  });

  const pendingObjections = objections?.filter(
    (obj) => !["resolved", "rejected"].includes(obj.status)
  ).length ?? 0;

  const openSias = sias?.filter((sia) => sia.status !== "closed").length ?? 0;
  const activeNotifications = notifications?.filter(
    (notification) => notification.status !== "closed"
  ).length ?? 0;

  if (siasLoading || notificationsLoading || objectionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">LAMS Operations Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Track Social Impact Assessments, notifications, and citizen objections in one place.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={() => setLocation("/lams/sia")} className="w-full sm:w-auto">Manage SIAs</Button>
          <Button variant="outline" onClick={() => setLocation("/lams/notifications")} className="w-full sm:w-auto">
            Manage Notifications
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active SIAs</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openSias}</div>
            <p className="text-xs text-muted-foreground">
              {sias?.length ?? 0} total assessments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Notifications</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeNotifications}</div>
            <p className="text-xs text-muted-foreground">
              {notifications?.filter((n) => n.type === "sec11").length ?? 0} Section 11 ·{" "}
              {notifications?.filter((n) => n.type === "sec19").length ?? 0} Section 19
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Objections</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{pendingObjections}</div>
            <p className="text-xs text-muted-foreground">
              {objections?.length ?? 0} total submissions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Latest SIAs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sias && sias.length > 0 ? (
              sias.slice(0, 5).map((sia) => (
                <div
                  key={sia.id}
                  onClick={() => setLocation(`/lams/sia?id=${sia.id}`)}
                  className="flex items-center justify-between border rounded-md p-3 cursor-pointer hover:bg-accent hover:border-primary transition-colors"
                >
                  <div>
                    <p className="font-medium">{sia.title}</p>
                    <p className="text-xs text-muted-foreground">{sia.noticeNo}</p>
                  </div>
                  <Badge variant="secondary" className="uppercase">
                    {sia.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No SIAs available.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {notifications && notifications.length > 0 ? (
              notifications.slice(0, 5).map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => setLocation(`/lams/notifications?id=${notification.id}`)}
                  className="flex items-center justify-between border rounded-md p-3 cursor-pointer hover:bg-accent hover:border-primary transition-colors"
                >
                  <div>
                    <p className="font-medium">{notification.title}</p>
                    <p className="text-xs text-muted-foreground">{notification.refNo}</p>
                  </div>
                    <Badge variant={notification.type === "sec11" ? "default" : "destructive"}>
                      {notification.type === "sec11" ? "Sec 11" : "Sec 19"}
                    </Badge>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Action Center</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <Button variant="outline" onClick={() => setLocation("/lams/sia")} className="w-full">
            Start New SIA
          </Button>
          <Button variant="outline" onClick={() => setLocation("/lams/notifications")} className="w-full">
            Draft Notification
          </Button>
          <Button variant="outline" onClick={() => setLocation("/lams/objections")} className="w-full sm:col-span-2 md:col-span-1">
            Review Objections
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

