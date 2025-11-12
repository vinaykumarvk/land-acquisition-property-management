import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Users, Phone, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useUser } from "@/lib/auth";

type Step = "phone" | "otp" | "register";

export default function CitizenLogin() {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isVerifyingOTP, setIsVerifyingOTP] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [expiresIn, setExpiresIn] = useState(0);
  const [error, setError] = useState("");
  
  // Registration fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [aadhaar, setAadhaar] = useState("");

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { refetch } = useUser();

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSendingOTP(true);

    try {
      const response = await apiRequest("POST", "/api/public/auth/send-otp", { phone });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to send OTP");
      }

      setOtpSent(true);
      setExpiresIn(data.expiresIn || 600);
      setStep("otp");
      toast({
        title: "OTP Sent",
        description: data.message || "Please check your phone for the OTP",
      });

      // Start countdown
      let remaining = data.expiresIn || 600;
      const interval = setInterval(() => {
        remaining -= 1;
        setExpiresIn(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    } catch (error: any) {
      setError(error.message || "Failed to send OTP");
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP");
      return;
    }

    setIsVerifyingOTP(true);

    try {
      const response = await apiRequest("POST", "/api/public/auth/verify-otp", {
        phone,
        otp,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Invalid OTP");
      }

      // Check if user exists or needs registration
      if (data.user) {
        // User exists, login successful
        await refetch();
        toast({
          title: "Login Successful",
          description: "Welcome to the Citizen Portal",
        });
        setLocation("/citizen/dashboard");
      } else {
        // New user, need registration
        setStep("register");
      }
    } catch (error: any) {
      setError(error.message || "Invalid OTP");
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid OTP",
        variant: "destructive",
      });
    } finally {
      setIsVerifyingOTP(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!firstName || !lastName) {
      setError("First name and last name are required");
      return;
    }

    setIsRegistering(true);

    try {
      const response = await apiRequest("POST", "/api/public/auth/verify-otp", {
        phone,
        otp,
        userData: {
          firstName,
          lastName,
          email: email || undefined,
          aadhaar: aadhaar || undefined,
        },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Registration failed");
      }

      await refetch();
      toast({
        title: "Registration Successful",
        description: "Welcome to the Citizen Portal",
      });
      setLocation("/citizen/dashboard");
    } catch (error: any) {
      setError(error.message || "Registration failed");
      toast({
        title: "Registration Failed",
        description: error.message || "Registration failed",
        variant: "destructive",
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="min-h-screen bg-background gradient-bg flex flex-col animate-fade-in">
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
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md card-shadow-lg glass-effect animate-scale-in">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center card-shadow">
              <Users className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl text-gradient">Citizen Portal</CardTitle>
          <CardDescription>Access land acquisition information and submit feedback</CardDescription>
        </CardHeader>
        <CardContent>
          {step === "phone" && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                    placeholder="10-digit mobile number"
                    className="pl-10 transition-all duration-300 focus:ring-2 focus:ring-primary"
                    maxLength={10}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll send you an OTP to verify your number
                </p>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full btn-gradient py-3 text-lg font-semibold"
                disabled={isSendingOTP || phone.length !== 10}
              >
                {isSendingOTP ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    <span>Sending OTP...</span>
                  </div>
                ) : (
                  "Send OTP"
                )}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="space-y-2">
                <Label>Enter OTP</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {expiresIn > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    OTP expires in {formatTime(expiresIn)}
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setOtpSent(false);
                  }}
                >
                  Change Phone Number
                </Button>
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full btn-gradient py-3 text-lg font-semibold"
                disabled={isVerifyingOTP || otp.length !== 6}
              >
                {isVerifyingOTP ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    <span>Verifying...</span>
                  </div>
                ) : (
                  "Verify OTP"
                )}
              </Button>
            </form>
          )}

          {step === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Enter your first name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Enter your last name"
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
                <Label htmlFor="aadhaar">Aadhaar Number (Optional)</Label>
                <Input
                  id="aadhaar"
                  value={aadhaar}
                  onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, ""))}
                  placeholder="12-digit Aadhaar number"
                  maxLength={12}
                />
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full btn-gradient py-3 text-lg font-semibold"
                disabled={isRegistering || !firstName || !lastName}
              >
                {isRegistering ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    <span>Registering...</span>
                  </div>
                ) : (
                  "Complete Registration"
                )}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setLocation("/public")}
              className="text-sm"
            >
              Continue as Guest
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}

