import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  User,
  Settings,
  LogOut,
  ChevronDown,
  ShieldCheck,
  BellRing,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import alietBanner from "@/assets/aliet_logo.png";

export function AdminHeader() {
  const { user, signOut, userRole } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const initials =
    (user?.full_name || user?.user_metadata?.full_name)
      ?.split(" ")
      .map((n: string) => n[0])
      .join("")
      .toUpperCase() || "AD";

  const getRoleBadge = () => {
    const roleColors: Record<string, string> = {
      admin: "bg-red-100 text-red-700 border-red-200",
      manager: "bg-blue-100 text-blue-700 border-blue-200",
      instructor: "bg-purple-100 text-purple-700 border-purple-200",
      student: "bg-green-100 text-green-700 border-green-200",
    };
    return roleColors[userRole || "student"] || roleColors.student;
  };

  return (
    <header className="sticky top-0 z-50 flex h-14 sm:h-16 md:h-20 items-center justify-between bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-3 sm:px-4 md:px-6 lg:px-10 transition-all duration-300">
      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        <SidebarTrigger className="h-10 w-10 text-slate-600 hover:text-slate-700 hover:bg-slate-100/80 rounded-xl transition-all" />
        <img src={alietBanner} alt="Andhra Loyola Institute of Engineering & Technology" className="h-10 sm:h-12 md:h-14 w-auto object-contain" />
      </div>

      <div className="flex items-center gap-2 sm:gap-3 lg:gap-5">
        {/* Notifications */}
        <div className="relative group">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/admin/notifications")}
            className="h-11 w-11 rounded-full bg-slate-100/50 border border-slate-200/60 hover:bg-slate-100 hover:border-slate-300 transition-all active:scale-95 group overflow-hidden text-slate-600 hover:text-slate-700"
          >
            <Bell className={`h-5 w-5 transition-transform group-hover:rotate-12 ${unreadCount > 0 ? "text-primary animate-pulse" : ""}`} />
          </Button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary border-2 border-white text-[10px] font-bold text-white flex items-center justify-center shadow-sm animate-in zoom-in duration-300 ring-2 ring-primary/20">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        <div className="hidden md:block h-8 w-px bg-slate-200 mx-1" />

        {/* User Menu - Enhanced Profile Highlight */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto flex items-center gap-3 px-3 py-2 hover:bg-slate-100/80 rounded-2xl group transition-all border-2 border-transparent hover:border-primary/20"
            >
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-primary/30 shadow-md transition-all duration-300 group-hover:border-primary/60 group-hover:shadow-lg group-hover:scale-105">
                  <AvatarImage src={user?.avatar_url || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-white font-bold text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-sm font-bold text-slate-800 group-hover:text-primary transition-colors">
                  {user?.full_name || user?.user_metadata?.full_name || "Administrator"}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRoleBadge()}`}>
                    {(userRole || "admin").toUpperCase()}
                  </span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-600 transition-transform group-hover:translate-y-0.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-64 bg-white/95 backdrop-blur-xl border border-slate-200/60 p-2 mt-2 shadow-lg rounded-2xl"
          >
            <div className="px-3 py-3 mb-2 rounded-xl bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/10">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-primary/30 shadow-sm">
                  <AvatarImage src={user?.avatar_url || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary text-white font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {user?.full_name || user?.user_metadata?.full_name || "Administrator"}
                  </p>
                  <p className="text-xs text-slate-500 truncate max-w-[150px]">
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
            <DropdownMenuSeparator className="bg-slate-100 mx-2" />
            <DropdownMenuItem 
              onClick={() => navigate("/admin/profile")}
              className="h-11 rounded-xl px-3 text-sm font-medium gap-3 hover:bg-slate-100 transition-colors cursor-pointer text-slate-700 focus:bg-slate-100 focus:text-slate-900 mx-1"
            >
              <User className="h-4 w-4 text-slate-500" />
              My Profile
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate("/admin/settings")}
              className="h-11 rounded-xl px-3 text-sm font-medium gap-3 hover:bg-slate-100 transition-colors cursor-pointer text-slate-700 focus:bg-slate-100 focus:text-slate-900 mx-1"
            >
              <Settings className="h-4 w-4 text-slate-500" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => navigate("/admin/security")}
              className="h-11 rounded-xl px-3 text-sm font-medium gap-3 hover:bg-slate-100 transition-colors cursor-pointer text-slate-700 focus:bg-slate-100 focus:text-slate-900 mx-1"
            >
              <ShieldCheck className="h-4 w-4 text-slate-500" />
              Security
            </DropdownMenuItem>
            
            <DropdownMenuSeparator className="bg-slate-100 mx-2" />
            
            <div className="px-3 py-2">
              <div className="flex items-center justify-between px-1 py-1">
                <div className="flex items-center gap-2">
                  <BellRing className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-semibold text-slate-700">Notifications</span>
                </div>
                <Switch 
                  className="scale-75 data-[state=checked]:bg-primary" 
                  defaultChecked 
                  onCheckedChange={(checked) => {
                    toast.success(checked ? "Desktop notifications enabled" : "Desktop notifications disabled");
                  }}
                />
              </div>
            </div>
            <DropdownMenuSeparator className="bg-slate-100 mx-2" />
            <DropdownMenuItem
              onClick={signOut}
              className="h-11 rounded-xl px-3 text-sm font-medium gap-3 text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer focus:bg-rose-50 focus:text-rose-700 mx-1"
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