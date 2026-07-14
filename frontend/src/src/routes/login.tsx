import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Heart, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate({ to: "/memories" });
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      {/* Ambient glow orbs — decorative only, hidden on very small screens to save GPU */}
      <div className="glow-orb pointer-events-none fixed -top-40 left-1/2 z-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full opacity-30 hidden sm:block" />
      <div className="glow-orb pointer-events-none fixed bottom-0 right-0 z-0 h-[280px] w-[280px] rounded-full opacity-15 hidden sm:block" />

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-10 text-center">
          <motion.div
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="inline-flex"
          >
            <Heart className="h-10 w-10 fill-primary text-primary drop-shadow-glow" />
          </motion.div>
          <h1 className="mt-4 font-display text-4xl font-bold">
            Welcome back to <span className="text-gradient">MINI</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Your private universe awaits.</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl glass-strong p-8 shadow-cinema">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 text-center">
                {error}
              </div>
            )}
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@nishy.love"
                  required
                  className="w-full rounded-xl glass py-3.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your secret passphrase…"
                  required
                  className="w-full rounded-xl glass py-3.5 pl-11 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded accent-pink-500" />
                <span className="text-muted-foreground">Remember me</span>
              </label>
              <button type="button" className="text-primary hover:underline">Forgot password?</button>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:shadow-[0_0_60px_oklch(0.72_0.32_350/0.6)] disabled:opacity-60"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground"
                />
              ) : (
                <>
                  Enter Our Universe
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            New to MINI?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Create your universe
            </Link>
          </div>
        </div>

        {/* Trust badge */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground/60">
          🔒 End-to-end encrypted · Private & secure · Just for two
        </p>
      </motion.div>
    </div>
  );
}
