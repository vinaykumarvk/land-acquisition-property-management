import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
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
      {/* Header with clickable logo */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Link href="/public" className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer w-fit">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="/assets/puda-logo.png?v=1" 
                alt="PUDA Logo" 
                className="h-full w-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('svg')) {
                    parent.innerHTML = '<svg class="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>';
                  }
                }}
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold">PUDA</h1>
              <p className="text-sm text-muted-foreground">LAMS & PMS Portal</p>
            </div>
          </Link>
        </div>
      </header>
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
              <Card key={sia.id} className="hover:shadow-lg transition-shadow flex flex-col h-full">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg">{sia.title}</CardTitle>
                    {getStatusBadge(sia.status)}
                  </div>
                  <CardDescription className="font-mono text-xs">
                    {sia.noticeNo}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground line-clamp-3 flex-shrink-0">
                    {sia.description}
                  </p>

                  <div className="space-y-2 text-sm flex-shrink-0">
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

                  <div className="mt-auto pt-2">
                    <Button
                      className="w-full"
                      onClick={() => setLocation(`/public/sia/${sia.id}`)}
                    >
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

