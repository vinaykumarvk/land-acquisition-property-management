import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  FileText, 
  Download, 
  ArrowLeft,
  Loader2,
  BarChart3,
  DollarSign,
  MapPin
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";

export default function PMSReports() {
  const [reportType, setReportType] = useState<"operational" | "financial" | "spatial">("operational");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [schemeId, setSchemeId] = useState("");
  const [status, setStatus] = useState("");

  const { data: operationalReport, isLoading: operationalLoading } = useQuery({
    queryKey: ["/api/property-management/reports/operational", { startDate, endDate, schemeId, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (schemeId) params.append("schemeId", schemeId);
      if (status) params.append("status", status);
      const response = await apiRequest("GET", `/api/property-management/reports/operational?${params.toString()}`);
      return response.json();
    },
    enabled: reportType === "operational",
  });

  const { data: financialReport, isLoading: financialLoading } = useQuery({
    queryKey: ["/api/property-management/reports/financial", { startDate, endDate, status }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (status) params.append("status", status);
      const response = await apiRequest("GET", `/api/property-management/reports/financial?${params.toString()}`);
      return response.json();
    },
    enabled: reportType === "financial",
  });

  const { data: spatialReport, isLoading: spatialLoading } = useQuery({
    queryKey: ["/api/property-management/reports/spatial", { startDate, endDate }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      const response = await apiRequest("GET", `/api/property-management/reports/spatial?${params.toString()}`);
      return response.json();
    },
    enabled: reportType === "spatial",
  });

  const handleExport = async (type: "operational" | "financial") => {
    // Validate dates before export
    if (startDate && endDate && endDate < startDate) {
      return; // Don't export if dates are invalid
    }
    
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (schemeId) params.append("schemeId", schemeId);
    if (status) params.append("status", status);

    const url = `/api/property-management/reports/${type}/export?${params.toString()}`;
    window.open(url, "_blank");
  };

  const isLoading = operationalLoading || financialLoading || spatialLoading;

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
            <h1 className="text-2xl sm:text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Generate and export comprehensive reports
            </p>
          </div>
        </div>
      </div>

      {/* Report Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Report Type</CardTitle>
          <CardDescription>Select the type of report to generate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-3" role="radiogroup" aria-label="Report type selection">
            <Button
              variant={reportType === "operational" ? "default" : "outline"}
              onClick={() => setReportType("operational")}
              className="h-auto flex-col p-4 min-h-[80px]"
              aria-pressed={reportType === "operational"}
              role="radio"
              aria-label="Operational report type"
            >
              <BarChart3 className="h-6 w-6 mb-2" aria-hidden="true" />
              <span>Operational</span>
            </Button>
            <Button
              variant={reportType === "financial" ? "default" : "outline"}
              onClick={() => setReportType("financial")}
              className="h-auto flex-col p-4 min-h-[80px]"
              aria-pressed={reportType === "financial"}
              role="radio"
              aria-label="Financial report type"
            >
              <DollarSign className="h-6 w-6 mb-2" aria-hidden="true" />
              <span>Financial</span>
            </Button>
            <Button
              variant={reportType === "spatial" ? "default" : "outline"}
              onClick={() => setReportType("spatial")}
              className="h-auto flex-col p-4 min-h-[80px]"
              aria-pressed={reportType === "spatial"}
              role="radio"
              aria-label="Spatial report type"
            >
              <MapPin className="h-6 w-6 mb-2" aria-hidden="true" />
              <span>Spatial</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter report data by date range and other criteria</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
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
                aria-describedby="reportStartDate-help"
              />
              <p id="reportStartDate-help" className="text-xs text-muted-foreground mt-1">
                Start of report period
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
                aria-describedby="reportEndDate-help"
                aria-invalid={startDate && endDate && endDate < startDate ? true : undefined}
              />
              <p id="reportEndDate-help" className="text-xs text-muted-foreground mt-1">
                Must be after start date
              </p>
              {startDate && endDate && endDate < startDate && (
                <p className="text-xs text-red-600 mt-1" role="alert">
                  End date must be after start date
                </p>
              )}
            </div>
            {reportType === "operational" && (
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
            )}
            <div>
              <Label htmlFor="status">Status (Optional)</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="status" aria-describedby="status-help">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="issued">Issued</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <p id="status-help" className="text-xs text-muted-foreground mt-1">
                Filter by status
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {reportType === "operational" && operationalReport && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Operational Report
                  </CardTitle>
                  <CardDescription>
                    Generated at: {new Date(operationalReport.generatedAt).toLocaleString()}
                  </CardDescription>
                </div>
                <Button onClick={() => handleExport("operational")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Total Schemes</div>
                    <div className="text-2xl font-bold">{operationalReport.summary.totalSchemes}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Total Applications</div>
                    <div className="text-2xl font-bold">{operationalReport.summary.totalApplications}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Total Allotments</div>
                    <div className="text-2xl font-bold">{operationalReport.summary.totalAllotments}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Service Requests</div>
                    <div className="text-2xl font-bold">{operationalReport.summary.totalServiceRequests}</div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm font-medium mb-2">Scheme Details (Top 10)</div>
                  <div className="space-y-2">
                    {operationalReport.schemeDetails.slice(0, 10).map((scheme: any) => (
                      <div key={scheme.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div>
                          <span className="font-medium">{scheme.name}</span>
                          <span className="text-sm text-muted-foreground ml-2">({scheme.category})</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="text-sm">{scheme.applicationsCount} applications</span>
                          <span className="text-sm">{scheme.allotmentsCount} allotments</span>
                          <span className="text-xs px-2 py-1 bg-background rounded">{scheme.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "financial" && financialReport && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Financial Report
                  </CardTitle>
                  <CardDescription>
                    Generated at: {new Date(financialReport.generatedAt).toLocaleString()}
                  </CardDescription>
                </div>
                <Button onClick={() => handleExport("financial")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Total Demand</div>
                    <div className="text-2xl font-bold">
                      ₹{Number(financialReport.summary.totalDemandAmount).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Total Paid</div>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{Number(financialReport.summary.totalPaidAmount).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Net Receivables</div>
                    <div className="text-2xl font-bold text-orange-600">
                      ₹{Number(financialReport.summary.netReceivables).toLocaleString('en-IN')}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Collection Rate</div>
                    <div className="text-2xl font-bold">
                      {financialReport.summary.collectionRate.toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm font-medium mb-2">Aging Analysis</div>
                  <div className="space-y-2">
                    {financialReport.agingAnalysis.map((bucket: any) => (
                      <div key={bucket.bucket} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{bucket.bucket} days</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-medium">
                            ₹{Number(bucket.amount).toLocaleString('en-IN')}
                          </span>
                          <span className="text-xs text-muted-foreground">({bucket.count} notes)</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {reportType === "spatial" && spatialReport && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Spatial Report (Heatmap Data)
                </CardTitle>
                <CardDescription>
                  Generated at: {new Date(spatialReport.generatedAt).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Total Properties</div>
                    <div className="text-2xl font-bold">{spatialReport.summary.totalProperties}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">With Dues</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {spatialReport.summary.propertiesWithDues}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">With Grievances</div>
                    <div className="text-2xl font-bold text-red-600">
                      {spatialReport.summary.propertiesWithGrievances}
                    </div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">Pending Services</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {spatialReport.summary.propertiesWithPendingServices}
                    </div>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <div className="text-sm font-medium mb-2">Heatmap Data (Top 20 by Severity)</div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {spatialReport.heatmapData
                      .sort((a: any, b: any) => {
                        const severityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
                        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
                      })
                      .slice(0, 20)
                      .map((item: any) => (
                        <div key={item.propertyId} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div>
                            <span className="font-medium">{item.parcelNo}</span>
                            {item.lat && item.lng && (
                              <span className="text-xs text-muted-foreground ml-2">
                                ({item.lat.toFixed(4)}, {item.lng.toFixed(4)})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm">₹{Number(item.dues).toLocaleString('en-IN')}</span>
                            <span className="text-sm">{item.grievances} grievances</span>
                            <span className="text-sm">{item.pendingServices} services</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              item.severity === "high" ? "bg-red-100 text-red-800" :
                              item.severity === "medium" ? "bg-yellow-100 text-yellow-800" :
                              "bg-green-100 text-green-800"
                            }`}>
                              {item.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

