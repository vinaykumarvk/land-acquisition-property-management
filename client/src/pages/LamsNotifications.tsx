import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Parcel {
  id: number;
  parcelNo: string;
  village: string;
  taluka: string;
  district: string;
}

interface Notification {
  id: number;
  refNo: string;
  title: string;
  type: "sec11" | "sec19";
  status: string;
  bodyHtml: string;
}

interface SiaOption {
  id: number;
  noticeNo: string;
  title: string;
}

type PublishSettings = {
  publishDate: string;
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
};

const STATUS_ACTIONS: Record<string, Array<{ label: string; action: "submit" | "approve" }>> = {
  draft: [{ label: "Submit for Legal Review", action: "submit" }],
  legal_review: [{ label: "Approve", action: "approve" }],
};

export default function LamsNotifications() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notifications, isLoading, error: notificationsError } = useQuery<Notification[]>({
    queryKey: ["/api/lams/notifications"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/lams/notifications");
        if (!response.ok) {
          throw new Error(`Failed to fetch notifications: ${response.status}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }
    },
  });

  const { data: parcels = [] } = useQuery<Parcel[]>({
    queryKey: ["/api/lams/parcels"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/parcels");
      return response.json();
    },
  });

  const { data: sias = [] } = useQuery<SiaOption[]>({
    queryKey: ["/api/lams/sia"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/sia");
      return response.json();
    },
  });

  const [formState, setFormState] = useState({
    type: "sec11" as "sec11" | "sec19",
    title: "",
    bodyHtml: "",
    siaId: "none",
    selectedParcels: [] as number[],
  });

  const [publishSettings, setPublishSettings] = useState<Record<number, PublishSettings>>({});
  const [highlightedNotificationId, setHighlightedNotificationId] = useState<number | null>(null);
  const [hasScrolledToNotification, setHasScrolledToNotification] = useState(false);

  useEffect(() => {
    if (!notifications || !Array.isArray(notifications)) return;
    setPublishSettings((prev) => {
      const next = { ...prev };
      let changed = false;
      notifications.forEach((notification) => {
        if (!next[notification.id]) {
          next[notification.id] = {
            publishDate: new Date().toISOString().slice(0, 16),
            email: true,
            sms: false,
            whatsapp: false,
          };
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [notifications]);

  // Read ID from URL query parameter on mount and scroll to it
  useEffect(() => {
    if (!notifications || !Array.isArray(notifications) || hasScrolledToNotification) return;
    
    try {
      const params = new URLSearchParams(window.location.search);
      const idParam = params.get("id");
      if (idParam) {
        const notificationId = parseInt(idParam, 10);
        if (!isNaN(notificationId) && notificationId > 0) {
          const notification = notifications.find((n) => n && n.id === notificationId);
          if (notification) {
            setHighlightedNotificationId(notificationId);
            setHasScrolledToNotification(true);
            // Scroll to the notification after a delay to ensure it's rendered
            const scrollTimeout = setTimeout(() => {
              try {
                const element = document.getElementById(`notification-${notificationId}`);
                if (element) {
                  element.scrollIntoView({ behavior: "smooth", block: "center" });
                  // Remove highlight after 3 seconds
                  setTimeout(() => {
                    setHighlightedNotificationId(null);
                  }, 3000);
                }
              } catch (error) {
                console.error("Error scrolling to notification:", error);
              }
            }, 300);
            
            return () => clearTimeout(scrollTimeout);
          }
        }
      }
    } catch (error) {
      console.error("Error in notification scroll effect:", error);
    }
  }, [notifications, hasScrolledToNotification]);

  const handleFieldChange = (field: string, value: string | number[] | "sec11" | "sec19") => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const toggleParcel = (parcelId: number) => {
    setFormState((prev) => {
      const selected = prev.selectedParcels.includes(parcelId)
        ? prev.selectedParcels.filter((id) => id !== parcelId)
        : [...prev.selectedParcels, parcelId];
      return { ...prev, selectedParcels: selected };
    });
  };

  const createNotification = useMutation({
    mutationFn: async () => {
      const notificationData: Record<string, string | number> = {
        type: formState.type,
        title: formState.title,
        bodyHtml: formState.bodyHtml,
      };

      if (formState.siaId && formState.siaId !== "none") {
        notificationData.siaId = Number(formState.siaId);
      }

      await apiRequest("POST", "/api/lams/notifications", {
        notificationData,
        parcelIds: formState.selectedParcels,
      });
    },
    onSuccess: () => {
      toast({ title: "Notification created", description: "Draft notification saved." });
      setFormState({
        type: "sec11",
        title: "",
        bodyHtml: "",
        siaId: "none",
        selectedParcels: [],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lams/notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "submit" | "approve" | "publish" }) => {
      if (action === "submit") {
        await apiRequest("POST", `/api/lams/notifications/${id}/submit-legal`);
      } else if (action === "approve") {
        await apiRequest("POST", `/api/lams/notifications/${id}/approve`);
      } else {
        const settings = publishSettings[id];
        if (!settings?.publishDate) {
          throw new Error("Select a publish date/time");
        }
        const notifyChannels = [
          settings.email && "email",
          settings.sms && "sms",
          settings.whatsapp && "whatsapp",
        ].filter(Boolean);
        await apiRequest("POST", `/api/lams/notifications/${id}/publish`, {
          publishDate: settings.publishDate,
          notifyChannels,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lams/notifications"] });
    },
    onError: (error) => {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const previewNotification = useMutation({
    mutationFn: async ({ id, publishDate }: { id: number; publishDate: string }) => {
      const response = await apiRequest("POST", `/api/lams/notifications/${id}/preview`, {
        publishDate,
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({ title: "Preview ready", description: "Opening preview in a new tab." });
      if (data.previewUrl) {
        window.open(data.previewUrl, "_blank");
      }
    },
    onError: (error) => {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title || !formState.bodyHtml || formState.selectedParcels.length === 0) {
      toast({
        title: "Missing information",
        description: "Title, body, and at least one parcel are required.",
        variant: "destructive",
      });
      return;
    }
    createNotification.mutate();
  };

  const parcelsByDistrict = useMemo(() => {
    return parcels.reduce<Record<string, Parcel[]>>((acc, parcel) => {
      acc[parcel.district] = acc[parcel.district] || [];
      acc[parcel.district].push(parcel);
      return acc;
    }, {});
  }, [parcels]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notificationsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-destructive font-semibold">Error loading notifications</p>
          <p className="text-sm text-muted-foreground">
            {notificationsError instanceof Error 
              ? notificationsError.message 
              : "An unexpected error occurred"}
          </p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Land Notification</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Notification Type *</label>
                <Select
                  value={formState.type}
                  onValueChange={(value: "sec11" | "sec19") => handleFieldChange("type", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sec11">Section 11 - Preliminary</SelectItem>
                    <SelectItem value="sec19">Section 19 - Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Linked SIA (optional)</label>
                <Select
                  value={formState.siaId}
                  onValueChange={(value) => handleFieldChange("siaId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select SIA" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No linked SIA</SelectItem>
                    {sias.map((sia) => (
                      <SelectItem key={sia.id} value={String(sia.id)}>
                        {sia.noticeNo} — {sia.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formState.title}
                onChange={(e) => handleFieldChange("title", e.target.value)}
                placeholder="Section 11 notification for Sector 21 parcels"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Body *</label>
              <Textarea
                value={formState.bodyHtml}
                onChange={(e) => handleFieldChange("bodyHtml", e.target.value)}
                placeholder="Include legal references, parcel details, and instructions"
                rows={5}
                required
              />
            </div>

            <div className="space-y-3">
              <label className="text-sm font-medium">Affected Parcels *</label>
              <div className="border rounded-lg p-3 max-h-64 overflow-y-auto space-y-3">
                {Object.entries(parcelsByDistrict).map(([district, districtParcels]) => (
                  <div key={district}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">
                      {district}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {districtParcels.map((parcel) => (
                        <label
                          key={parcel.id}
                          className="flex items-center gap-2 text-sm border rounded p-2 cursor-pointer hover:bg-accent transition-colors"
                        >
                          <input
                            type="checkbox"
                            className="h-4 w-4 flex-shrink-0"
                            checked={formState.selectedParcels.includes(parcel.id)}
                            onChange={() => toggleParcel(parcel.id)}
                          />
                          <span className="break-words">
                            {parcel.parcelNo} – {parcel.village}, {parcel.taluka}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                {parcels.length === 0 && (
                  <p className="text-sm text-muted-foreground">No parcels available.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={createNotification.isPending}>
                {createNotification.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  "Create Notification"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifications && Array.isArray(notifications) && notifications.length > 0 ? (
            notifications.map((notification) => {
              if (!notification || !notification.id) return null;
              
              const settings = publishSettings[notification.id] || {
                publishDate: new Date().toISOString().slice(0, 16),
                email: true,
                sms: false,
                whatsapp: false,
              };

              return (
                <div 
                  key={notification.id} 
                  id={`notification-${notification.id}`}
                  className={`border rounded-lg p-4 space-y-3 transition-all ${
                    highlightedNotificationId === notification.id 
                      ? "border-primary bg-primary/5 shadow-md" 
                      : ""
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold break-words">{notification.title || "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">{notification.refNo || "N/A"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={notification.type === "sec11" ? "default" : "destructive"}>
                        {notification.type === "sec11" ? "Section 11" : "Section 19"}
                      </Badge>
                      <Badge variant="secondary" className="uppercase">
                        {notification.status ? notification.status.replace(/_/g, " ") : "Unknown"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {notification.bodyHtml ? notification.bodyHtml.replace(/<[^>]+>/g, "") : "No content"}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {notification.status && STATUS_ACTIONS[notification.status]?.map((action) => (
                      <Button
                        key={action.label}
                        size="sm"
                        variant="outline"
                        disabled={updateStatus.isPending}
                        onClick={() => updateStatus.mutate({ id: notification.id, action: action.action })}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>

                  {notification.status === "approved" && (
                    <div className="border rounded-md p-3 space-y-3">
                      <p className="text-sm font-semibold">Publishing Controls</p>
                      <Input
                        type="datetime-local"
                        value={settings.publishDate}
                        onChange={(e) =>
                          setPublishSettings((prev) => ({
                            ...prev,
                            [notification.id]: { ...settings, publishDate: e.target.value },
                          }))
                        }
                      />
                      <div className="flex flex-wrap gap-4 text-sm">
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={settings.email}
                            onCheckedChange={(checked) =>
                              setPublishSettings((prev) => ({
                                ...prev,
                                [notification.id]: { ...settings, email: Boolean(checked) },
                              }))
                            }
                          />
                          Email
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={settings.sms}
                            onCheckedChange={(checked) =>
                              setPublishSettings((prev) => ({
                                ...prev,
                                [notification.id]: { ...settings, sms: Boolean(checked) },
                              }))
                            }
                          />
                          SMS
                        </label>
                        <label className="flex items-center gap-2">
                          <Checkbox
                            checked={settings.whatsapp}
                            onCheckedChange={(checked) =>
                              setPublishSettings((prev) => ({
                                ...prev,
                                [notification.id]: { ...settings, whatsapp: Boolean(checked) },
                              }))
                            }
                          />
                          WhatsApp
                        </label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          disabled={previewNotification.isPending}
                          onClick={() =>
                            previewNotification.mutate({
                              id: notification.id,
                              publishDate: settings.publishDate,
                            })
                          }
                        >
                          {previewNotification.isPending ? "Generating..." : "Preview PDF"}
                        </Button>
                        <Button
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: notification.id, action: "publish" })}
                        >
                          {updateStatus.isPending ? "Publishing..." : "Publish"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No notifications found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

