import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Bell, Heart, Menu, X, User, Moon, Sun } from "lucide-react";

export default function Navbar({ isDark, setIsDark }) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", path: "/" },
    { name: "Memories", path: "/memories" },
    { name: "Watch Together", path: "/watch" },
    { name: "Timeline", path: "/timeline" },
    { name: "Music", path: "/music" },
    { name: "Chat", path: "/chat" },
    { name: "Letters", path: "/letters" },
  ];

  const navbarStyle = isScrolled
    ? { background: "rgba(10, 10, 15, 0.85)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }
    : { background: "transparent" };

  return (
    <>
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        style={{ ...navbarStyle, transition: "all 0.4s ease" }}
        className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-4"
      >
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <motion.div whileHover={{ scale: 1.2, rotate: 10 }} transition={{ type: "spring", stiffness: 400 }}>
              <Heart className="w-7 h-7" style={{ color: "#e94978" }} fill="#e94978" />
            </motion.div>
            <span className="text-2xl font-bold tracking-tighter text-gradient">NISHY</span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                style={{ position: "relative" }}
                className={`text-sm font-medium transition-all duration-300 hover:opacity-100 ${
                  location.pathname === link.path ? "opacity-100" : "opacity-60"
                }`}
              >
                <span style={{ color: location.pathname === link.path ? "#e94978" : "inherit" }}>
                  {link.name}
                </span>
                {location.pathname === link.path && (
                  <motion.div
                    layoutId="navbar-indicator"
                    style={{ background: "#e94978", height: "2px", borderRadius: "1px" }}
                    className="absolute -bottom-1.5 left-0 right-0"
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme toggle */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-full opacity-70 hover:opacity-100 transition-opacity"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            <motion.button whileHover={{ scale: 1.1 }} className="p-2 opacity-70 hover:opacity-100 transition-opacity">
              <Search className="w-5 h-5" />
            </motion.button>

            <motion.button whileHover={{ scale: 1.1 }} className="p-2 opacity-70 hover:opacity-100 transition-opacity relative">
              <Bell className="w-5 h-5" />
              <span style={{ background: "#e94978" }} className="absolute top-1 right-1 w-2 h-2 rounded-full animate-ping" />
              <span style={{ background: "#e94978" }} className="absolute top-1 right-1 w-2 h-2 rounded-full" />
            </motion.button>

            {/* Avatar */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-9 h-9 rounded-full cursor-pointer flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #e94978, #9333ea)", padding: "2px" }}
            >
              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ background: "#0f0f14" }}>
                <User className="w-4 h-4" />
              </div>
            </motion.div>
          </div>

          {/* Mobile toggle */}
          <button
            className="lg:hidden p-2 opacity-80 hover:opacity-100"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: "100%" }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: "100%" }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 z-40 lg:hidden pt-20 px-8 flex flex-col gap-6"
            style={{ background: "rgba(10, 10, 15, 0.97)", backdropFilter: "blur(30px)" }}
          >
            {navLinks.map((link, i) => (
              <motion.div
                key={link.name}
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.07 }}
              >
                <Link
                  to={link.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-3xl font-bold block"
                  style={{ color: location.pathname === link.path ? "#e94978" : "rgba(255,255,255,0.7)" }}
                >
                  {link.name}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
