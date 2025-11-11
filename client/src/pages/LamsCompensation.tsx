import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Parcel {
  id: number;
  parcelNo: string;
  village: string;
  taluka: string;
  district: string;
  areaSqM: string;
}

interface Owner {
  id: number;
  name: string;
  phone?: string;
}

interface Valuation {
  id: number;
  parcelId: number;
  basis: string;
  circleRate: string;
  computedAmount: string;
  justificationNotes?: string;
  parcel?: Parcel;
}

interface Award {
  id: number;
  parcelId: number;
  ownerId: number;
  mode: string;
  amount: string;
  status: string;
  awardNo?: string | null;
  owner?: Owner;
  parcel?: Parcel;
}

export default function LamsCompensation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: parcels = [], isLoading: parcelsLoading } = useQuery<Parcel[]>({
    queryKey: ["/api/lams/parcels"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/parcels");
      return response.json();
    },
  });

  const { data: owners = [], isLoading: ownersLoading } = useQuery<Owner[]>({
    queryKey: ["/api/lams/owners"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/owners");
      return response.json();
    },
  });

  const { data: valuations = [], isLoading: valuationsLoading } = useQuery<Valuation[]>({
    queryKey: ["/api/lams/valuations"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/valuations");
      return response.json();
    },
  });

  const { data: awards = [], isLoading: awardsLoading } = useQuery<Award[]>({
    queryKey: ["/api/lams/awards"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/lams/awards");
      return response.json();
    },
  });

  const [valuationForm, setValuationForm] = useState({
    parcelId: "",
    basis: "circle",
    circleRate: "",
    multipliers: "",
    justificationNotes: "",
  });

  const [awardForm, setAwardForm] = useState({
    parcelId: "",
    ownerId: "",
    mode: "cash",
  });

  const createValuation = useMutation({
    mutationFn: async () => {
      let multipliers = null;
      if (valuationForm.multipliers) {
        try {
          multipliers = JSON.parse(valuationForm.multipliers);
        } catch {
          throw new Error("Multipliers must be valid JSON");
        }
      }

      const payload = {
        parcelId: Number(valuationForm.parcelId),
        basis: valuationForm.basis,
        circleRate: Number(valuationForm.circleRate),
        factorMultipliersJson: multipliers,
        justificationNotes: valuationForm.justificationNotes || undefined,
      };
      await apiRequest("POST", "/api/lams/valuations", payload);
    },
    onSuccess: () => {
      toast({ title: "Valuation recorded" });
      queryClient.invalidateQueries({ queryKey: ["/api/lams/valuations"] });
      setValuationForm({
        parcelId: "",
        basis: "circle",
        circleRate: "",
        multipliers: "",
        justificationNotes: "",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to record valuation",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const createAward = useMutation({
    mutationFn: async () => {
      const payload = {
        parcelId: Number(awardForm.parcelId),
        ownerId: Number(awardForm.ownerId),
        mode: awardForm.mode,
      };
      await apiRequest("POST", "/api/lams/awards", payload);
    },
    onSuccess: () => {
      toast({ title: "Award drafted" });
      queryClient.invalidateQueries({ queryKey: ["/api/lams/awards"] });
      setAwardForm({
        parcelId: "",
        ownerId: "",
        mode: "cash",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to create award",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  if (parcelsLoading || ownersLoading || valuationsLoading || awardsLoading) {
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
          <CardTitle>Create Parcel Valuation</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Parcel *</label>
            <Select
              value={valuationForm.parcelId}
              onValueChange={(value) => setValuationForm((prev) => ({ ...prev, parcelId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select parcel" />
              </SelectTrigger>
              <SelectContent>
                {parcels.map((parcel) => (
                  <SelectItem key={parcel.id} value={String(parcel.id)}>
                    {parcel.parcelNo} — {parcel.village}, {parcel.taluka}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Valuation Basis *</label>
            <Select
              value={valuationForm.basis}
              onValueChange={(value) => setValuationForm((prev) => ({ ...prev, basis: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">Circle Rate</SelectItem>
                <SelectItem value="market">Market</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Circle Rate (per sq. m) *</label>
            <Input
              type="number"
              value={valuationForm.circleRate}
              onChange={(e) => setValuationForm((prev) => ({ ...prev, circleRate: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Multipliers (JSON)</label>
            <Textarea
              placeholder='e.g. {"landUse":1.2}'
              value={valuationForm.multipliers}
              onChange={(e) => setValuationForm((prev) => ({ ...prev, multipliers: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Justification Notes</label>
            <Textarea
              value={valuationForm.justificationNotes}
              onChange={(e) =>
                setValuationForm((prev) => ({ ...prev, justificationNotes: e.target.value }))
              }
              rows={3}
            />
          </div>
          <div className="md:col-span-2 flex justify-end">
            <Button
              onClick={() => createValuation.mutate()}
              disabled={
                createValuation.isPending ||
                !valuationForm.parcelId ||
                !valuationForm.circleRate
              }
            >
              {createValuation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                </>
              ) : (
                "Record Valuation"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Draft Compensation Award</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Parcel *</label>
            <Select
              value={awardForm.parcelId}
              onValueChange={(value) => setAwardForm((prev) => ({ ...prev, parcelId: value }))}
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
            <label className="text-sm font-medium">Owner *</label>
            <Select
              value={awardForm.ownerId}
              onValueChange={(value) => setAwardForm((prev) => ({ ...prev, ownerId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select owner" />
              </SelectTrigger>
              <SelectContent>
                {owners.map((owner) => (
                  <SelectItem key={owner.id} value={String(owner.id)}>
                    {owner.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2 md:col-span-1">
            <label className="text-sm font-medium">Compensation Mode *</label>
            <Select
              value={awardForm.mode}
              onValueChange={(value: "cash" | "pooling" | "hybrid") =>
                setAwardForm((prev) => ({ ...prev, mode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="pooling">Land Pooling</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-full flex justify-end">
            <Button
              onClick={() => createAward.mutate()}
              disabled={
                createAward.isPending ||
                !awardForm.parcelId ||
                !awardForm.ownerId
              }
            >
              {createAward.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Drafting...
                </>
              ) : (
                "Draft Award"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Valuations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {valuations.slice(0, 6).map((valuation) => {
              const parcel = parcels.find((p) => p.id === valuation.parcelId);
              return (
                <div key={valuation.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{parcel?.parcelNo || `Parcel #${valuation.parcelId}`}</p>
                      <p className="text-xs text-muted-foreground">{valuation.basis.toUpperCase()}</p>
                    </div>
                    <Badge>
                      ₹{Number(valuation.computedAmount).toLocaleString("en-IN")}
                    </Badge>
                  </div>
                  {valuation.justificationNotes && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {valuation.justificationNotes}
                    </p>
                  )}
                </div>
              );
            })}
            {valuations.length === 0 && (
              <p className="text-sm text-muted-foreground">No valuations recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Award Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {awards.slice(0, 6).map((award) => {
              const parcel = parcels.find((p) => p.id === award.parcelId);
              const owner = owners.find((o) => o.id === award.ownerId);
              return (
                <div key={award.id} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{parcel?.parcelNo || `Parcel #${award.parcelId}`}</p>
                      <p className="text-xs text-muted-foreground">{owner?.name || `Owner #${award.ownerId}`}</p>
                    </div>
                    <Badge variant={award.status === "draft" ? "secondary" : "default"}>
                      {award.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Mode: {award.mode.toUpperCase()} · Amount: ₹{Number(award.amount).toLocaleString("en-IN")}
                  </p>
                </div>
              );
            })}
            {awards.length === 0 && (
              <p className="text-sm text-muted-foreground">No awards drafted.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
