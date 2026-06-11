import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Bell,
  Search,
  Settings,
  LogOut,
  User,
  LayoutDashboard,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";
import alietBanner from "@/assets/aliet_banner.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardHeader() {
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.slice(0, 2).toUpperCase() || "ST";
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 sm:h-16 md:h-20 items-center justify-between gap-2 sm:gap-4 glass-panel px-3 sm:px-4 md:px-6 lg:px-10 border-b border-black/5 transition-all duration-300 bg-white/90 backdrop-blur-xl shadow-sm">
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6 min-w-0 flex-1">
        <SidebarTrigger className="-ml-2 h-10 w-10 text-primary hover:bg-primary/5 rounded-xl transition-all shrink-0" />
        <img src={alietBanner} alt="Andhra Loyola Institute of Engineering & Technology" className="h-8 sm:h-10 md:h-14 w-auto object-contain max-w-[120px] sm:max-w-[180px] md:max-w-none shrink-0" />

        <div className="relative hidden md:flex items-center group flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-primary transition-colors duration-300" />
          <Input
            placeholder="Search courses, mentors..."
            className="pl-12 w-full max-w-[300px] lg:max-w-[450px] h-11 bg-slate-50 border-slate-200 focus-visible:ring-primary/20 focus-visible:bg-white focus-visible:border-primary/50 text-sm transition-all rounded-2xl placeholder:text-slate-500 font-medium"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[9px] font-black text-slate-500 uppercase tracking-widest hidden lg:block shadow-sm">
            CTRL K
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 lg:gap-4 shrink-0">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 rounded-2xl bg-white border-slate-200 hover:border-primary/30 hover:bg-primary/5 text-slate-600 hover:text-primary relative group transition-all"
            onClick={() => navigate("/student-dashboard/notifications")}
          >
            <Bell className="h-5 w-5 group-hover:rotate-12 transition-transform" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-600 border-2 border-white text-[10px] font-bold text-white flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 pl-2 pr-4 h-12 rounded-2xl bg-white border border-slate-200 hover:border-primary/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/10 group shadow-sm">
                <Avatar className="h-8 w-8 rounded-xl group-hover:scale-105 transition-transform">
                  <AvatarImage src={user?.avatar_url || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-xs rounded-xl">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start space-y-0.5">
                  <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight leading-none">
                    {user?.full_name || user?.user_metadata?.full_name || "User"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider leading-none">
                    {userRole || "Student"}
                  </span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 p-2 bg-white border border-slate-200 shadow-2xl rounded-2xl mt-4 animate-in fade-in slide-in-from-top-2 duration-300"
            >
              <DropdownMenuLabel className="px-4 py-3">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  Student Account
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-100" />

              <div className="px-4 py-4 mb-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-none mb-1">
                      {user?.full_name || user?.user_metadata?.full_name || "Enrolled Student"}
                    </p>
                    <p className="text-[10px] font-medium text-slate-600 truncate max-w-[150px]">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className="justify-center flex-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] font-bold py-1">
                    Tech Scholar
                  </Badge>
                </div>
              </div>

              {(userRole === "instructor" || userRole === "admin") && (
                <DropdownMenuItem
                  onClick={() => navigate(`/${userRole}`)}
                  className="h-11 rounded-xl px-4 text-xs font-bold gap-3 text-primary bg-primary/5 hover:bg-primary/10 focus:bg-primary/10 transition-all mb-1 cursor-pointer"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Return to Staff Portal
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => navigate("/student-dashboard/profile")}
                className="h-11 rounded-xl px-4 text-xs font-bold gap-3 hover:bg-slate-50 transition-all cursor-pointer text-slate-700 hover:text-primary"
              >
                <User className="h-4 w-4" />
                My Profile
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate("/student-dashboard/settings")}
                className="h-11 rounded-xl px-4 text-xs font-bold gap-3 hover:bg-slate-50 transition-all cursor-pointer text-slate-700 hover:text-primary"
              >
                <Settings className="h-4 w-4" />
                Account Settings
              </DropdownMenuItem>

              <DropdownMenuSeparator className="bg-slate-100" />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="h-11 rounded-xl px-4 text-xs font-bold gap-3 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
      </div>
    </header>
  );
}