import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Trash2, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { uploadFile, UploadedFile } from "@/lib/fileUpload";
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

interface Parcel {
  id: number;
  parcelNo: string;
  village: string;
  taluka: string;
  district: string;
}

interface PossessionMedia {
  id: number;
  photoPath: string;
  gpsLat?: string | null;
  gpsLng?: string | null;
  hashSha256?: string | null;
  gpsSource?: string | null;
}

interface Possession {
  id: number;
  parcelId: number;
  scheduleDt: string;
  status: string;
  remarks?: string;
  certificatePdfPath?: string;
  parcel?: Parcel;
  media?: PossessionMedia[];
}

type EvidenceDraftItem = {
  upload?: UploadedFile;
  lat: string;
  lng: string;
  coordinateSource?: EvidenceCoordinateSource;
};

type EvidenceCoordinateSource = "manual" | "exif" | "device";

const createEmptyDraft = (): EvidenceDraftItem => ({
  lat: "",
  lng: "",
});

const ensureDraftList = (list?: EvidenceDraftItem[]): EvidenceDraftItem[] =>
  list && list.length ? list : [createEmptyDraft()];

const hasExifCoordinates = (file?: UploadedFile) =>
  !!file &&
  file.metadataSource === "exif" &&
  typeof file.gpsLat === "number" &&
  typeof file.gpsLng === "number";

const describeCoordinateSource = (source?: string | null) => {
  switch (source) {
    case "exif":
      return "Photo metadata";
    case "device":
      return "Device GPS";
    case "manual":
      return "Manual entry";
    default:
      return "Unspecified";
  }
};

const formatCoordinate = (value: number) => value.toFixed(6);

const leafletIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  iconSize: [25, 41],
  shadowSize: [41, 41],
});

export default function LamsPossession() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: parcels = [], isLoading: parcelsLoading } = useQuery<Parcel[]>({
    queryKey: ["/api/lams/parcels"],
    queryFn: async () => (await apiRequest("GET", "/api/lams/parcels")).json(),
  });

  const { data: possessions = [], isLoading: possessionLoading } = useQuery<Possession[]>({
    queryKey: ["/api/lams/possession"],
    queryFn: async () => (await apiRequest("GET", "/api/lams/possession")).json(),
  });

  const [scheduleForm, setScheduleForm] = useState({
    parcelId: "",
    scheduleDt: "",
    remarks: "",
  });

  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<number, EvidenceDraftItem[]>>({});
  const [uploadingPhotoFor, setUploadingPhotoFor] = useState<number | null>(null);
  const [geoLoadingFor, setGeoLoadingFor] = useState<{ possessionId: number; index: number } | null>(null);

  const schedulePossession = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/lams/possession", {
        parcelId: Number(scheduleForm.parcelId),
        scheduleDt: scheduleForm.scheduleDt,
        remarks: scheduleForm.remarks || undefined,
      });
    },
    onSuccess: () => {
      toast({ title: "Possession scheduled" });
      queryClient.invalidateQueries({ queryKey: ["/api/lams/possession"] });
      setScheduleForm({ parcelId: "", scheduleDt: "", remarks: "" });
    },
    onError: (error) =>
      toast({
        title: "Failed to schedule",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      }),
  });

  const startPossession = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/lams/possession/${id}/start`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/lams/possession"] }),
    onError: (error) =>
      toast({
        title: "Unable to start",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      }),
  });

  const uploadEvidence = useMutation({
    mutationFn: async (id: number) => {
      const draft = evidenceDrafts[id] || [];
      const mediaData = draft
        .filter((item) => item.upload?.path && item.lat && item.lng)
        .map((item) => ({
          photoPath: item.upload!.path,
          gpsLat: Number(item.lat),
          gpsLng: Number(item.lng),
          hashSha256: item.upload!.hash,
          gpsSource: item.coordinateSource ?? (hasExifCoordinates(item.upload) ? "exif" : "manual"),
        }));
      if (!mediaData.length) {
        throw new Error("Upload at least one photo with coordinates");
      }
      await apiRequest("POST", `/api/lams/possession/${id}/evidence`, { mediaData });
    },
    onSuccess: (_data, id) => {
      toast({ title: "Evidence uploaded" });
      setEvidenceDrafts((prev) => ({ ...prev, [id]: [] }));
      queryClient.invalidateQueries({ queryKey: ["/api/lams/possession"] });
    },
    onError: (error) =>
      toast({
        title: "Failed to upload",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      }),
  });

  const simpleAction = async (url: string, successMessage: string) => {
    try {
      await apiRequest("POST", url);
      toast({ title: successMessage });
      queryClient.invalidateQueries({ queryKey: ["/api/lams/possession"] });
    } catch (error) {
      toast({
        title: "Action failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    }
  };

  const addEvidenceRow = (possessionId: number) => {
    setEvidenceDrafts((prev) => {
      const list = ensureDraftList(prev[possessionId]);
      if (list.length >= 3) {
        toast({
          title: "Limit reached",
          description: "You can add up to three photos per upload.",
          variant: "destructive",
        });
        return prev;
      }
      return { ...prev, [possessionId]: [...list, createEmptyDraft()] };
    });
  };

  const removeEvidenceRow = (possessionId: number, index: number) => {
    setEvidenceDrafts((prev) => ({
      ...prev,
      [possessionId]: (prev[possessionId] || []).filter((_, idx) => idx !== index),
    }));
  };

  const handleEvidenceFile = async (possessionId: number, index: number, file?: File) => {
    if (!file) return;
    try {
      setUploadingPhotoFor(possessionId);
      const uploaded = await uploadFile(file);
      const metadataAvailable = hasExifCoordinates(uploaded);
      let metadataApplied = false;
      setEvidenceDrafts((prev) => {
        const list = ensureDraftList(prev[possessionId]);
        const next = list.map((item, idx): EvidenceDraftItem => {
          if (idx !== index) return item;
          if (metadataAvailable && !item.lat && !item.lng && uploaded.gpsLat != null && uploaded.gpsLng != null) {
            metadataApplied = true;
            return {
              ...item,
              upload: uploaded,
              lat: formatCoordinate(uploaded.gpsLat),
              lng: formatCoordinate(uploaded.gpsLng),
              coordinateSource: "exif",
            };
          }
          return { ...item, upload: uploaded };
        });
        return { ...prev, [possessionId]: next };
      });
      if (metadataApplied) {
        toast({
          title: "GPS metadata applied",
          description: `${uploaded.originalName} — coordinates auto-filled from EXIF.`,
        });
      } else if (metadataAvailable) {
        toast({
          title: "Photo metadata detected",
          description: `${uploaded.originalName} already has GPS tags. Clear coordinates to reapply them if needed.`,
        });
      } else {
        toast({ title: "Photo uploaded", description: uploaded.originalName });
      }
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setUploadingPhotoFor(null);
    }
  };

  const useCurrentLocation = (possessionId: number, index: number) => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation unavailable",
        description: "Your browser does not support location access.",
        variant: "destructive",
      });
      return;
    }
    setGeoLoadingFor({ possessionId, index });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setEvidenceDrafts((prev) => {
          const list = ensureDraftList(prev[possessionId]);
          const next = list.map((item, idx): EvidenceDraftItem =>
            idx === index
              ? {
                  ...item,
                  lat: formatCoordinate(latitude),
                  lng: formatCoordinate(longitude),
                  coordinateSource: "device",
                }
              : item
          );
          return { ...prev, [possessionId]: next };
        });
        setGeoLoadingFor(null);
      },
      (err) => {
        setGeoLoadingFor(null);
        toast({
          title: "Location access denied",
          description: err.message,
          variant: "destructive",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const renderEvidenceMap = (item: EvidenceDraftItem) => {
    const lat = item.lat ? Number(item.lat) : null;
    const lng = item.lng ? Number(item.lng) : null;
    if (lat === null || lng === null || Number.isNaN(lat) || Number.isNaN(lng)) return null;
    return (
      <MapContainer
        center={[lat, lng]}
        zoom={16}
        style={{ height: "200px", width: "100%", borderRadius: 8, minHeight: "200px" }}
        scrollWheelZoom={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={[lat, lng]} icon={leafletIcon} />
      </MapContainer>
    );
  };

  if (parcelsLoading || possessionLoading) {
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
          <CardTitle>Schedule Possession</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Parcel *</label>
            <Select
              value={scheduleForm.parcelId}
              onValueChange={(value) => setScheduleForm((prev) => ({ ...prev, parcelId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parcel" />
              </SelectTrigger>
              <SelectContent>
                {parcels.map((parcel) => (
                  <SelectItem key={parcel.id} value={String(parcel.id)}>
                    {parcel.parcelNo} — {parcel.village}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Schedule Date *</label>
            <Input
              type="datetime-local"
              value={scheduleForm.scheduleDt}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, scheduleDt: e.target.value }))}
            />
          </div>
          <div className="space-y-2 sm:col-span-2 md:col-span-1">
            <label className="text-sm font-medium">Remarks</label>
            <Input
              value={scheduleForm.remarks}
              onChange={(e) => setScheduleForm((prev) => ({ ...prev, remarks: e.target.value }))}
            />
          </div>
          <div className="col-span-full flex justify-end">
            <Button
              onClick={() => schedulePossession.mutate()}
              disabled={
                schedulePossession.isPending || !scheduleForm.parcelId || !scheduleForm.scheduleDt
              }
            >
              {schedulePossession.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scheduling...
                </>
              ) : (
                "Schedule"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Possession Workflow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {possessions.length ? (
            possessions.map((possession) => {
              const parcel = parcels.find((p) => p.id === possession.parcelId);
              const drafts = ensureDraftList(evidenceDrafts[possession.id]);
              return (
                <div key={possession.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold break-words">{parcel?.parcelNo || `Parcel #${possession.parcelId}`}</p>
                      <p className="text-xs text-muted-foreground">
                        Scheduled: {new Date(possession.scheduleDt).toLocaleString()}
                      </p>
                    </div>
                    <Badge className="w-fit">{possession.status.replace(/_/g, " ")}</Badge>
                  </div>

                  {possession.remarks && (
                    <p className="text-sm text-muted-foreground">{possession.remarks}</p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {possession.status === "scheduled" && (
                      <Button size="sm" variant="outline" onClick={() => startPossession.mutate(possession.id)}>
                        {startPossession.isPending ? "Starting..." : "Start"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => uploadEvidence.mutate(possession.id)}
                      disabled={uploadEvidence.isPending}
                    >
                      {uploadEvidence.isPending ? "Saving..." : "Upload Evidence"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        simpleAction(`/api/lams/possession/${possession.id}/certificate`, "Certificate generated")
                      }
                    >
                      Generate Certificate
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        simpleAction(`/api/lams/possession/${possession.id}/update-registry`, "Registry updated")
                      }
                    >
                      Update Registry
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        simpleAction(`/api/lams/possession/${possession.id}/close`, "Possession closed")
                      }
                    >
                      Close Case
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {drafts.map(
                      (item, index) => (
                        <div key={index} className="border rounded-md p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">Photo #{index + 1}</p>
                            {index > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeEvidenceRow(possession.id, index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleEvidenceFile(possession.id, index, e.target.files?.[0])}
                          />
                          <div className="text-xs text-muted-foreground">
                            {uploadingPhotoFor === possession.id
                              ? "Uploading photo..."
                              : item.upload && `Selected: ${item.upload.originalName}`}
                          </div>
                          <div className="grid gap-2 md:grid-cols-2">
                            <Input
                              placeholder="Latitude"
                              value={item.lat}
                              onChange={(e) =>
                                setEvidenceDrafts((prev) => {
                                  const list = ensureDraftList(prev[possession.id]);
                                  const next = list.map((entry, idx): EvidenceDraftItem =>
                                    idx === index
                                      ? { ...entry, lat: e.target.value, coordinateSource: "manual" }
                                      : entry
                                  );
                                  return { ...prev, [possession.id]: next };
                                })
                              }
                            />
                            <Input
                              placeholder="Longitude"
                              value={item.lng}
                              onChange={(e) =>
                                setEvidenceDrafts((prev) => {
                                  const list = ensureDraftList(prev[possession.id]);
                                  const next = list.map((entry, idx): EvidenceDraftItem =>
                                    idx === index
                                      ? { ...entry, lng: e.target.value, coordinateSource: "manual" }
                                      : entry
                                  );
                                  return { ...prev, [possession.id]: next };
                                })
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              geoLoadingFor?.possessionId === possession.id && geoLoadingFor.index === index
                            }
                            onClick={() => useCurrentLocation(possession.id, index)}
                          >
                            {geoLoadingFor?.possessionId === possession.id && geoLoadingFor.index === index ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" /> Fetching location...
                              </>
                            ) : (
                              <>
                                <MapPin className="h-3 w-3 mr-2" /> Use Current Location
                              </>
                            )}
                          </Button>
                          {item.coordinateSource === "exif" && (
                            <div className="text-xs text-emerald-600 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              Auto-filled from photo metadata
                            </div>
                          )}
                          {item.coordinateSource === "device" && (
                            <div className="text-xs text-sky-600 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Coordinates captured via current device
                            </div>
                          )}
                          {renderEvidenceMap(item)}
                        </div>
                      )
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addEvidenceRow(possession.id)}
                      className="w-fit"
                    >
                      Add Another Photo
                    </Button>
                  </div>

                  {possession.media && possession.media.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Captured Evidence</p>
                      <div className="space-y-2">
                        {possession.media.map((media) => (
                          <div key={media.id} className="text-sm border rounded-md p-2 flex flex-col gap-1">
                            <a className="text-primary underline" href={`/${media.photoPath}`} target="_blank" rel="noreferrer">
                              View Photo
                            </a>
                            <span className="text-xs text-muted-foreground">
                              {media.gpsLat && media.gpsLng
                                ? `Lat ${media.gpsLat}, Lng ${media.gpsLng}`
                                : "Coordinates unavailable"}
                            </span>
                            {media.gpsSource && (
                              <span className="text-xs text-muted-foreground">
                                Source: {describeCoordinateSource(media.gpsSource)}
                              </span>
                            )}
                            {media.hashSha256 && (
                              <span className="text-xs text-muted-foreground break-all">
                                Hash: {media.hashSha256}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">No possession records yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
