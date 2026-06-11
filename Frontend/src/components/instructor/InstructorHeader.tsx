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
  Search,
  User,
  LogOut,
  ChevronDown,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import alietBanner from "@/assets/aliet_banner.png";

export function InstructorHeader() {
  const { user, signOut } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const fullName = user?.full_name || user?.user_metadata?.full_name || "Instructor";
  const initials = fullName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="sticky top-0 z-50 flex h-14 sm:h-16 lg:h-[68px] items-center justify-between border-b border-slate-200/70 bg-white/90 backdrop-blur-2xl px-3 sm:px-5 lg:px-8 transition-all duration-300 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
      
      {/* Left Section */}
      <div className="flex items-center gap-3 lg:gap-5 min-w-0">
        <SidebarTrigger className="h-9 w-9 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 shrink-0" />
        <img src={alietBanner} alt="Andhra Loyola Institute of Engineering & Technology" className="h-10 sm:h-12 md:h-14 w-auto object-contain" />

        {/* Search - Hidden on mobile */}
        <div className="relative hidden lg:block group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-slate-900 transition-colors duration-200" />
          <Input
            placeholder="Search courses, students..."
            className="pl-10 w-[280px] xl:w-[340px] h-9 bg-slate-50 border-slate-200 focus-visible:ring-slate-200 focus-visible:bg-white focus-visible:border-slate-400 text-sm font-medium transition-all rounded-xl placeholder:text-slate-400 text-slate-700"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden xl:inline-flex h-5 items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 text-[10px] font-medium text-slate-400">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Mobile search button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-xl text-slate-500 hover:text-primary hover:bg-primary/8 lg:hidden transition-all"
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Notification Bell */}
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/instructor/notifications")}
            className="h-9 w-9 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 text-slate-600 hover:text-slate-900 transition-all duration-200"
          >
            <Bell className="h-4 w-4" />
          </Button>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 border-2 border-white text-[9px] font-black text-white flex items-center justify-center shadow-sm"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </motion.span>
          )}
        </div>

        {/* Divider */}
        <div className="h-7 w-px bg-slate-200 hidden sm:block" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-auto flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-50 rounded-xl group transition-all duration-200"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 border-2 border-primary/20 group-hover:border-primary/50 transition-all duration-300 shadow-sm">
                  <AvatarImage src={user?.avatar_url || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white font-black text-xs uppercase">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-slate-800 group-hover:text-slate-900 transition-colors leading-tight max-w-[120px] truncate">
                  {fullName}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <ShieldCheck className="h-2.5 w-2.5 text-slate-900" />
                  <span className="text-[9px] font-bold text-slate-900 uppercase tracking-wider">
                    Verified Mentor
                  </span>
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-900 transition-all group-hover:translate-y-0.5 hidden md:block" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-60 bg-white/95 backdrop-blur-xl border border-slate-200/80 shadow-xl shadow-black/10 rounded-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {/* Profile Header */}
            <div className="px-3 py-3 mb-1">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-primary/20">
                  <AvatarImage src={user?.avatar_url || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-white font-black text-sm uppercase">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{fullName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Online</span>
                  </div>
                </div>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-slate-100 my-1" />

            <DropdownMenuItem
              onClick={() => navigate("/instructor/profile")}
              className="h-10 rounded-xl px-3 text-xs font-semibold gap-3 text-slate-700 hover:bg-slate-50 hover:text-primary cursor-pointer transition-all"
            >
              <User className="h-4 w-4" />
              My Profile
            </DropdownMenuItem>

            <DropdownMenuSeparator className="bg-slate-100 my-1" />

            <DropdownMenuItem
              onClick={signOut}
              className="h-10 rounded-xl px-3 text-xs font-semibold gap-3 text-red-600 hover:bg-red-50 cursor-pointer transition-all"
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
