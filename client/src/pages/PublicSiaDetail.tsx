import { useQuery } from "@tanstack/react-query";
import { useLocation, useRoute, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Calendar, MapPin, ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { MarkdownRenderer } from "@/components/shared/MarkdownRenderer";

export default function PublicSiaDetail() {
  const [, params] = useRoute("/public/sia/:id");
  const [, setLocation] = useLocation();
  const siaId = params?.id ? parseInt(params.id) : null;

  const { data: sia, isLoading, error } = useQuery({
    queryKey: ["/api/public/sia", siaId],
    queryFn: async () => {
      if (!siaId) throw new Error("SIA ID is required");
      const response = await apiRequest("GET", `/api/public/sia/${siaId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch SIA");
      }
      return response.json();
    },
    enabled: !!siaId,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !sia) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertDescription>
              Failed to load SIA details. Please try again later.
            </AlertDescription>
          </Alert>
          <Button className="mt-4" onClick={() => setLocation("/public/sia")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to SIA List
          </Button>
        </div>
      </div>
    );
  }

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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/public/sia")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to SIA List
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
              <CardTitle className="text-xl sm:text-2xl break-words flex-1">{sia.title}</CardTitle>
              <Badge className="w-fit">{sia.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground font-mono">{sia.noticeNo}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Location</p>
                  <p className="text-sm text-muted-foreground">{sia.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Period</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(sia.startDate)} - {formatDate(sia.endDate)}
                  </p>
                </div>
              </div>
            </div>

            {sia.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <div className="prose prose-sm max-w-none">
                  <MarkdownRenderer content={sia.description} />
                </div>
              </div>
            )}

            {sia.feedback && sia.feedback.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Public Feedback</h3>
                <div className="grid gap-2 md:grid-cols-2">
                  {sia.feedback.map((fb: any) => (
                    <Card key={fb.id} className="p-3 flex flex-col h-full">
                      <p className="text-sm flex-1">{fb.text || fb.feedback}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex-shrink-0">
                        {fb.citizenName || fb.submittedBy} - {formatDate(fb.createdAt)}
                      </p>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={() => setLocation(`/public/sia/${sia.id}/feedback`)}
                className="flex-1"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Submit Feedback
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

