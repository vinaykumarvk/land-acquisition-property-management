import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function DocumentDownloads() {
  const params = useParams();
  const { toast } = useToast();
  const propertyId = parseInt(params.id || "0");
  const searchParams = new URLSearchParams(window.location.search);
  const accessToken = searchParams.get("accessToken");

  // In production, this would fetch actual documents
  const { data: documents = [] } = useQuery({
    queryKey: [`/api/public/property-management/properties/${propertyId}/documents`, accessToken],
    queryFn: async () => {
      // Placeholder - would fetch from actual document management
      return [
        {
          id: 1,
          type: "allotment_letter",
          name: "Allotment Letter",
          description: "Property allotment letter",
          downloadUrl: "#",
        },
        {
          id: 2,
          type: "demand_note",
          name: "Demand Notes",
          description: "Payment demand notes",
          downloadUrl: "#",
        },
        {
          id: 3,
          type: "receipt",
          name: "Payment Receipts",
          description: "Payment receipts",
          downloadUrl: "#",
        },
      ];
    },
    enabled: propertyId > 0,
  });

  const handleDownload = (doc: any) => {
    if (doc.downloadUrl && doc.downloadUrl !== "#") {
      window.open(doc.downloadUrl, "_blank");
    } else {
      toast({
        title: "Coming Soon",
        description: "Document download will be available soon",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Document Downloads
          </CardTitle>
          <CardDescription>
            Download your property-related documents
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary/10 rounded">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">{doc.description}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              </div>
            ))}
            {documents.length === 0 && (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No documents available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

