import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Phone, Key } from "lucide-react";

export default function PropertySearch() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"search" | "otp" | "verified">("search");
  const [propertyRef, setPropertyRef] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [propertyId, setPropertyId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/public/property-management/properties/search/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyRef, phone }),
      });

      const data = await response.json();

      if (data.success) {
        setStep("otp");
        toast({
          title: "OTP Sent",
          description: data.message,
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/public/property-management/properties/search/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyRef, phone, otp }),
      });

      const data = await response.json();

      if (data.success && data.accessToken && data.propertyId) {
        setAccessToken(data.accessToken);
        setPropertyId(data.propertyId);
        setStep("verified");
        toast({
          title: "Verified",
          description: "OTP verified successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to verify OTP",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewProperty = () => {
    if (propertyId && accessToken) {
      setLocation(`/pms/property/${propertyId}?accessToken=${accessToken}`);
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Search className="mr-2 h-5 w-5" />
            Property Search
          </CardTitle>
          <CardDescription>
            Search for your property using parcel number and verify with OTP
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "search" && (
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <Label htmlFor="propertyRef">Parcel Number / Reference</Label>
                <Input
                  id="propertyRef"
                  value={propertyRef}
                  onChange={(e) => setPropertyRef(e.target.value)}
                  placeholder="Enter parcel number"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    // Allow only digits
                    const value = e.target.value.replace(/\D/g, '');
                    setPhone(value.slice(0, 10)); // Limit to 10 digits
                  }}
                  placeholder="Enter 10-digit phone number"
                  required
                  maxLength={10}
                  inputMode="numeric"
                  pattern="[0-9]{10}"
                  aria-describedby="phone-help"
                />
                <p id="phone-help" className="text-xs text-muted-foreground mt-1">
                  Enter your 10-digit registered phone number
                </p>
              </div>
              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="text-sm text-muted-foreground">
                OTP has been sent to {phone}. Please enter the OTP to continue.
              </div>
              <div>
                <Label htmlFor="otp">Enter OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    // Allow only digits
                    const value = e.target.value.replace(/\D/g, '');
                    setOtp(value.slice(0, 6)); // Limit to 6 digits
                  }}
                  placeholder="Enter 6-digit OTP"
                  maxLength={6}
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  aria-describedby="otp-help"
                  autoComplete="one-time-code"
                />
                <p id="otp-help" className="text-xs text-muted-foreground mt-1">
                  Enter the 6-digit OTP sent to {phone}
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep("search")}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  {isLoading ? "Verifying..." : "Verify OTP"}
                </Button>
              </div>
            </form>
          )}

          {step === "verified" && (
            <div className="space-y-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <Key className="h-12 w-12 mx-auto mb-2 text-green-600" />
                <h3 className="font-semibold text-lg">Verification Successful!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You can now access your property details
                </p>
              </div>
              <Button onClick={handleViewProperty} className="w-full">
                View Property Details
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("search");
                  setPropertyRef("");
                  setPhone("");
                  setOtp("");
                  setAccessToken("");
                  setPropertyId(null);
                }}
                className="w-full"
              >
                Search Another Property
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

