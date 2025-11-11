import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Users, FileText, Shuffle, CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SchemeDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const schemeId = parseInt(params.id || "0");
  const [isDrawOpen, setIsDrawOpen] = useState(false);
  const [selectedCount, setSelectedCount] = useState("");

  const { data: scheme, isLoading } = useQuery({
    queryKey: [`/api/property-management/schemes/${schemeId}`],
    queryFn: async () => {
      const response = await fetch(`/api/property-management/schemes/${schemeId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Scheme not found");
      return response.json();
    },
    enabled: schemeId > 0,
  });

  const conductDraw = useMutation({
    mutationFn: async (count: number) => {
      const response = await fetch(`/api/property-management/schemes/${schemeId}/draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ selectedCount: count }),
      });
      if (!response.ok) throw new Error("Failed to conduct draw");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/property-management/schemes/${schemeId}`] });
      setIsDrawOpen(false);
      toast({
        title: "Draw completed",
        description: `${data.selectedCount} applications selected`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const verifyApplication = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await fetch(`/api/property-management/applications/${applicationId}/verify`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to verify application");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/property-management/schemes/${schemeId}`] });
      toast({
        title: "Application verified",
        description: "Application has been verified",
      });
    },
  });

  const rejectApplication = useMutation({
    mutationFn: async (applicationId: number) => {
      const response = await fetch(`/api/property-management/applications/${applicationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: "Not eligible" }),
      });
      if (!response.ok) throw new Error("Failed to reject application");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/property-management/schemes/${schemeId}`] });
      toast({
        title: "Application rejected",
        description: "Application has been rejected",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "verified":
        return "bg-green-500";
      case "selected":
        return "bg-blue-500";
      case "rejected":
        return "bg-red-500";
      case "submitted":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">Loading scheme details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!scheme) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold mb-2">Scheme not found</h2>
            <p className="text-muted-foreground mb-4">The scheme you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation("/pms/schemes")}>
              Back to Schemes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const verifiedApplications = scheme.applications?.filter(
    (app: any) => app.status === "verified"
  ) || [];
  const submittedApplications = scheme.applications?.filter(
    (app: any) => app.status === "submitted"
  ) || [];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/pms/schemes")} className="mb-2 sm:mb-0">
            ← Back to Schemes
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2 sm:mt-4">{scheme.name}</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">{scheme.category}</p>
        </div>
        <div className="flex space-x-2 flex-wrap">
          {verifiedApplications.length > 0 && scheme.status === "published" && (
            <Dialog open={isDrawOpen} onOpenChange={setIsDrawOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Shuffle className="mr-2 h-4 w-4" />
                  Conduct Draw
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Conduct E-Draw</DialogTitle>
                  <DialogDescription>
                    Select how many applications should be selected
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Number of Selections</Label>
                    <Input
                      type="number"
                      min="1"
                      max={verifiedApplications.length}
                      value={selectedCount}
                      onChange={(e) => setSelectedCount(e.target.value)}
                      placeholder={`Max: ${verifiedApplications.length}`}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      {verifiedApplications.length} verified applications available
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsDrawOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const count = parseInt(selectedCount);
                        if (count > 0 && count <= verifiedApplications.length) {
                          conductDraw.mutate(count);
                        }
                      }}
                      disabled={conductDraw.isPending || !selectedCount}
                    >
                      {conductDraw.isPending ? "Conducting..." : "Conduct Draw"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview" className="min-w-[100px]">Overview</TabsTrigger>
          <TabsTrigger value="applications" className="min-w-[120px]">
            Applications ({scheme.applications?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="properties" className="min-w-[120px]">
            Properties ({scheme.properties?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className={scheme.status === "published" ? "bg-green-500" : "bg-gray-500"}>
                  {scheme.status}
                </Badge>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Applications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scheme.applications?.length || 0}</div>
                <p className="text-sm text-muted-foreground">
                  {verifiedApplications.length} verified
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{scheme.properties?.length || 0}</div>
                <p className="text-sm text-muted-foreground">Available for allotment</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
              <CardDescription>
                Manage applications for this scheme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Draw Seq</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheme.applications?.map((app: any) => (
                    <TableRow key={app.id}>
                      <TableCell>{app.id}</TableCell>
                      <TableCell>Party #{app.partyId}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(app.status)}>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{app.score || "N/A"}</TableCell>
                      <TableCell>{app.drawSeq || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {app.status === "submitted" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => verifyApplication.mutate(app.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => rejectApplication.mutate(app.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Properties</CardTitle>
              <CardDescription>
                Properties in this scheme
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parcel No</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheme.properties?.map((prop: any) => (
                    <TableRow key={prop.id}>
                      <TableCell>{prop.parcelNo}</TableCell>
                      <TableCell>{prop.address}</TableCell>
                      <TableCell>{prop.area}</TableCell>
                      <TableCell>
                        <Badge>{prop.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

