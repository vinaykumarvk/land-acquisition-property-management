import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { uploadFile, UploadedFile } from "@/lib/fileUpload";

interface Sia {
  id: number;
  noticeNo: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
}

interface Hearing {
  id: number;
  date: string;
  venue: string;
  agenda?: string;
  minutesPath?: string | null;
}

interface SiaDetails extends Sia {
  hearings?: Hearing[];
}

export default function LamsSia() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: sias, isLoading } = useQuery<Sia[]>({
    queryKey: ["/api/lams/sia"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/sia");
      return response.json();
    },
  });

  const [formState, setFormState] = useState({
    title: "",
    description: "",
    startDate: "",
    endDate: "",
  });
  const [selectedSiaId, setSelectedSiaId] = useState<string>("");
  const [hearingForm, setHearingForm] = useState({
    date: "",
    venue: "",
    agenda: "",
  });
  const [completeForm, setCompleteForm] = useState({
    hearingId: "",
    attendees: "",
  });
  const [minutesUpload, setMinutesUpload] = useState<UploadedFile | null>(null);
  const [isUploadingMinutes, setIsUploadingMinutes] = useState(false);

  const { data: selectedSiaDetail, refetch: refetchSelectedSia, isFetching: loadingSelectedSia } = useQuery<SiaDetails>({
    queryKey: ["/api/lams/sia/detail", selectedSiaId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/lams/sia/${selectedSiaId}`);
      return response.json();
    },
    enabled: !!selectedSiaId,
  });

  const handleChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const createSia = useMutation({
    mutationFn: async () => {
      const payload = {
        title: formState.title,
        description: formState.description,
        startDate: formState.startDate,
        endDate: formState.endDate,
      };
      await apiRequest("POST", "/api/lams/sia", payload);
    },
    onSuccess: () => {
      toast({ title: "SIA created", description: "Draft SIA created successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/lams/sia"] });
      setFormState({ title: "", description: "", startDate: "", endDate: "" });
    },
    onError: (error) => {
      toast({
        title: "Failed to create SIA",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const scheduleHearing = useMutation({
    mutationFn: async () => {
      if (!selectedSiaId) {
        throw new Error("Select an SIA to schedule hearing");
      }
      const payload = {
        date: hearingForm.date,
        venue: hearingForm.venue,
        agenda: hearingForm.agenda,
      };
      await apiRequest("POST", `/api/lams/sia/${selectedSiaId}/hearings`, payload);
    },
    onSuccess: () => {
      toast({ title: "Hearing scheduled" });
      setHearingForm({ date: "", venue: "", agenda: "" });
      refetchSelectedSia();
    },
    onError: (error) =>
      toast({
        title: "Failed to schedule hearing",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      }),
  });

  const completeHearing = useMutation({
    mutationFn: async () => {
      if (!completeForm.hearingId) throw new Error("Select a hearing to complete");
      if (!minutesUpload?.path) throw new Error("Upload the signed minutes file before completing");
      const attendees = completeForm.attendees
        ? completeForm.attendees.split(",").map((s) => s.trim()).filter(Boolean)
        : [];
      await apiRequest("PUT", `/api/lams/sia/hearings/${completeForm.hearingId}/complete`, {
        minutesPath: minutesUpload.path,
        attendees,
      });
    },
    onSuccess: () => {
      toast({ title: "Hearing completed" });
      setCompleteForm({ hearingId: "", attendees: "" });
      setMinutesUpload(null);
      refetchSelectedSia();
    },
    onError: (error) => {
      toast({
        title: "Failed to complete hearing",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleMinutesUpload = async (file?: File) => {
    if (!file) return;
    try {
      setIsUploadingMinutes(true);
      const uploaded = await uploadFile(file);
      setMinutesUpload(uploaded);
      toast({ title: "Minutes uploaded", description: uploaded.originalName });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsUploadingMinutes(false);
    }
  };

  const transitionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: number; action: "publish" | "report" | "close" }) => {
      if (action === "publish") {
        await apiRequest("POST", `/api/lams/sia/${id}/publish`);
      } else if (action === "report") {
        await apiRequest("POST", `/api/lams/sia/${id}/generate-report`);
      } else {
        await apiRequest("POST", `/api/lams/sia/${id}/close`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lams/sia"] });
    },
    onError: (error) => {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title || !formState.description || !formState.startDate || !formState.endDate) {
      toast({
        title: "Missing fields",
        description: "Please fill all required fields.",
        variant: "destructive",
      });
      return;
    }
    createSia.mutate();
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
          <CardTitle>Draft New Social Impact Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Title *</label>
              <Input
                value={formState.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Acquisition of parcels in Sector 21"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Description *</label>
              <Textarea
                value={formState.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Provide purpose, scope, and affected area details."
                rows={4}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Feedback Window Start *</label>
              <Input
                type="date"
                value={formState.startDate}
                onChange={(e) => handleChange("startDate", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Feedback Window End *</label>
              <Input
                type="date"
                value={formState.endDate}
                onChange={(e) => handleChange("endDate", e.target.value)}
                required
              />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" disabled={createSia.isPending}>
                {createSia.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create SIA"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hearing Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select SIA</label>
              <Select value={selectedSiaId} onValueChange={setSelectedSiaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose SIA" />
                </SelectTrigger>
                <SelectContent>
                  {sias?.map((sia) => (
                    <SelectItem key={sia.id} value={String(sia.id)}>
                      {sia.noticeNo} — {sia.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedSiaDetail && (
              <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                <Badge variant="secondary" className="w-fit">{selectedSiaDetail.status.replace(/_/g, " ")}</Badge>
                <p className="text-sm text-muted-foreground break-words">
                  Feedback window: {new Date(selectedSiaDetail.startDate).toLocaleDateString()} –{" "}
                  {new Date(selectedSiaDetail.endDate).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          {loadingSelectedSia && <Loader2 className="h-4 w-4 animate-spin text-primary" />}

          {selectedSiaDetail && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-semibold">Schedule Hearing</p>
                <Input
                  type="datetime-local"
                  value={hearingForm.date}
                  onChange={(e) => setHearingForm((prev) => ({ ...prev, date: e.target.value }))}
                />
                <Input
                  placeholder="Venue"
                  value={hearingForm.venue}
                  onChange={(e) => setHearingForm((prev) => ({ ...prev, venue: e.target.value }))}
                />
                <Textarea
                  placeholder="Agenda"
                  rows={2}
                  value={hearingForm.agenda}
                  onChange={(e) => setHearingForm((prev) => ({ ...prev, agenda: e.target.value }))}
                />
                <Button
                  variant="outline"
                  disabled={
                    scheduleHearing.isPending ||
                    !selectedSiaId ||
                    !hearingForm.date ||
                    !hearingForm.venue
                  }
                  onClick={() => scheduleHearing.mutate()}
                >
                  {scheduleHearing.isPending ? "Scheduling..." : "Schedule Hearing"}
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold">Complete Hearing</p>
                <Select
                  value={completeForm.hearingId}
                  onValueChange={(value) => setCompleteForm((prev) => ({ ...prev, hearingId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select hearing" />
                  </SelectTrigger>
                  <SelectContent>
                    {(selectedSiaDetail.hearings || []).map((hearing) => (
                      <SelectItem key={hearing.id} value={String(hearing.id)}>
                        {new Date(hearing.date).toLocaleString()} @ {hearing.venue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="space-y-1">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => handleMinutesUpload(e.target.files?.[0])}
                  />
                  {minutesUpload && (
                    <p className="text-xs text-muted-foreground">
                      Uploaded: {minutesUpload.originalName}
                    </p>
                  )}
                </div>
                <Textarea
                  placeholder="Attendees (comma separated)"
                  rows={2}
                  value={completeForm.attendees}
                  onChange={(e) =>
                    setCompleteForm((prev) => ({ ...prev, attendees: e.target.value }))
                  }
                />
                <Button
                  variant="outline"
                  disabled={
                    completeHearing.isPending ||
                    isUploadingMinutes ||
                    !completeForm.hearingId ||
                    !minutesUpload
                  }
                  onClick={() => completeHearing.mutate()}
                >
                  {completeHearing.isPending ? "Submitting..." : "Mark Completed"}
                </Button>
              </div>
            </div>
          )}

          {selectedSiaDetail?.hearings && selectedSiaDetail.hearings.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Scheduled Hearings</p>
              <div className="space-y-2">
                {selectedSiaDetail.hearings.map((hearing) => (
                  <div key={hearing.id} className="border rounded-md p-3">
                    <p className="text-sm font-medium">
                      {new Date(hearing.date).toLocaleString()} — {hearing.venue}
                    </p>
                    {hearing.minutesPath ? (
                      <p className="text-xs text-muted-foreground">Minutes uploaded</p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Pending minutes</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing SIAs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sias && sias.length > 0 ? (
            sias.map((sia) => (
              <div key={sia.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold break-words">{sia.title}</p>
                    <p className="text-xs text-muted-foreground">{sia.noticeNo}</p>
                  </div>
                  <Badge className="w-fit">{sia.status.replace(/_/g, " ")}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{sia.description}</p>
                <div className="flex flex-wrap gap-2">
                  {sia.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => transitionMutation.mutate({ id: sia.id, action: "publish" })}
                    >
                      Publish
                    </Button>
                  )}
                  {sia.status === "hearing_completed" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => transitionMutation.mutate({ id: sia.id, action: "report" })}
                    >
                      Generate Report
                    </Button>
                  )}
                  {sia.status === "report_generated" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => transitionMutation.mutate({ id: sia.id, action: "close" })}
                    >
                      Close SIA
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No SIAs found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
