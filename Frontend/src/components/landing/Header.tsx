import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Settings, LogOut, LayoutDashboard, Menu, X, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import alietBanner from "@/assets/aliet_logo.png";

// Pages with light backgrounds that need dark navbar text
const lightBgPages = [
  "/auth",
  "/student-dashboard",
  "/instructor",
  "/manager",
  "/admin",
  "/about",
  "/courses",
  "/faq",
  "/contact",
  "/privacy",
  "/terms",
  "/docs",
  "/careers",
  "/trainers",
  "/press",
  "/features",
];

const navLinks = [
  { name: "Home", href: "/" },
  { name: "Courses", href: "/#courses" },
  { name: "About", href: "/#about" },
  { name: "FAQ", href: "/faq" },
];

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, userRole, signOut, checkSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDashboardClick = async (e: React.MouseEvent) => {
    // If pending, refresh session to check for approval
    if (user?.approval_status === "pending") {
      await checkSession();
    }
  };

  // Check if current page has a light background
  const hasLightBg = lightBgPages.some((page) =>
    location.pathname.startsWith(page),
  );

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const getUserInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  const handleNavClick = (href: string) => {
    if (href.startsWith("http")) {
      window.location.href = href;
      return;
    }
    if (href.startsWith("/#")) {
      const sectionId = href.replace("/#", "");
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      } else {
        navigate("/");
        setTimeout(() => {
          const el = document.getElementById(sectionId);
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    } else {
      navigate(href);
    }
  };

  const dashboardMap: Record<string, string> = {
    student: "/student-dashboard",
    instructor: "/instructor",
    admin: "/admin",
    manager: "/manager",
  };

  const portalPath = user ? (dashboardMap[userRole || "student"] || "/") : null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-in-out ${isScrolled || hasLightBg ? "bg-background backdrop-blur-md shadow-lg border-b border-border" : "bg-transparent border-b border-transparent"}`}
    >
      <div className="container-width px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        <div className="flex items-center justify-between">
          {/* Logo area intentionally empty - branding shown in hero */}
          <Link to="/" className="flex items-center gap-2 flex-shrink-0 w-8" aria-label="Home" />
 
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <button
                key={link.name}
                onClick={() => handleNavClick(link.href)}
                className={`px-3 xl:px-4 py-2 rounded-lg text-sm xl:text-base font-bold transition-all duration-200 ${
                  isScrolled || hasLightBg
                    ? "text-slate-800 hover:text-[#0075CF]"
                    : "text-[#FDFEFE] hover:text-[#FD5A1A]"
                }`}
              >
                <span className="flex items-center gap-1">
                  {link.name}
                  {link.href.startsWith("http") && (
                    <ExternalLink className="h-3 w-3 opacity-70" />
                  )}
                </span>
              </button>
            ))}
            {portalPath && (
              <button
                onClick={() => handleNavClick(portalPath)}
                className={`px-3 xl:px-4 py-2 rounded-lg text-sm xl:text-base font-black transition-all duration-200 highlight-dashboard-btn ${
                  isScrolled || hasLightBg
                    ? "text-[#0075CF] hover:bg-[#0075CF]/10"
                    : "text-[#FD5A1A] hover:bg-[#FD5A1A]/10"
                }`}
              >
                Dashboard
              </button>
            )}
          </nav>

          {/* Right Side - Auth & Mobile Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop Auth Buttons */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-[#0075CF]/20">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10 border-2 border-[#0075CF]/20">
                      <AvatarImage
                        src={user.user_metadata?.avatar_url}
                        alt="User avatar"
                      />
                      <AvatarFallback className="bg-[#0075CF] text-[#FDFEFE] font-semibold text-sm sm:text-base">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 bg-background border border-border shadow-lg z-[100]"
                >
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-sm font-bold text-foreground">
                      {user.user_metadata?.full_name || "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuItem
                    asChild
                    className="cursor-pointer focus:bg-[#0075CF]/10 focus:text-[#0075CF]"
                  >
                    <Link
                      to={
                        userRole === "admin"
                          ? "/admin"
                          : userRole === "instructor"
                            ? "/instructor"
                            : userRole === "manager"
                              ? "/manager"
                              : "/student-dashboard"
                      }
                      onClick={handleDashboardClick}
                      className="flex items-center gap-2"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      <span className="font-bold">Dashboard</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span className="font-bold">Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden sm:flex items-center gap-2 md:gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-6 rounded-full border-2 font-bold transition-all duration-300 hover:scale-105 ${
                    isScrolled || hasLightBg
                      ? "text-slate-800 border-slate-800/30 hover:border-[#0075CF] hover:text-[#0075CF] hover:bg-transparent"
                      : "text-[#FDFEFE] border-[#FDFEFE]/50 hover:border-[#FDFEFE] hover:text-[#FDFEFE] hover:bg-transparent"
                  }`}
                  asChild
                >
                  <Link to="/login">Login</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`text-xs sm:text-sm md:text-base px-3 sm:px-4 md:px-6 rounded-full border-2 font-black transition-all duration-300 hover:scale-105 ${
                    isScrolled || hasLightBg
                      ? "bg-[#0075CF] text-[#FDFEFE] border-[#0075CF] hover:bg-[#0066B3] hover:text-[#FDFEFE]"
                      : "bg-[#FD5A1A] text-[#FDFEFE] border-[#FD5A1A] hover:bg-[#E34D14] hover:text-[#FDFEFE]"
                  }`}
                  asChild
                >
                  <Link to="/signup">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={`lg:hidden hover:bg-transparent ${isScrolled || hasLightBg ? "text-foreground" : "text-[#FDFEFE]"}`}
                >
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[300px] sm:w-[350px] bg-background p-0"
              >
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <SheetHeader className="px-4 py-4 border-b border-border">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">Navigation</span>
                    </div>
                  </SheetHeader>

                  {/* Mobile Navigation */}
                  <nav className="flex-1 p-4">
                    <ul className="space-y-1">
                      {portalPath && (
                        <div>
                          <SheetClose asChild>
                            <button
                              onClick={() => handleNavClick(portalPath)}
                              className="w-full text-left p-4 rounded-xl text-lg font-black text-[#FD5A1A] bg-orange-50 hover:bg-orange-100 transition-all active:scale-[0.98] mb-2 border border-orange-100"
                            >
                               Dashboard
                            </button>
                          </SheetClose>
                        </div>
                      )}
                      {navLinks.map((link) => (
                        <div key={link.name}>
                          <SheetClose asChild>
                            <button
                              onClick={() => handleNavClick(link.href)}
                              className="w-full text-left p-4 rounded-xl text-lg font-bold text-foreground hover:bg-muted hover:text-primary transition-all active:scale-[0.98]"
                            >
                              <span className="flex items-center justify-between">
                                {link.name}
                                {link.href.startsWith("http") && (
                                  <ExternalLink className="h-4 w-4 opacity-50" />
                                )}
                              </span>
                            </button>
                          </SheetClose>
                        </div>
                      ))}
                    </ul>
                  </nav>

                  {/* Mobile Auth Buttons */}
                  {!user && (
                    <div className="p-4 border-t border-border space-y-3">
                      <SheetClose asChild>
                        <Button
                          variant="outline"
                          className="w-full font-bold border-border hover:text-[#0075CF] hover:border-[#0075CF]"
                          asChild
                        >
                          <Link to="/login">Login</Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button
                          className="w-full bg-[#FD5A1A] hover:bg-[#E34D14] text-[#FDFEFE] font-black"
                          asChild
                        >
                          <Link to="/signup">Sign Up</Link>
                        </Button>
                      </SheetClose>
                    </div>
                  )}

                  {/* Mobile User Info */}
                  {user && (
                    <div className="p-4 border-t border-border space-y-3">
                      <div className="flex items-center gap-3 pb-3 border-b border-border">
                        <Avatar className="h-10 w-10 border-2 border-primary/20">
                          <AvatarImage
                            src={user.user_metadata?.avatar_url}
                            alt="User avatar"
                          />
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                            {getUserInitials()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {user.user_metadata?.full_name || "User"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          className="w-full justify-start"
                          asChild
                        >
                          <Link
                            to={
                              userRole === "admin"
                                ? "/admin"
                                : userRole === "instructor"
                                  ? "/instructor"
                                  : userRole === "manager"
                                    ? "/manager"
                                    : "/student-dashboard"
                            }
                            onClick={handleDashboardClick}
                          >
                            <LayoutDashboard className="h-4 w-4 mr-2" />
                            Dashboard
                          </Link>
                        </Button>
                      </SheetClose>

                      <Button
                        variant="ghost"
                        className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleSignOut}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Log out
                      </Button>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;