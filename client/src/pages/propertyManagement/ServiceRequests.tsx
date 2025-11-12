import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, FileText } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ServiceRequests() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchRef, setSearchRef] = useState("");

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["/api/public/property-management/service-requests"],
    queryFn: async () => {
      const response = await fetch("/api/public/property-management/service-requests", {
        credentials: "include",
      });
      return response.json();
    },
  });

  const createRequest = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/public/property-management/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create service request");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/public/property-management/service-requests"] });
      setIsCreateOpen(false);
      toast({
        title: "Request Submitted",
        description: "Your service request has been submitted successfully",
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

  const { data: searchedRequest } = useQuery({
    queryKey: [`/api/public/property-management/service-requests/${searchRef}`],
    queryFn: async () => {
      if (!searchRef) return null;
      const response = await fetch(`/api/public/property-management/service-requests/${searchRef}`, {
        credentials: "include",
      });
      if (!response.ok) return null;
      return response.json();
    },
    enabled: searchRef.length > 0,
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createRequest.mutate({
      requestType: formData.get("requestType"),
      description: formData.get("description"),
      propertyId: formData.get("propertyId") ? parseInt(formData.get("propertyId") as string) : null,
      partyId: formData.get("partyId") ? parseInt(formData.get("partyId") as string) : null,
      dataJson: formData.get("dataJson") ? JSON.parse(formData.get("dataJson") as string) : null,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "under_review":
        return "bg-blue-500";
      case "rejected":
        return "bg-destructive";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Service Requests</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Submit and track your service requests
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Service Request</DialogTitle>
              <DialogDescription>
                Submit a new service request
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="requestType">Request Type</Label>
                <Select name="requestType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select request type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="address_change">Address Change</SelectItem>
                    <SelectItem value="duplicate_document">Duplicate Document</SelectItem>
                    <SelectItem value="correction">Correction</SelectItem>
                    <SelectItem value="noc_request">NOC Request</SelectItem>
                    <SelectItem value="passbook_request">Passbook Request</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  required
                  placeholder="Describe your request"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="propertyId">Property ID (Optional)</Label>
                  <Input
                    id="propertyId"
                    name="propertyId"
                    type="number"
                    placeholder="Property ID"
                  />
                </div>
                <div>
                  <Label htmlFor="partyId">Party ID (Optional)</Label>
                  <Input
                    id="partyId"
                    name="partyId"
                    type="number"
                    placeholder="Party ID"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createRequest.isPending}>
                  {createRequest.isPending ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-4 w-4" />
            Track Request
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2">
            <Input
              placeholder="Enter reference number (e.g., SR-XXXXXXXX)"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
            />
          </div>
          {searchedRequest && (
            <div className="mt-4 p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Reference: {searchedRequest.refNo}</p>
                  <p className="text-sm text-muted-foreground">{searchedRequest.description}</p>
                </div>
                <Badge className={getStatusColor(searchedRequest.status)}>
                  {searchedRequest.status}
                </Badge>
              </div>
              {searchedRequest.resolution && (
                <div className="mt-2 text-sm">
                  <p className="font-medium">Resolution:</p>
                  <p className="text-muted-foreground">{searchedRequest.resolution}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : requests.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No service requests yet</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ref No</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request: any) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.refNo}</TableCell>
                        <TableCell>{request.requestType}</TableCell>
                        <TableCell className="max-w-md truncate">
                          {request.description}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(request.status)}>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(request.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {requests.map((request: any) => (
                  <Card key={request.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{request.refNo}</p>
                          <p className="text-sm text-muted-foreground">{request.requestType}</p>
                        </div>
                        <Badge className={getStatusColor(request.status)}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{request.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

