import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  DollarSign, 
  Clock, 
  FileText,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function PMSAnalytics() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [schemeId, setSchemeId] = useState("");

  const { data: schemeAnalytics, isLoading: schemeLoading } = useQuery({
    queryKey: ["/api/property-management/analytics/schemes", { startDate, endDate, schemeId }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (schemeId) params.append("schemeId", schemeId);
      const response = await apiRequest("GET", `/api/property-management/analytics/schemes?${params.toString()}`);
      return response.json();
    },
  });

  const { data: receivablesAnalytics, isLoading: receivablesLoading } = useQuery({
    queryKey: ["/api/property-management/analytics/receivables", { startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const response = await apiRequest("GET", `/api/property-management/analytics/receivables?${params.toString()}`);
      return response.json();
    },
  });

  const { data: slaAnalytics, isLoading: slaLoading } = useQuery({
    queryKey: ["/api/property-management/analytics/sla", { startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const response = await apiRequest("GET", `/api/property-management/analytics/sla?${params.toString()}`);
      return response.json();
    },
  });

  const { data: registrationVolumes, isLoading: volumesLoading } = useQuery({
    queryKey: ["/api/property-management/analytics/registration-volumes", { startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const response = await apiRequest("GET", `/api/property-management/analytics/registration-volumes?${params.toString()}`);
      return response.json();
    },
  });

  if (schemeLoading || receivablesLoading || slaLoading || volumesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/pms">
            <Button variant="ghost" size="icon" aria-label="Go back to dashboard" className="min-h-[44px] min-w-[44px]">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Comprehensive analytics and insights
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter analytics by date range and scheme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  // Validate end date is after start date
                  if (endDate && e.target.value > endDate) {
                    setEndDate("");
                  }
                }}
                aria-describedby="startDate-help"
              />
              <p id="startDate-help" className="text-xs text-muted-foreground mt-1">
                Select the start date for the analytics period
              </p>
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => {
                  // Validate end date is after start date
                  if (startDate && e.target.value < startDate) {
                    return; // Don't update if invalid
                  }
                  setEndDate(e.target.value);
                }}
                min={startDate || undefined}
                aria-describedby="endDate-help"
                aria-invalid={startDate && endDate && endDate < startDate ? true : undefined}
              />
              <p id="endDate-help" className="text-xs text-muted-foreground mt-1">
                Must be after start date
              </p>
              {startDate && endDate && endDate < startDate && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  End date must be after start date
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="schemeId">Scheme ID (Optional)</Label>
              <Input
                id="schemeId"
                type="number"
                placeholder="Scheme ID"
                value={schemeId}
                onChange={(e) => setSchemeId(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scheme Funnel Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Scheme Funnel Analytics
          </CardTitle>
          <CardDescription>Application conversion rates by scheme</CardDescription>
        </CardHeader>
        <CardContent>
          {schemeAnalytics && schemeAnalytics.length > 0 ? (
            <div className="space-y-4">
              {schemeAnalytics.map((scheme: any) => (
                <div key={scheme.schemeId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">{scheme.schemeName}</h3>
                    <div className="flex gap-2">
                      <Badge variant="outline">
                        Conversion: {scheme.conversionRate.toFixed(1)}%
                      </Badge>
                      <Badge variant="outline">
                        Rejection: {scheme.rejectionRate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {scheme.funnel.map((stage: any, index: number) => (
                      <div key={stage.stage} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-muted-foreground">{stage.stage}:</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-6 relative">
                              <div
                                className="bg-primary h-6 rounded-full flex items-center justify-end pr-2"
                                style={{ width: `${stage.percentage}%` }}
                              >
                                <span className="text-xs text-primary-foreground font-medium">
                                  {stage.count}
                                </span>
                              </div>
                            </div>
                            <span className="text-sm font-medium w-16 text-right">
                              {stage.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No scheme analytics available</p>
          )}
        </CardContent>
      </Card>

      {/* Receivables Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Receivables Analytics
          </CardTitle>
          <CardDescription>Payment collection and aging analysis</CardDescription>
        </CardHeader>
        <CardContent>
          {receivablesAnalytics ? (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Total Demand</div>
                  <div className="text-2xl font-bold">₹{Number(receivablesAnalytics.totalDemandAmount).toLocaleString('en-IN')}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {receivablesAnalytics.totalDemandNotes} notes
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Paid</div>
                  <div className="text-2xl font-bold text-green-600">
                    ₹{Number(receivablesAnalytics.paidAmount).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {receivablesAnalytics.paidDemandNotes} notes
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Pending</div>
                  <div className="text-2xl font-bold text-orange-600">
                    ₹{Number(receivablesAnalytics.pendingAmount).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {receivablesAnalytics.pendingDemandNotes} notes
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Overdue</div>
                  <div className="text-2xl font-bold text-red-600">
                    ₹{Number(receivablesAnalytics.overdueAmount).toLocaleString('en-IN')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {receivablesAnalytics.overdueDemandNotes} notes
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm font-medium mb-2">Collection Rate</div>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-muted rounded-full h-6 relative">
                    <div
                      className="bg-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${receivablesAnalytics.collectionRate}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {receivablesAnalytics.collectionRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm font-medium mb-4">Aging Analysis</div>
                <div className="space-y-2">
                  {receivablesAnalytics.agingAnalysis.map((bucket: any) => (
                    <div key={bucket.bucket} className="flex items-center justify-between">
                      <span className="text-sm">{bucket.bucket} days</span>
                      <div className="flex items-center gap-4 flex-1 mx-4">
                        <div className="flex-1 bg-muted rounded-full h-4 relative">
                          <div
                            className="bg-red-600 h-4 rounded-full"
                            style={{ 
                              width: `${(Number(bucket.amount) / Number(receivablesAnalytics.overdueAmount)) * 100}%` 
                            }}
                          />
                        </div>
                        <span className="text-sm font-medium w-24 text-right">
                          ₹{Number(bucket.amount).toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs text-muted-foreground w-16 text-right">
                          ({bucket.count})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No receivables analytics available</p>
          )}
        </CardContent>
      </Card>

      {/* SLA Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            SLA Compliance Analytics
          </CardTitle>
          <CardDescription>Service level agreement compliance across all services</CardDescription>
        </CardHeader>
        <CardContent>
          {slaAnalytics ? (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Service Requests</div>
                  <div className="text-2xl font-bold mb-1">{slaAnalytics.serviceRequests.total}</div>
                  <div className="flex items-center gap-2 text-sm">
                    {slaAnalytics.serviceRequests.complianceRate >= 90 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{slaAnalytics.serviceRequests.complianceRate.toFixed(1)}% compliance</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Avg: {slaAnalytics.serviceRequests.averageResolutionTime.toFixed(1)}h
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Water Connections</div>
                  <div className="text-2xl font-bold mb-1">{slaAnalytics.waterConnections.total}</div>
                  <div className="flex items-center gap-2 text-sm">
                    {slaAnalytics.waterConnections.complianceRate >= 90 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{slaAnalytics.waterConnections.complianceRate.toFixed(1)}% compliance</span>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Sewerage Connections</div>
                  <div className="text-2xl font-bold mb-1">{slaAnalytics.sewerageConnections.total}</div>
                  <div className="flex items-center gap-2 text-sm">
                    {slaAnalytics.sewerageConnections.complianceRate >= 90 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{slaAnalytics.sewerageConnections.complianceRate.toFixed(1)}% compliance</span>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground mb-2">Registration Cases</div>
                  <div className="text-2xl font-bold mb-1">{slaAnalytics.registrationCases.total}</div>
                  <div className="flex items-center gap-2 text-sm">
                    {slaAnalytics.registrationCases.complianceRate >= 90 ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{slaAnalytics.registrationCases.complianceRate.toFixed(1)}% compliance</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No SLA analytics available</p>
          )}
        </CardContent>
      </Card>

      {/* Registration Volumes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Registration Volumes
          </CardTitle>
          <CardDescription>Registration cases by deed type and status</CardDescription>
        </CardHeader>
        <CardContent>
          {registrationVolumes ? (
            <div className="space-y-4">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Total Cases</div>
                  <div className="text-2xl font-bold">{registrationVolumes.totalCases}</div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm text-muted-foreground">Avg Processing Time</div>
                  <div className="text-2xl font-bold">{registrationVolumes.averageProcessingTime.toFixed(1)} days</div>
                </div>
              </div>
              <div className="border rounded-lg p-4">
                <div className="text-sm font-medium mb-4">By Deed Type</div>
                <div className="grid gap-2 md:grid-cols-3">
                  {Object.entries(registrationVolumes.byDeedType || {}).map(([type, count]: [string, any]) => (
                    <div key={type} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm capitalize">{type}</span>
                      <Badge>{count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No registration volumes available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

