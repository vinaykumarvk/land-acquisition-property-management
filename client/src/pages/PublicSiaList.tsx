import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Calendar, MapPin, ArrowRight, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SIA {
  id: number;
  noticeNo: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
  location: string;
  createdAt: string;
}

export default function PublicSiaList() {
  const [, setLocation] = useLocation();

  const { data: sias, isLoading, error } = useQuery<SIA[]>({
    queryKey: ["/api/public/sia"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/public/sia");
      if (!response.ok) {
        throw new Error("Failed to fetch SIAs");
      }
      return response.json();
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      published: "default",
      closed: "secondary",
    };
    return (
      <Badge variant={variants[status] || "outline"}>{status}</Badge>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Social Impact Assessments</h1>
          <p className="text-muted-foreground">
            View published Social Impact Assessments and provide your feedback
          </p>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => setLocation("/public")} className="w-full sm:w-auto">
            Back to Public Portal
          </Button>
          <Button variant="outline" onClick={() => setLocation("/citizen/login")} className="w-full sm:w-auto">
            Citizen Login
          </Button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load SIAs. Please try again later.
            </AlertDescription>
          </Alert>
        )}

        {!isLoading && !error && (!sias || sias.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No published SIAs available at this time.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !error && sias && sias.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {sias.map((sia) => (
              <Card key={sia.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{sia.title}</CardTitle>
                    {getStatusBadge(sia.status)}
                  </div>
                  <CardDescription className="font-mono text-xs">
                    {sia.noticeNo}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {sia.description}
                  </p>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{sia.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {formatDate(sia.startDate)} - {formatDate(sia.endDate)}
                      </span>
                    </div>
                  </div>

                  <Button
                    className="w-full"
                    onClick={() => setLocation(`/public/sia/${sia.id}`)}
                  >
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

