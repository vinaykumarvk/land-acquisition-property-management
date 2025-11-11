import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, MapPin, ArrowLeft, AlertCircle, Info, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";
import { ParcelMap } from "@/components/maps";

interface NotificationParcel {
  id: number;
  parcelNo: string;
  village: string;
  taluka: string;
  district: string;
  areaSqM: string;
  status: string;
  lat?: number | null;
  lng?: number | null;
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

export default function PublicNotificationDetail() {
  const [, params] = useRoute("/public/notifications/:id");
  const [, setLocation] = useLocation();
  const notificationId = params?.id ? parseInt(params.id) : null;

  const { data: notification, isLoading, error } = useQuery<Notification>({
    queryKey: ["/api/public/notifications", notificationId],
    queryFn: async () => {
      if (!notificationId) throw new Error("Notification ID is required");
      const response = await apiRequest("GET", `/api/public/notifications/${notificationId}`);
      return response.json();
    },
    enabled: !!notificationId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !notification) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load notification details. Please try again later.
            </AlertDescription>
          </Alert>
          <Button className="mt-4" onClick={() => setLocation("/public/notifications")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Notifications
          </Button>
        </div>
      </div>
    );
  }

  const parcels = notification.parcels ?? [];
  const parcelsForMap = parcels.map((parcel) => ({
    ...parcel,
    lat: parcel.lat ?? null,
    lng: parcel.lng ?? null,
    areaSqM: parseFloat(parcel.areaSqM),
  }));

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/public/notifications")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Notifications
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-2">
              <CardTitle className="text-xl sm:text-2xl break-words flex-1">{notification.title}</CardTitle>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <Badge variant={notification.type === "sec11" ? "default" : "destructive"}>
                  {notification.type === "sec11" ? "Section 11" : "Section 19"}
                </Badge>
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wide">
                  {notification.status.replace(/_/g, " ")}
                </Badge>
              </div>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{notification.refNo}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Published Date</p>
                  <p className="text-sm text-muted-foreground">
                    {notification.publishDate ? formatDate(notification.publishDate) : "Pending"}
                  </p>
                </div>
              </div>
              {parcels.length > 0 && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Parcels</p>
                    <p className="text-sm text-muted-foreground">
                      {parcels.length} parcel(s)
                    </p>
                  </div>
                </div>
              )}
            </div>

            {notification.bodyHtml && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={notification.bodyHtml} />
                </div>
              </div>
            )}

            {parcelsForMap.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Affected Parcels</h3>
                <ParcelMap parcels={parcelsForMap} />
                <div className="mt-4 space-y-2">
                  {parcels.map((parcel: any) => (
                    <Card key={parcel.id} className="p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{parcel.parcelNo}</p>
                          <p className="text-sm text-muted-foreground">
                            {parcel.village}, {parcel.taluka}, {parcel.district}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Area: {parseFloat(parcel.areaSqM).toLocaleString()} sq m
                          </p>
                        </div>
                        <Badge>{parcel.status}</Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {notification.type === "sec11" && (
              <div className="space-y-3">
                {notification.status !== "objection_window_open" && (
                  <Alert variant="default">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Objections are {notification.status === "objection_resolved" ? "closed" : "not open"} for this notice.
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  onClick={() => setLocation(`/public/notifications/${notification.id}/objection`)}
                  className="flex-1"
                  disabled={notification.status !== "objection_window_open"}
                >
                  <AlertCircle className="mr-2 h-4 w-4" />
                  Submit Objection
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
