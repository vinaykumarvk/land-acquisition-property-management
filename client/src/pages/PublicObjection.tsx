import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, AlertCircle, Loader2, Paperclip, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  title: string;
  type: "sec11" | "sec19";
  status: string;
  parcels?: NotificationParcel[];
}

export default function PublicObjection() {
  const [, params] = useRoute("/public/notifications/:id/objection");
  const [, setLocation] = useLocation();
  const notificationId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const [objectionText, setObjectionText] = useState("");
  const [selectedParcelId, setSelectedParcelId] = useState<number | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);

  const { data: notification, isLoading } = useQuery<Notification>({
    queryKey: ["/api/public/notifications", notificationId],
    queryFn: async () => {
      if (!notificationId) throw new Error("Notification ID is required");
      const response = await apiRequest("GET", `/api/public/notifications/${notificationId}`);
      return response.json();
    },
    enabled: !!notificationId,
  });

  useEffect(() => {
    if (notification?.parcels && notification.parcels.length > 0) {
      setSelectedParcelId(notification.parcels[0].id);
    }
  }, [notification]);

  const isObjectionWindowOpen =
    notification?.type === "sec11" && notification?.status === "objection_window_open";

  const submitObjection = useMutation({
    mutationFn: async () => {
      if (!notificationId || !selectedParcelId) {
        throw new Error("Notification and parcel selection required");
      }
      const formData = new FormData();
      formData.append("notificationId", String(notificationId));
      formData.append("parcelId", String(selectedParcelId));
      formData.append("text", objectionText);
      formData.append("name", name);
      formData.append("phone", phone);
      if (email) formData.append("email", email);
      if (aadhaar) formData.append("aadhaar", aadhaar);
      attachments.forEach((file) => formData.append("attachments", file));

      const response = await fetch("/api/public/objections", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Failed to submit objection");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Objection Submitted",
        description: "Your objection has been submitted successfully. It will be reviewed by the authorities.",
      });
      setLocation(`/public/notifications/${notificationId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    const nextAttachments = [...attachments];

    for (const file of files) {
      if (file.size > 25 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 25MB limit.`,
          variant: "destructive",
        });
        continue;
      }
      if (nextAttachments.length >= 3) {
        toast({
          title: "Too many attachments",
          description: "You can upload up to 3 supporting files.",
          variant: "destructive",
        });
        break;
      }
      nextAttachments.push(file);
    }
    setAttachments(nextAttachments);
    event.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notificationId || !selectedParcelId || !name || !phone || !objectionText) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields and select a parcel",
        variant: "destructive",
      });
      return;
    }
    if (!isObjectionWindowOpen) {
      toast({
        title: "Objection window closed",
        description: "This notice is not currently accepting objections.",
        variant: "destructive",
      });
      return;
    }
    submitObjection.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation(`/public/notifications/${notificationId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Notification Details
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Submit Objection
            </CardTitle>
            {notification && (
              <p className="text-sm text-muted-foreground">
                {notification.title} ({notification.refNo})
              </p>
            )}
          </CardHeader>
          <CardContent>
            <Alert className="mb-4" variant={isObjectionWindowOpen ? "default" : "destructive"}>
              <AlertDescription>
                {isObjectionWindowOpen
                  ? "You are submitting an objection to a Section 11 notification. Please provide detailed information for review by the authorities."
                  : "Objections are not currently open for this notification. You can still draft your objection, but submission is disabled."}
              </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="parcel">Parcel *</Label>
                <Select
                  value={selectedParcelId ? String(selectedParcelId) : undefined}
                  onValueChange={(value) => setSelectedParcelId(parseInt(value))}
                  disabled={!notification?.parcels || notification.parcels.length === 0}
                >
                  <SelectTrigger id="parcel">
                    <SelectValue placeholder="Select the affected parcel" />
                  </SelectTrigger>
                  <SelectContent>
                    {notification?.parcels?.map((parcel) => (
                      <SelectItem key={parcel.id} value={String(parcel.id)}>
                        {parcel.parcelNo} — {parcel.village}, {parcel.taluka}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Make sure the parcel you select matches the land mentioned in your objection.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="aadhaar">Aadhaar Number (Optional)</Label>
                <Input
                  id="aadhaar"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objectionText">Objection Details *</Label>
                <Textarea
                  id="objectionText"
                  value={objectionText}
                  onChange={(e) => setObjectionText(e.target.value)}
                  placeholder="Please provide detailed information about your objection, including legal grounds, facts, and any supporting evidence..."
                  rows={8}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Be specific and provide as much detail as possible. Include relevant dates,
                  parcel numbers, and any legal references if applicable.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="attachments">Supporting Documents (Optional)</Label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={handleAttachmentChange}
                />
                <p className="text-xs text-muted-foreground">
                  Up to 3 files, 25MB each. Accepted formats: PDF, DOC, XLS, PNG, JPG.
                </p>
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <span
                        key={`${file.name}-${index}`}
                        className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded-full"
                      >
                        <Paperclip className="h-3 w-3" />
                        {file.name}
                        <button type="button" onClick={() => removeAttachment(index)}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {submitObjection.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {submitObjection.error instanceof Error
                      ? submitObjection.error.message
                      : "Failed to submit objection"}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/public/notifications/${notificationId}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    submitObjection.isPending ||
                    !isObjectionWindowOpen ||
                    !name ||
                    !phone ||
                    !objectionText ||
                    !selectedParcelId
                  }
                  className="flex-1"
                >
                  {submitObjection.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Objection"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
