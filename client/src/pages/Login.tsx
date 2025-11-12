import { useState } from "react";
import { useLogin } from "@/lib/auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [, setLocation] = useLocation();
  const login = useLogin();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      console.log("Attempting login with:", { username, password });
      const result = await login.mutateAsync({ username, password });
      console.log("Login result:", result);
      toast({
        title: "Login successful",
        description: "Welcome to PUDA Portal",
      });
      // Explicitly navigate to Dashboard after successful login
      setLocation("/");
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background gradient-bg flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md card-shadow-lg glass-effect animate-scale-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center card-shadow overflow-hidden">
              <img 
                src="/assets/puda-logo.png?v=1" 
                alt="PUDA Logo" 
                className="h-full w-full object-contain p-2"
                onError={(e) => {
                  // Fallback to icon if logo not found
                  console.error('Failed to load PUDA logo:', e);
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('svg')) {
                    parent.innerHTML = '<svg class="h-8 w-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>';
                  }
                }}
              />
            </div>
          </div>
          <CardTitle className="text-2xl text-gradient">Welcome to PUDA</CardTitle>
          <p className="text-muted-foreground">LAMS & PMS Portal</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="transition-all duration-300 focus:ring-2 focus:ring-primary"
                required
              />
            </div>
            {login.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  {login.error.message || "Invalid credentials"}
                </AlertDescription>
              </Alert>
            )}
            <Button 
              type="submit" 
              className="w-full btn-gradient py-3 text-lg font-semibold" 
              disabled={login.isPending}
            >
              {login.isPending ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
