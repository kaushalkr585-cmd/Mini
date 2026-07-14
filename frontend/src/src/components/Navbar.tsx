import { Link, useLocation } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Heart, Moon, Sun, Search, LogIn, Menu, X, Shield, LogOut } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { useAuthStore } from "@/store/authStore";
import { useCoupleStore } from "@/store/coupleStore";
import { deviceCapability } from "@/hooks/useDeviceCapability";

const links = [
  { to: "/", label: "Home" },
  { to: "/memories", label: "Memories" },
  { to: "/timeline", label: "Timeline" },
  { to: "/letters", label: "Letters" },
  { to: "/music", label: "Music" },
  { to: "/chat", label: "Chat" },
];

export function Navbar() {
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { onlineUsers, partner } = useCoupleStore();
  const location = useLocation();
  
  const isPartnerOnline = onlineUsers.some(u => u.userId !== user?.id);

  // Hide navbar on the chat page — it has its own header
  if (location.pathname === "/chat") return null;

  return (
    <>
      {/* CSS animation (anim-enter-up) runs immediately on paint — no JS parse delay */}
      <header className="fixed inset-x-0 top-0 z-50 anim-enter-up">
        <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-2xl glass-strong px-6 py-3 shadow-cinema">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            {/* CSS hover — no Framer Motion instance, no JS per route change */}
            <div className="relative transition-transform duration-200 ease-out group-hover:-rotate-12 group-hover:scale-110">
              <Heart className="h-6 w-6 fill-primary text-primary" />
              <div className="absolute inset-0 blur-md opacity-60 group-hover:opacity-100 transition-opacity">
                <Heart className="h-6 w-6 fill-primary text-primary" />
              </div>
            </div>
            <span className="font-display text-2xl font-bold tracking-tight text-gradient">MINI</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="relative px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    {isActive && (
                      deviceCapability.enableLayoutAnimation ? (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute inset-0 -z-10 rounded-lg bg-primary/15"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      ) : (
                        <span className="absolute inset-0 -z-10 rounded-lg bg-primary/15" />
                      )
                    )}
                  </>
                )}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5">
            {/* Search */}
            <Link
              to="/search"
              className="btn-glass-icon"
              aria-label="Search"
            >
              <Search className="h-4 w-4" />
            </Link>

            {/* Theme toggle */}
            <button
              onClick={toggle}
              className="btn-glass-icon"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User Area — desktop-only auth controls wrapped in a plain div
                so `hidden md:flex` is not overridden by .btn-glass inline-flex */}
            {user ? (
              <>
                {/* Admin icon — visible on all sizes (small, unobtrusive) */}
                <Link
                  to="/admin"
                  className="btn-glass-icon"
                  title="Admin Dashboard"
                >
                  <Shield className="h-4 w-4" />
                </Link>
                {/* Avatar pair — desktop only */}
                <div className="hidden md:flex items-center -space-x-2 ml-1 relative group cursor-pointer" onClick={logout}>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent ring-2 ring-background shadow-glow relative overflow-hidden">
                    {user.avatar ? (
                      <img src={user.avatar} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                        {user.name?.charAt(0)}
                      </div>
                    )}
                    <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-background" />
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-primary ring-2 ring-background relative overflow-hidden">
                    {partner?.avatar ? (
                      <img src={partner.avatar} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs font-bold text-white">
                        {partner?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    {isPartnerOnline && (
                       <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-background" />
                    )}
                  </div>
                  <div className="absolute top-10 right-0 bg-background/90 p-2 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity text-xs whitespace-nowrap z-50 shadow-cinema">
                    Click to logout
                  </div>
                </div>
              </>
            ) : (
              /* Plain div wrapper — no conflicting CSS so `hidden md:flex` works
                 correctly regardless of inner element classes (.btn-glass, etc.) */
              <div className="hidden md:flex items-center gap-1.5">
                <Link to="/login" className="btn-glass">
                  <LogIn className="h-3.5 w-3.5" />
                  Sign In
                </Link>
                <Link to="/signup" className="flex items-center -space-x-2 ml-1 hover:scale-105 transition-transform">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent ring-2 ring-background shadow-glow" />
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-primary ring-2 ring-background" />
                </Link>
              </div>
            )}


            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="btn-glass-icon md:!hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.3 }}
              className="mx-4 mt-2 rounded-2xl glass-strong p-4 shadow-cinema"
            >
              <nav className="flex flex-col gap-1">
                {links.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-foreground transition"
                    activeProps={{ className: "bg-primary/15 text-foreground" }}
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="my-1 h-px bg-border" />
                {user ? (
                  <>
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-foreground transition flex items-center gap-2"
                    >
                      <Shield className="h-4 w-4" /> Admin Dashboard
                    </Link>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="rounded-xl px-4 py-3 text-sm font-medium text-rose hover:bg-rose/10 transition flex items-center gap-2"
                    >
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-foreground transition flex items-center gap-2"
                    >
                      <LogIn className="h-4 w-4" /> Sign In
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground text-center shadow-glow"
                    >
                      Create Universe ♥
                    </Link>
                  </>
                )}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
