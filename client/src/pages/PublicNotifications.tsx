import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Calendar, MapPin, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface NotificationParcel {
  id: number;
  parcelNo: string;
  village: string;
  taluka: string;
  district: string;
}

interface Notification {
  id: number;
  refNo: string;
  type: "sec11" | "sec19";
  title: string;
  bodyHtml: string;
  publishDate: string | null;
  status: string;
  parcels?: NotificationParcel[];
}

export default function PublicNotifications() {
  const [, setLocation] = useLocation();

  const { data: notifications, isLoading, error } = useQuery<Notification[]>({
    queryKey: ["/api/public/notifications"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/public/notifications");
      return response.json();
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getTypeBadge = (type: Notification["type"]) => {
    const colors: Record<Notification["type"], "default" | "destructive"> = {
      sec11: "default",
      sec19: "destructive",
    };
    return (
      <Badge variant={colors[type]}>
        {type === "sec11" ? "Section 11" : "Section 19"}
      </Badge>
    );
  };

  const stripHtml = (html: string) =>
    html?.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Land Acquisition Notices</h1>
          <p className="text-muted-foreground">
            View published Section 11 and Section 19 notifications
          </p>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setLocation("/public")} className="w-full sm:w-auto">
            Back to Public Portal
          </Button>
          <Button variant="outline" onClick={() => setLocation("/citizen/login")} className="w-full sm:w-auto">
            Citizen Login
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load notifications. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (!notifications || notifications.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No published notifications available at this time.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && notifications && notifications.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {notifications.map((notification) => (
              <Card key={notification.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <CardTitle className="text-lg break-words flex-1">{notification.title}</CardTitle>
                    <div className="flex flex-col items-start sm:items-end gap-1">
                      {getTypeBadge(notification.type)}
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                        {notification.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="font-mono text-xs">
                    {notification.refNo}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {stripHtml(notification.bodyHtml)}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        Published:{" "}
                        {notification.publishDate ? formatDate(notification.publishDate) : "Pending"}
                      </span>
                    </div>
                    {notification.parcels && notification.parcels.length > 0 && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {notification.parcels.length} parcel(s)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => setLocation(`/public/notifications/${notification.id}`)}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                    {notification.type === "sec11" && notification.status === "objection_window_open" && (
                      <Button
                        variant="outline"
                        onClick={() => setLocation(`/public/notifications/${notification.id}/objection`)}
                      >
                        Object
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
