import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PropertyPassbook() {
  const params = useParams();
  const { toast } = useToast();
  const propertyId = parseInt(params.id || "0");
  const searchParams = new URLSearchParams(window.location.search);
  const partyId = searchParams.get("partyId");
  const accessToken = searchParams.get("accessToken");

  const { data: passbook, isLoading } = useQuery({
    queryKey: [`/api/public/property-management/properties/${propertyId}/passbook`, partyId, accessToken],
    queryFn: async () => {
      if (!partyId) throw new Error("Party ID required");
      const url = `/api/public/property-management/properties/${propertyId}/passbook?partyId=${partyId}${accessToken ? `&accessToken=${accessToken}` : ""}`;
      const response = await fetch(url, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to generate passbook");
      return response.json();
    },
    enabled: propertyId > 0 && !!partyId,
  });

  const handleDownload = () => {
    if (passbook?.downloadUrl) {
      window.open(passbook.downloadUrl, "_blank");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <p>Generating passbook...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Property Account Passbook
          </CardTitle>
          <CardDescription>
            Download your property account passbook
          </CardDescription>
        </CardHeader>
        <CardContent>
          {passbook ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  Passbook generated successfully
                </p>
                <Button onClick={handleDownload} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Passbook PDF
                </Button>
              </div>
              {passbook.hash && (
                <div className="text-xs text-muted-foreground">
                  Document Hash: {passbook.hash}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No passbook available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

