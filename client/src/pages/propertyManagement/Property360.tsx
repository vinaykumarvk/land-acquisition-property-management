import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Home, Users, FileText, DollarSign, Receipt, Download, Loader2, AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

export default function Property360() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const propertyId = parseInt(params.id || "0");
  const searchParams = new URLSearchParams(window.location.search);
  const accessToken = searchParams.get("accessToken");

  const { data: property360, isLoading } = useQuery({
    queryKey: [`/api/public/property-management/properties/${propertyId}/360`, accessToken],
    queryFn: async () => {
      const url = `/api/public/property-management/properties/${propertyId}/360${accessToken ? `?accessToken=${accessToken}` : ""}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Property not found");
      return response.json();
    },
    enabled: propertyId > 0,
  });

  const handleDownloadPassbook = async () => {
    if (!property360?.owners?.[0]?.id) {
      toast({
        title: "Error",
        description: "Owner information not available",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = `/api/public/property-management/properties/${propertyId}/passbook?partyId=${property360.owners[0].id}${accessToken ? `&accessToken=${accessToken}` : ""}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      const data = await response.json();
      
      if (data.downloadUrl) {
        window.open(data.downloadUrl, "_blank");
        toast({
          title: "Passbook Generated",
          description: "Your passbook is ready for download",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate passbook",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">Loading property details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!property360) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" aria-hidden="true" />
            <h2 className="text-xl font-semibold mb-2">Property not found</h2>
            <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => setLocation("/pms/search")}>
              Back to Search
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Button variant="ghost" onClick={() => setLocation("/pms/search")} aria-label="Go back to property search" className="mb-2 sm:mb-0">
            ← Back to Search
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2 sm:mt-4">Property 360 View</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Parcel No: {property360.property.parcelNo}
          </p>
        </div>
        <Button onClick={handleDownloadPassbook} aria-label="Download property passbook" className="min-h-[44px] w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          Download Passbook
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="w-full sm:w-auto overflow-x-auto flex-nowrap">
          <TabsTrigger value="overview" className="min-w-[100px]">Overview</TabsTrigger>
          <TabsTrigger value="owners" className="min-w-[100px]">Owners</TabsTrigger>
          <TabsTrigger value="financial" className="min-w-[100px]">Financial</TabsTrigger>
          <TabsTrigger value="documents" className="min-w-[100px]">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Home className="mr-2 h-5 w-5" />
                  Property Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Address:</span>
                  <p className="text-sm text-muted-foreground">{property360.property.address}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Area:</span>
                  <p className="text-sm text-muted-foreground">{property360.property.area} sq. units</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Land Use:</span>
                  <p className="text-sm text-muted-foreground">{property360.property.landUse || "N/A"}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className="ml-2">{property360.property.status}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="mr-2 h-5 w-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Current Balance:</span>
                  <p className="text-lg font-bold">₹{Number(property360.financial.currentBalance).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Total Dues:</span>
                  <p className="text-sm text-muted-foreground">₹{Number(property360.financial.totalDues).toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-sm font-medium">Total Paid:</span>
                  <p className="text-sm text-muted-foreground">₹{Number(property360.financial.totalPaid).toFixed(2)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="owners" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                Property Owners
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Share</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property360.owners?.map((owner: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{owner.name}</TableCell>
                        <TableCell>{owner.address}</TableCell>
                        <TableCell>{owner.phone || "N/A"}</TableCell>
                        <TableCell>{owner.sharePct}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {property360.owners?.map((owner: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-2">
                      <div>
                        <p className="font-semibold">{owner.name}</p>
                        <p className="text-sm text-muted-foreground">{owner.sharePct}% share</p>
                      </div>
                      <div>
                        <p className="text-sm">{owner.address}</p>
                        <p className="text-sm text-muted-foreground">{owner.phone || "N/A"}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Receipt className="mr-2 h-5 w-5" />
                Demand Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Note No</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {property360.financial.demandNotes?.map((dn: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>{dn.noteNo}</TableCell>
                        <TableCell>₹{Number(dn.amount).toFixed(2)}</TableCell>
                        <TableCell>{new Date(dn.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge>{dn.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {property360.financial.demandNotes?.map((dn: any, index: number) => (
                  <Card key={index}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-semibold">{dn.noteNo}</p>
                        <Badge>{dn.status}</Badge>
                      </div>
                      <div>
                        <p className="text-lg font-bold">₹{Number(dn.amount).toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">
                          Due: {new Date(dn.dueDate).toLocaleDateString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="mr-2 h-5 w-5" />
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {property360.allotment && (
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <p className="font-medium">Allotment Letter</p>
                      <p className="text-sm text-muted-foreground">
                        Letter No: {property360.allotment.letterNo}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      Download
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  More documents will be available here
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

