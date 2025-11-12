import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, MapPin, FileText, AlertTriangle, TrendingUp, DollarSign, Clock, ArrowRight, Loader2 } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";

export default function PMSDashboard() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["/api/property-management/analytics/dashboard-summary"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/property-management/analytics/dashboard-summary");
      return response.json();
    },
  });

  const stats = [
    {
      title: "Total Schemes",
      value: summary?.schemes?.total || 0,
      description: `${summary?.schemes?.active || 0} active, ${summary?.schemes?.closed || 0} closed`,
      icon: Building2,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Applications",
      value: summary?.applications?.total || 0,
      description: `${summary?.applications?.pending || 0} pending, ${summary?.applications?.selected || 0} selected`,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Allotments",
      value: summary?.allotments?.total || 0,
      description: `${summary?.allotments?.issued || 0} issued, ${summary?.allotments?.accepted || 0} accepted`,
      icon: MapPin,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Receivables",
      value: `₹${(Number(summary?.receivables?.total || 0)).toLocaleString('en-IN')}`,
      description: `₹${(Number(summary?.receivables?.pending || 0)).toLocaleString('en-IN')} pending, ₹${(Number(summary?.receivables?.overdue || 0)).toLocaleString('en-IN')} overdue`,
      icon: DollarSign,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Service Requests",
      value: summary?.serviceRequests?.total || 0,
      description: `${summary?.serviceRequests?.pending || 0} pending, ${summary?.serviceRequests?.overdue || 0} overdue`,
      icon: Clock,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "SLA Breaches",
      value: summary?.slaBreaches || 0,
      description: "Items requiring immediate attention",
      icon: AlertTriangle,
      color: summary?.slaBreaches > 0 ? "text-destructive" : "text-muted-foreground",
      bgColor: summary?.slaBreaches > 0 ? "bg-destructive/10" : "bg-muted",
    },
  ];

  if (summaryLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Property Management Dashboard</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Overview of schemes, applications, allotments, and receivables
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/pms/analytics">
            <Button variant="outline" aria-label="View analytics dashboard" className="min-h-[44px]">
              <TrendingUp className="h-4 w-4 mr-2" aria-hidden="true" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Analytics</span>
            </Button>
          </Link>
          <Link href="/pms/reports">
            <Button variant="outline" aria-label="View reports" className="min-h-[44px]">
              <FileText className="h-4 w-4 mr-2" aria-hidden="true" />
              Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <section aria-label="Dashboard statistics" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className={`${stat.bgColor}`} role="article" aria-labelledby={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle id={`stat-${stat.title.toLowerCase().replace(/\s+/g, '-')}`} className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-5 w-5 ${stat.color}`} aria-hidden="true" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" aria-label={`${stat.title}: ${stat.value}`}>{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </section>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/pms/schemes">
              <Button variant="outline" className="w-full justify-start" aria-label="Navigate to schemes management">
                <Building2 className="h-4 w-4 mr-2" aria-hidden="true" />
                Manage Schemes
                <ArrowRight className="h-4 w-4 ml-auto" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/pms/search">
              <Button variant="outline" className="w-full justify-start" aria-label="Navigate to properties management">
                <MapPin className="h-4 w-4 mr-2" aria-hidden="true" />
                Search Properties
                <ArrowRight className="h-4 w-4 ml-auto" aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/pms/service-requests">
              <Button variant="outline" className="w-full justify-start" aria-label="Navigate to service requests">
                <Clock className="h-4 w-4 mr-2" aria-hidden="true" />
                Service Requests
                <ArrowRight className="h-4 w-4 ml-auto" aria-hidden="true" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SLA Status</CardTitle>
            <CardDescription>Service level agreement compliance</CardDescription>
          </CardHeader>
          <CardContent>
            {summary?.slaBreaches > 0 ? (
              <div className="space-y-2">
                <Badge variant="destructive" className="w-full justify-center py-2">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {summary.slaBreaches} Breaches Detected
                </Badge>
                <p className="text-sm text-muted-foreground">
                  Immediate attention required for overdue items
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="default" className="w-full justify-center py-2 bg-green-600">
                  All SLAs Met
                </Badge>
                <p className="text-sm text-muted-foreground">
                  All services are within SLA targets
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Financial Overview</CardTitle>
            <CardDescription>Receivables and collections</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Receivables:</span>
              <span className="font-semibold">₹{(Number(summary?.receivables?.total || 0)).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pending:</span>
              <span className="text-orange-600">₹{(Number(summary?.receivables?.pending || 0)).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Overdue:</span>
              <span className="text-red-600">₹{(Number(summary?.receivables?.overdue || 0)).toLocaleString('en-IN')}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

