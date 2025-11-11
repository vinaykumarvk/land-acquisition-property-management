import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Shield, 
  Calendar,
  Loader2,
  BarChart3,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BellRing,
  Image
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  district?: string;
  taluka?: string;
  status?: string;
  type?: string;
}

interface ObjectionTurnaroundInsight {
  averageDays: number;
  medianDays: number;
  percentile90Days: number;
  openCount: number;
  resolvedCount: number;
}

interface PossessionEvidenceCase {
  possessionId: number;
  parcelNo: string;
  status: string;
  daysInStatus: number;
  photoCount: number;
}

interface NotificationOutreachInsight {
  totalNotifications: number;
  publishedNotifications: number;
  publishedPercentage: number;
  notificationsWithObjections: number;
  avgObjectionsPerPublished: number;
  pendingApprovalCount: number;
}

interface OperationalReport {
  summary: {
    totalParcels: number;
    parcelsByStatus: Record<string, number>;
    totalSias: number;
    siasByStatus: Record<string, number>;
    totalNotifications: number;
    notificationsByType: Record<string, number>;
    totalObjections: number;
    objectionsByStatus: Record<string, number>;
    totalPossessions: number;
    possessionsByStatus: Record<string, number>;
  };
  insights: {
    objectionTurnaround: ObjectionTurnaroundInsight;
    possessionEvidence: {
      averageDaysInEvidence: number;
      cases: PossessionEvidenceCase[];
    };
    notificationOutreach: NotificationOutreachInsight;
  };
  siaDetails: Array<{
    id: number;
    noticeNo: string;
    title: string;
    status: string;
    startDate: string;
    endDate: string;
    feedbackCount: number;
    hearingCount: number;
    reportGenerated: boolean;
    createdAt: string;
  }>;
  notificationDetails: Array<{
    id: number;
    refNo: string;
    type: string;
    title: string;
    status: string;
    publishDate: string | null;
    parcelCount: number;
    objectionCount: number;
    createdAt: string;
  }>;
  objectionDetails: Array<{
    id: number;
    notificationRefNo: string;
    parcelNo: string;
    status: string;
    createdAt: string;
    resolvedAt: string | null;
  }>;
  possessionDetails: Array<{
    id: number;
    parcelNo: string;
    scheduleDt: string;
    status: string;
    certificateGenerated: boolean;
    createdAt: string;
  }>;
  generatedAt: string;
}

const formatOneDecimal = (value?: number) => (value ?? 0).toFixed(1);

export default function Reports() {
  const { toast } = useToast();
  const [filters, setFilters] = useState<ReportFilters>({});
  const [activeTab, setActiveTab] = useState("operational");

  // Operational Report Query
  const { data: operationalReport, isLoading: loadingOperational } = useQuery<OperationalReport>({
    queryKey: ["/api/reports/operational", filters],
    enabled: activeTab === "operational",
  });

  // Financial Report Query
  const { data: financialReport, isLoading: loadingFinancial } = useQuery<any>({
    queryKey: ["/api/reports/financial", filters],
    enabled: activeTab === "financial",
  });

  // Compliance Report Query
  const { data: complianceReport, isLoading: loadingCompliance } = useQuery<any>({
    queryKey: ["/api/reports/compliance", filters],
    enabled: activeTab === "compliance",
  });

  const operationalInsights = operationalReport?.insights;

  const handleFilterChange = (key: keyof ReportFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const downloadReport = async (reportType: string) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const response = await fetch(`/api/reports/${reportType}?${queryParams.toString()}`);
      const data = await response.json();
      
      // Convert to JSON and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-report-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Report downloaded",
        description: `${reportType} report has been downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download report.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Generate and view operational, financial, and compliance reports for LAMS
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Apply filters to customize your reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate || ""}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate || ""}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                placeholder="Enter district"
                value={filters.district || ""}
                onChange={(e) => handleFilterChange("district", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                placeholder="Enter status"
                value={filters.status || ""}
                onChange={(e) => handleFilterChange("status", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                placeholder="Enter type"
                value={filters.type || ""}
                onChange={(e) => handleFilterChange("type", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="operational">
            <BarChart3 className="w-4 h-4 mr-2" />
            Operational
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="w-4 h-4 mr-2" />
            Financial
          </TabsTrigger>
          <TabsTrigger value="compliance">
            <Shield className="w-4 h-4 mr-2" />
            Compliance
          </TabsTrigger>
        </TabsList>

        {/* Operational Report */}
        <TabsContent value="operational" className="space-y-4">
          {loadingOperational ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : operationalReport ? (
            <>
              <div className="flex justify-end">
                <Button onClick={() => downloadReport("operational")}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Parcels</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{operationalReport.summary.totalParcels}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total SIAs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{operationalReport.summary.totalSias}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Notifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{operationalReport.summary.totalNotifications}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Objections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{operationalReport.summary.totalObjections}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Strategic Insights */}
              {operationalInsights && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        Objection Turnaround
                      </CardTitle>
                      <CardDescription>Average time from objection receipt to resolution</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-3xl font-bold">
                          {formatOneDecimal(operationalInsights.objectionTurnaround.averageDays)} days
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Median {formatOneDecimal(operationalInsights.objectionTurnaround.medianDays)}d •
                          90th percentile {formatOneDecimal(operationalInsights.objectionTurnaround.percentile90Days)}d
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase text-muted-foreground">Open</p>
                          <p className="text-xl font-semibold">{operationalInsights.objectionTurnaround.openCount}</p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase text-muted-foreground">Resolved</p>
                          <p className="text-xl font-semibold">{operationalInsights.objectionTurnaround.resolvedCount}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <BellRing className="w-4 h-4 text-muted-foreground" />
                        Notification Outreach
                      </CardTitle>
                      <CardDescription>Publication coverage and objection engagement</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <p className="text-3xl font-bold">
                          {formatOneDecimal(operationalInsights.notificationOutreach.publishedPercentage)}%
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {operationalInsights.notificationOutreach.publishedNotifications} of{" "}
                          {operationalInsights.notificationOutreach.totalNotifications} notices published
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase text-muted-foreground">Pending Approval</p>
                          <p className="text-xl font-semibold">
                            {operationalInsights.notificationOutreach.pendingApprovalCount}
                          </p>
                        </div>
                        <div className="rounded-lg border p-3">
                          <p className="text-xs uppercase text-muted-foreground">Avg objections / notice</p>
                          <p className="text-xl font-semibold">
                            {formatOneDecimal(operationalInsights.notificationOutreach.avgObjectionsPerPublished)}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {operationalInsights.notificationOutreach.notificationsWithObjections} published notices have
                        at least one objection filed.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Evidence Aging */}
              {operationalInsights?.possessionEvidence && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                      <Image className="w-4 h-4 text-muted-foreground" />
                      Possession Evidence Aging
                    </CardTitle>
                    <CardDescription>
                      Avg {formatOneDecimal(operationalInsights.possessionEvidence.averageDaysInEvidence)} days awaiting
                      completion
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {operationalInsights.possessionEvidence.cases.length ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-muted-foreground">
                              <th className="py-2 font-medium">Parcel</th>
                              <th className="py-2 font-medium">Status</th>
                              <th className="py-2 font-medium">Days in Status</th>
                              <th className="py-2 font-medium">Photos</th>
                            </tr>
                          </thead>
                          <tbody>
                            {operationalInsights.possessionEvidence.cases.map((caseItem) => (
                              <tr key={caseItem.possessionId} className="border-t">
                                <td className="py-2 font-medium">{caseItem.parcelNo}</td>
                                <td className="py-2 capitalize">{caseItem.status.replace(/_/g, " ")}</td>
                                <td className="py-2">{caseItem.daysInStatus}</td>
                                <td className="py-2">{caseItem.photoCount}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No possessions are awaiting evidence right now.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Status Breakdowns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Parcels by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(operationalReport.summary.parcelsByStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm">{status}</span>
                          <Badge>{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>SIAs by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(operationalReport.summary.siasByStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm">{status}</span>
                          <Badge>{count as number}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Lists */}
              <Card>
                <CardHeader>
                  <CardTitle>SIA Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {operationalReport.siaDetails.map((sia: any) => (
                      <div key={sia.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold">{sia.noticeNo}</h4>
                            <p className="text-sm text-muted-foreground">{sia.title}</p>
                          </div>
                          <Badge>{sia.status}</Badge>
                        </div>
                        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Feedback:</span> {sia.feedbackCount}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Hearings:</span> {sia.hearingCount}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Report:</span> {sia.reportGenerated ? "Yes" : "No"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Created:</span> {format(new Date(sia.createdAt), "MMM dd, yyyy")}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>

        {/* Financial Report */}
        <TabsContent value="financial" className="space-y-4">
          {loadingFinancial ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : financialReport ? (
            <>
              <div className="flex justify-end">
                <Button onClick={() => downloadReport("financial")}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Valuations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialReport.summary.totalValuations}</div>
                    <p className="text-xs text-muted-foreground">₹{parseFloat(financialReport.summary.totalValuationAmount).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Awards</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialReport.summary.totalAwards}</div>
                    <p className="text-xs text-muted-foreground">₹{parseFloat(financialReport.summary.totalAwardAmount).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialReport.summary.totalPayments}</div>
                    <p className="text-xs text-muted-foreground">₹{parseFloat(financialReport.summary.totalPaidAmount).toLocaleString()}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{financialReport.summary.paymentSuccessRate}%</div>
                    <p className="text-xs text-muted-foreground">{financialReport.summary.pendingPayments} pending</p>
                  </CardContent>
                </Card>
              </div>

              {/* Payment Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Payments by Mode</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(financialReport.paymentSummary.byMode).map(([mode, data]: [string, any]) => (
                        <div key={mode} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{mode}</span>
                          <div className="text-right">
                            <Badge>{data.count}</Badge>
                            <span className="ml-2 text-sm">₹{parseFloat(data.amount).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payments by Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(financialReport.paymentSummary.byStatus).map(([status, data]: [string, any]) => (
                        <div key={status} className="flex items-center justify-between">
                          <span className="text-sm capitalize">{status}</span>
                          <div className="text-right">
                            <Badge>{data.count}</Badge>
                            <span className="ml-2 text-sm">₹{parseFloat(data.amount).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </TabsContent>

        {/* Compliance Report */}
        <TabsContent value="compliance" className="space-y-4">
          {loadingCompliance ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : complianceReport ? (
            <>
              <div className="flex justify-end">
                <Button onClick={() => downloadReport("compliance")}>
                  <Download className="w-4 h-4 mr-2" />
                  Download Report
                </Button>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{complianceReport.summary.totalWorkflows}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{complianceReport.summary.complianceRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {complianceReport.summary.compliantWorkflows} compliant
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{complianceReport.summary.slaBreaches}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{complianceReport.summary.verificationRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {complianceReport.summary.documentsVerified} verified
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Workflow Compliance */}
              <Card>
                <CardHeader>
                  <CardTitle>Workflow Compliance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {complianceReport.workflowCompliance.slice(0, 10).map((workflow: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between border rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          {workflow.isCompliant ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-yellow-600" />
                          )}
                          <div>
                            <p className="font-medium">{workflow.workflowId}</p>
                            <p className="text-sm text-muted-foreground">{workflow.workflowType} - {workflow.status}</p>
                          </div>
                        </div>
                        <Badge variant={workflow.isCompliant ? "default" : "destructive"}>
                          {workflow.isCompliant ? "Compliant" : "Non-Compliant"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
