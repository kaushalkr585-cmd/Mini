import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Heart, Moon, Sun, Search } from "lucide-react";
import { useTheme } from "./ThemeProvider";

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
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50"
    >
      <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-2xl glass-strong px-6 py-3 shadow-cinema">
        <Link to="/" className="flex items-center gap-2 group">
          <motion.div whileHover={{ rotate: -10, scale: 1.1 }} className="relative">
            <Heart className="h-6 w-6 fill-primary text-primary" />
            <div className="absolute inset-0 blur-md opacity-60 group-hover:opacity-100 transition-opacity">
              <Heart className="h-6 w-6 fill-primary text-primary" />
            </div>
          </motion.div>
          <span className="font-display text-2xl font-bold tracking-tight text-gradient">NISHY</span>
        </Link>

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
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 -z-10 rounded-lg bg-primary/15"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </>
              )}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button className="rounded-full p-2 text-muted-foreground hover:text-foreground transition">
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={toggle}
            className="rounded-full p-2 text-muted-foreground hover:text-foreground transition"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <div className="flex items-center -space-x-2">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent ring-2 ring-background" />
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-primary ring-2 ring-background" />
          </div>
        </div>
      </div>
    </motion.header>
  );
}
