import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Eye, Users, FileText, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";

export default function Schemes() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { data: schemes = [], isLoading } = useQuery({
    queryKey: ["/api/property-management/schemes"],
    queryFn: async () => {
      const response = await fetch("/api/property-management/schemes", {
        credentials: "include",
      });
      return response.json();
    },
  });

  const createScheme = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/property-management/schemes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create scheme");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/property-management/schemes"] });
      setIsCreateOpen(false);
      toast({
        title: "Scheme created",
        description: "Scheme has been created successfully",
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

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Validate JSON fields
    let eligibilityJson = null;
    let inventoryJson = null;
    const eligibilityValue = formData.get("eligibility") as string;
    const inventoryValue = formData.get("inventory") as string;
    
    if (eligibilityValue?.trim()) {
      try {
        eligibilityJson = JSON.parse(eligibilityValue);
      } catch (error) {
        toast({
          title: "Invalid JSON",
          description: "Eligibility criteria must be valid JSON",
          variant: "destructive",
        });
        return;
      }
    }
    
    if (inventoryValue?.trim()) {
      try {
        inventoryJson = JSON.parse(inventoryValue);
      } catch (error) {
        toast({
          title: "Invalid JSON",
          description: "Inventory must be valid JSON",
          variant: "destructive",
        });
        return;
      }
    }
    
    createScheme.mutate({
      name: formData.get("name"),
      category: formData.get("category"),
      eligibilityJson,
      inventoryJson,
      status: "draft",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-500";
      case "draft":
        return "bg-muted";
      case "closed":
        return "bg-destructive";
      default:
        return "bg-blue-500";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" aria-hidden="true" />
            <p className="text-muted-foreground">Loading schemes...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Property Schemes</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Manage property schemes and allotments
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" />
              Create Scheme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Scheme</DialogTitle>
              <DialogDescription>
                Create a new property scheme with eligibility criteria and inventory
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4" noValidate>
              <div>
                <Label htmlFor="name">Scheme Name</Label>
                <Input 
                  id="name" 
                  name="name" 
                  required 
                  aria-describedby="name-help"
                  aria-invalid={false}
                />
                <p id="name-help" className="text-xs text-muted-foreground mt-1">
                  Enter a descriptive name for the scheme
                </p>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select name="category" required>
                  <SelectTrigger id="category" aria-describedby="category-help">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
                <p id="category-help" className="text-xs text-muted-foreground mt-1">
                  Select the property category for this scheme
                </p>
              </div>
              <div>
                <Label htmlFor="eligibility">Eligibility Criteria (JSON)</Label>
                <Textarea
                  id="eligibility"
                  name="eligibility"
                  placeholder='{"minAge": 18, "maxIncome": 500000}'
                  aria-describedby="eligibility-help"
                  rows={4}
                />
                <p id="eligibility-help" className="text-xs text-muted-foreground mt-1">
                  Enter eligibility criteria as valid JSON (optional)
                </p>
              </div>
              <div>
                <Label htmlFor="inventory">Inventory (JSON)</Label>
                <Textarea
                  id="inventory"
                  name="inventory"
                  placeholder='{"plots": 100, "units": 50}'
                  aria-describedby="inventory-help"
                  rows={4}
                />
                <p id="inventory-help" className="text-xs text-muted-foreground mt-1">
                  Enter inventory details as valid JSON (optional)
                </p>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createScheme.isPending}>
                  {createScheme.isPending ? "Creating..." : "Create Scheme"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {schemes.map((scheme: any) => (
          <Card key={scheme.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Building2 className="mr-2 h-5 w-5" />
                  {scheme.name}
                </CardTitle>
                <Badge className={getStatusColor(scheme.status)}>
                  {scheme.status}
                </Badge>
              </div>
              <CardDescription>{scheme.category}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center text-sm text-muted-foreground">
                  <FileText className="mr-2 h-4 w-4" />
                  Created: {new Date(scheme.createdAt).toLocaleDateString()}
                </div>
                <div className="flex space-x-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/pms/schemes/${scheme.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/pms/schemes/${scheme.id}/applications`)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Applications
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {schemes.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No schemes yet</p>
            <Button
              className="mt-4"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Scheme
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

