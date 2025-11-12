import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useUser, useLogout } from "@/lib/auth";
import { useQuery } from "@tanstack/react-query";
import { 
  Home, 
  PlusCircle, 
  DollarSign, 
  CheckSquare, 
  Briefcase, 
  FileText, 
  BarChart3, 
  Users, 
  Table, 
  PieChart,
  Bell,
  Settings,
  Menu,
  LogOut,
  Target,
  Shield,
  Clock
} from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // Initialize from localStorage, default to true on larger screens
    const saved = localStorage.getItem('sidebarOpen');
    if (saved !== null) {
      return JSON.parse(saved);
    }
    // Default to true on larger screens (>= 1024px)
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return true;
  });
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Save sidebar state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(isSidebarOpen));
  }, [isSidebarOpen]);

  // Handle window resize to auto-open sidebar on larger screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024 && !isSidebarOpen) {
        setIsSidebarOpen(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);
  const { data: user } = useUser();
  const logout = useLogout();




  const { data: notifications = [] } = useQuery({
    queryKey: ["/api/notifications"],
    queryFn: async () => {
      const response = await fetch("/api/notifications", { credentials: "include" });
      return response.json();
    },
  });

  const unreadNotifications = notifications.filter((n: any) => !n.isRead).length;

  // Define all available navigation items with role restrictions
  // Separated into LAMS (Land Acquisition) and PMS (Property Management) sections
  const lamsNavigationItems: Array<{ href: string; label: string; icon: any; roles: string[]; badge?: number }> = [
    { href: "/lams", label: "LAMS Dashboard", icon: Home, roles: ["all"] },
    { href: "/lams/sia", label: "SIA Management", icon: Target, roles: ["case_officer", "admin"] },
    { href: "/lams/notifications", label: "Notifications", icon: Shield, roles: ["case_officer", "legal_officer", "admin"] },
    { href: "/lams/compensation", label: "Compensation", icon: DollarSign, roles: ["case_officer", "finance_officer", "admin"] },
    { href: "/lams/possession", label: "Possession", icon: Clock, roles: ["case_officer", "admin"] },
  ];

  const pmsNavigationItems: Array<{ href: string; label: string; icon: any; roles: string[]; badge?: number }> = [
    { href: "/pms", label: "PMS Dashboard", icon: Home, roles: ["all"] },
    { href: "/pms/schemes", label: "Schemes", icon: Target, roles: ["case_officer", "admin"] },
    { href: "/pms/search", label: "Property Search", icon: Briefcase, roles: ["all"] },
    { href: "/pms/analytics", label: "Analytics", icon: BarChart3, roles: ["all"] },
    { href: "/pms/reports", label: "Reports", icon: FileText, roles: ["all"] },
  ];

  // Combine all navigation items based on user role
  const allNavigationItems = [
    ...lamsNavigationItems,
    ...pmsNavigationItems,
  ];

  // Filter navigation items based on user role
  const filteredLamsItems = lamsNavigationItems.filter(item => {
    if (item.roles.includes("all")) return true;
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  });

  const filteredPmsItems = pmsNavigationItems.filter(item => {
    if (item.roles.includes("all")) return true;
    if (!user?.role) return false;
    return item.roles.includes(user.role);
  });



  const adminItems = [
    { href: "/user-management", label: "User Management", icon: Users },
    { href: "/approval-chains", label: "Approval Chains", icon: Table },
    { href: "/reports", label: "Reports", icon: PieChart },
  ];

  const handleLogout = () => {
    logout.mutate();
  };

  // Handle ESC key and click outside to close sidebar (only on mobile)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only close on mobile screens (when sidebar is overlay)
      if (event.key === 'Escape' && isSidebarOpen && window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      // Only close on mobile screens (when sidebar is overlay)
      if (isSidebarOpen && window.innerWidth < 1024 && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen]);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo & Brand */}
      <div className="flex items-center justify-between p-6 border-b">
        <Link href={user?.role === 'citizen' ? '/citizen/dashboard' : location.startsWith('/lams') ? '/lams' : location.startsWith('/pms') ? '/pms' : '/public'} className="flex items-center space-x-3 hover:opacity-80 transition-opacity cursor-pointer">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center overflow-hidden">
            <img 
              src="/assets/puda-logo.png?v=1" 
              alt="PUDA Logo" 
              className="h-full w-full object-contain"
              onError={(e) => {
                // Fallback to icon if logo not found
                console.error('Failed to load PUDA logo:', e);
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
            <p className="text-sm text-muted-foreground">LAMS & PMS</p>
          </div>
        </Link>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
        {/* LAMS Module Section */}
        {filteredLamsItems.length > 0 && (
          <div className="space-y-2">
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Land Acquisition (LAMS)
              </p>
            </div>
            {filteredLamsItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || location.startsWith(item.href + "/");
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                    {item.badge && item.badge > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        )}

        {/* PMS Module Section */}
        {filteredPmsItems.length > 0 && (
          <div className="space-y-2">
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Property Management (PMS)
              </p>
            </div>
            {filteredPmsItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || location.startsWith(item.href + "/");
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                    {item.badge && item.badge > 0 && (
                      <Badge variant="secondary" className="ml-auto">
                        {item.badge}
                      </Badge>
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        )}

        <div className="my-4 border-t" />
        
        {/* Admin Section */}
        {user?.role === 'admin' && (
          <>
            <div className="px-4 py-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Administration
              </p>
            </div>
            
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    className="w-full justify-start"
                  >
                    <Icon className="mr-3 h-4 w-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src="" />
            <AvatarFallback>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Settings</DropdownMenuItem>
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background animate-fade-in">
      {/* Sidebar - Fixed on large screens, overlay on mobile */}
      <div 
        ref={sidebarRef}
        className={`
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:static
          left-0 top-0 h-full w-72 bg-card shadow-xl z-40
          transition-transform duration-300 ease-in-out
          lg:shadow-none
        `}
      >
        <SidebarContent />
      </div>

      {/* Sidebar overlay backdrop - only on mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content - Dynamically adjusts when sidebar is open */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top Bar */}
        <header className="bg-card shadow-sm border-b border-border animate-slide-up">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Menu button - visible on mobile, hidden on large screens when sidebar is visible */}
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className="hover:bg-accent lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                
                <div className="flex items-center space-x-4">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {location.startsWith('/lams') ? 'LAMS' :
                     location.startsWith('/pms') ? 'Property Management' :
                     location.startsWith('/public') ? 'Public Portal' :
                     location.startsWith('/citizen') ? 'Citizen Portal' :
                     'PUDA Portal'}
                  </h2>
                  
                  {/* Module Tabs - Show when user has access to either module */}
                  {(filteredLamsItems.length > 0 || filteredPmsItems.length > 0) && (
                    <div className="hidden md:flex items-center space-x-2 ml-4">
                      {filteredLamsItems.length > 0 && (
                        <Link href="/lams">
                          <Button
                            variant={location.startsWith('/lams') ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                          >
                            <Shield className="mr-2 h-3 w-3" />
                            LAMS
                          </Button>
                        </Link>
                      )}
                      {filteredPmsItems.length > 0 && (
                        <Link href="/pms">
                          <Button
                            variant={location.startsWith('/pms') ? "default" : "outline"}
                            size="sm"
                            className="text-xs"
                          >
                            <Briefcase className="mr-2 h-3 w-3" />
                            PMS
                          </Button>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Notifications */}
                <NotificationDropdown />
                
                {/* Theme Toggle */}
                <ThemeToggle />
                
                {/* User Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative flex flex-col items-center p-2 h-auto rounded-lg hover:bg-accent">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src="" alt={user?.firstName || "User"} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-center mt-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {user?.firstName} {user?.lastName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {user?.role}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex items-center justify-start gap-2 p-2">
                      <div className="flex flex-col space-y-1 leading-none">
                        <p className="font-medium">{user?.firstName} {user?.lastName}</p>
                        <p className="w-[200px] truncate text-sm text-muted-foreground">
                          {user?.email}
                        </p>
                        <Badge variant="outline" className="w-fit text-xs capitalize">
                          {user?.role}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleLogout}
                      className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
