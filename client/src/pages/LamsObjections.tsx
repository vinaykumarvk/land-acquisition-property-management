import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Paperclip } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Objection {
  id: number;
  notificationId: number;
  parcelId: number;
  text: string;
  status: string;
  submittedByName?: string | null;
  submittedByPhone?: string | null;
  attachmentsJson?: Array<{
    path: string;
    originalName: string;
  }> | null;
  createdAt: string;
}

export default function LamsObjections() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: objections, isLoading } = useQuery<Objection[]>({
    queryKey: ["/api/lams/objections"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/objections");
      return response.json();
    },
  });

  const [resolutionText, setResolutionText] = useState<Record<number, string>>({});
  const [resolutionStatus, setResolutionStatus] = useState<Record<number, "resolved" | "rejected">>({});

  const resolveObjection = useMutation({
    mutationFn: async ({ id, status, text }: { id: number; status: "resolved" | "rejected"; text: string }) => {
      await apiRequest("POST", `/api/lams/objections/${id}/resolve`, {
        resolutionText: text,
        status,
      });
    },
    onSuccess: () => {
      toast({ title: "Objection updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/lams/objections"] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update objection",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const attachmentUrl = (path: string) => {
    if (path.startsWith("uploads")) {
      return `/${path}`;
    }
    return path;
  };

  const handleResolve = (id: number) => {
    const text = resolutionText[id];
    const status = resolutionStatus[id];
    if (!text || !status) {
      toast({ title: "Resolution required", description: "Select status and enter resolution notes.", variant: "destructive" });
      return;
    }
    resolveObjection.mutate({ id, status, text });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Citizen Objections</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {objections && objections.length > 0 ? (
            objections.map((objection) => (
              <div key={objection.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      Notification #{objection.notificationId} · Parcel #{objection.parcelId}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {objection.submittedByName || "Citizen"} • {objection.submittedByPhone || "No phone"}
                    </p>
                  </div>
                  <Badge variant={["resolved", "rejected"].includes(objection.status) ? "secondary" : "destructive"}>
                    {objection.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{objection.text}</p>
                {objection.attachmentsJson && objection.attachmentsJson.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Attachments</p>
                    <div className="flex flex-wrap gap-2">
                      {objection.attachmentsJson.map((attachment, index) => (
                        <a
                          key={`${attachment.path}-${index}`}
                          href={attachmentUrl(attachment.path)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary underline"
                        >
                          <Paperclip className="h-3 w-3" />
                          {attachment.originalName}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-2 grid-cols-1 sm:grid-cols-[2fr,1fr] md:grid-cols-[2fr,1fr,auto]">
                  <Textarea
                    placeholder="Resolution notes"
                    value={resolutionText[objection.id] || ""}
                    onChange={(e) =>
                      setResolutionText((prev) => ({
                        ...prev,
                        [objection.id]: e.target.value,
                      }))
                    }
                    className="sm:col-span-2 md:col-span-1"
                  />
                  <Select
                    value={resolutionStatus[objection.id]}
                    onValueChange={(value: "resolved" | "rejected") =>
                      setResolutionStatus((prev) => ({
                        ...prev,
                        [objection.id]: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => handleResolve(objection.id)}
                    disabled={resolveObjection.isPending}
                    className="w-full sm:w-auto"
                  >
                    {resolveObjection.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No objections submitted yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

