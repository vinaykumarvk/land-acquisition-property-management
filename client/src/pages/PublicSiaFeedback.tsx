import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, MessageSquare, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function PublicSiaFeedback() {
  const [, params] = useRoute("/public/sia/:id/feedback");
  const [, setLocation] = useLocation();
  const siaId = params?.id ? parseInt(params.id) : null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [feedback, setFeedback] = useState("");

  const { data: sia, isLoading } = useQuery({
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

  const submitFeedback = useMutation({
    mutationFn: async (data: {
      siaId: number;
      name: string;
      phone: string;
      email?: string;
      feedback: string;
    }) => {
      const response = await apiRequest("POST", `/api/lams/sia/${siaId}/feedback`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to submit feedback");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Feedback Submitted",
        description: "Thank you for your feedback!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/public/sia", siaId] });
      setLocation(`/public/sia/${siaId}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Submission Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!siaId || !name || !phone || !feedback) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    submitFeedback.mutate({
      siaId,
      name,
      phone,
      email: email || undefined,
      feedback,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation(`/public/sia/${siaId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to SIA Details
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Submit Feedback
            </CardTitle>
            {sia && (
              <p className="text-sm text-muted-foreground">
                {sia.title} ({sia.noticeNo})
              </p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedback">Your Feedback *</Label>
                <Textarea
                  id="feedback"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Share your thoughts, concerns, or suggestions about this SIA..."
                  rows={6}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your feedback will be reviewed and considered in the SIA process.
                </p>
              </div>

              {submitFeedback.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {submitFeedback.error instanceof Error
                      ? submitFeedback.error.message
                      : "Failed to submit feedback"}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation(`/public/sia/${siaId}`)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitFeedback.isPending || !name || !phone || !feedback}
                  className="flex-1"
                >
                  {submitFeedback.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

