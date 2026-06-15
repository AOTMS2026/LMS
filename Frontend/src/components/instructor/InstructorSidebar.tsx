import { useLocation, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Video,
  Calendar,
  FileQuestion,
  FileText,
  BarChart3,
  HelpCircle,
  LogOut,
  FolderOpen,
  Zap,
  Radio,
  Settings,
  ShieldCheck,
  RefreshCw,
  User,
  MessageSquare,
  Bell,
  CheckCircle2,
  ClipboardCheck,
} from "lucide-react";

import logo from "@/assets/lanyard/aotms_logo.jpg";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useInstructorStats } from "@/hooks/useInstructorData";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";


const mainNavItems = [
  { title: "Dashboard", url: "/instructor", icon: LayoutDashboard },
  { title: "My Profile", url: "/instructor/profile", icon: User },
  { title: "My Courses", url: "/instructor/my-courses", icon: BookOpen },
  { title: "Student Roster", url: "/instructor/students", icon: Users, isLive: true },
  { title: "Notifications", url: "/instructor/notifications", icon: Bell },
  { title: "Messages", url: "/instructor/chat", icon: MessageSquare },
  { title: "Live Broadcast", url: "/instructor/live-classes", icon: Radio },
];


const contentNavItems = [
  { title: "Video Library", url: "/instructor/videos", icon: Video },
  { title: "Course Resources", url: "/instructor/resources", icon: FolderOpen },
  
  { title: "Assessment Protocols", url: "/instructor/exams", icon: ShieldCheck },
  { title: "Question Bank", url: "/instructor/question-bank", icon: FolderOpen },
  { title: "Question Access", url: "/instructor/question-access", icon: ShieldCheck },
  { title: "Resume Scan Logs", url: "/instructor/resume-scans", icon: FileText },
  // ── Interview Examination Module ──
  { title: "Interview Management", url: "/instructor/interview-management", icon: ClipboardCheck },
];

const analyticNavItems = [
  { title: "Performance", url: "/instructor/performance", icon: BarChart3 },
];

export function InstructorSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: stats } = useInstructorStats();

  const isActive = (path: string) => {

    if (path === "/instructor") {
      return (
        location.pathname === "/instructor" ||
        location.pathname === "/instructor/"
      );
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200/40 !bg-white/80 backdrop-blur-2xl font-sans shadow-[20px_0_40px_rgba(0,0,0,0.01)]"
    >
      <SidebarHeader className="h-20 flex items-center justify-center px-4 group-data-[collapsible=icon]:px-0 border-b border-slate-200/60">
        <Link
          to="/"
          className="flex flex-col gap-1 items-center active:scale-95 transition-transform"
        >
          <img
            src={logo}
            alt="AOTMS Logo"
            className="h-12 w-auto object-contain group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8"
          />
          {!collapsed && (
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">
              Instructor Panel
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 group-data-[collapsible=icon]:px-2 py-6 space-y-8 scrollbar-hide">
        {/* Hub */}
        <SidebarGroup>
          <div className="px-4 mb-4">
             <SidebarGroupLabel className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 p-0 h-auto">Operations Hub</SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                        "h-12 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden",
                        isActive(item.url) 
                          ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                          : "hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-3.5 w-full">
                      <div className="relative z-10">
                        <item.icon
                          className={cn(
                              "h-[1.125rem] w-[1.125rem] transition-all duration-300",
                              isActive(item.url) ? "text-white scale-110" : "text-slate-400 group-hover:text-primary"
                          )}
                        />
                        {item.isLive && (
                          <span className={cn(
                              "absolute -top-1 -right-1 h-2 w-2 rounded-full border-2 animate-pulse",
                              isActive(item.url) ? "bg-white border-primary" : "bg-emerald-500 border-white"
                          )} />
                        )}
                      </div>
                      
                      {!collapsed && (
                        <motion.div 
                          className="flex items-center justify-between flex-1 z-10"
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                        >
                          <span className={cn(
                            "font-black text-xs uppercase tracking-wider",
                            isActive(item.url) ? "text-white" : "group-hover:text-primary"
                          )}>
                            {item.title}
                          </span>
                          {item.title === "Student Roster" && stats?.totalStudents !== undefined && (
                            <Badge variant="secondary" className={cn(
                                "h-5 px-1.5 text-[10px] font-black border-none transition-colors",
                                isActive(item.url) ? "bg-white/20 text-white" : "bg-slate-100 text-slate-900"
                            )}>
                              {stats.totalStudents}
                            </Badge>
                          )}
                        </motion.div>
                      )}

                      {/* Premium Active Background Glow */}
                      {isActive(item.url) && (
                        <motion.div 
                          layoutId="active-pill"
                          className="absolute inset-0 bg-blue-600 z-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content */}
        <SidebarGroup>
          <div className="px-4 mb-4 mt-2">
            <SidebarGroupLabel className="text-[10px] uppercase font-black tracking-[0.2em] text-slate-400 p-0 h-auto">Curriculum Management</SidebarGroupLabel>
          </div>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {contentNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                    className={cn(
                        "h-12 px-4 rounded-xl transition-all duration-300 group relative overflow-hidden",
                        isActive(item.url) 
                          ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                          : "hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                    )}
                  >
                    <Link to={item.url} className="flex items-center gap-3.5">
                      <div className="relative z-10">
                        <item.icon
                           className={cn(
                                "h-[1.125rem] w-[1.125rem] transition-all duration-300",
                                isActive(item.url) ? "text-white scale-110" : "text-slate-400 group-hover:text-blue-600"
                           )}
                        />
                      </div>
                      {!collapsed && (
                        <motion.span 
                            className={cn(
                                "font-black text-xs uppercase tracking-wider z-10",
                                isActive(item.url) ? "text-white" : "group-hover:text-blue-600"
                            )}
                            initial={{ opacity: 0, x: -5 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            {item.title}
                        </motion.span>
                      )}
                      
                      {isActive(item.url) && (
                        <motion.div 
                          layoutId="active-pill-dark"
                          className="absolute inset-0 bg-blue-600 z-0"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Analytics Section Removed */}
      </SidebarContent>

      <SidebarFooter className="p-4 group-data-[collapsible=icon]:p-2 border-t border-slate-50 bg-slate-50/50">
        <div className="space-y-2">
          <Button
            variant="ghost"
            className="w-full justify-start group-data-[collapsible=icon]:justify-center gap-3 h-11 px-4 group-data-[collapsible=icon]:px-0 rounded-lg text-primary hover:bg-primary/5 font-semibold transition-all"
            onClick={() => window.location.reload()}
          >
            <RefreshCw className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm">Refresh Data</span>}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start group-data-[collapsible=icon]:justify-center gap-3 h-11 px-4 group-data-[collapsible=icon]:px-0 rounded-lg text-rose-600 hover:bg-rose-50 hover:text-rose-700 font-semibold"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span className="text-sm">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}