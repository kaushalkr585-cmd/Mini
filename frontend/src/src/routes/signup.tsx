import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import { Heart, Eye, EyeOff, Mail, Lock, User, ArrowRight, Check } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const signup = useAuthStore((s) => s.signup);

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) { setStep((s) => s + 1); return; }
    setLoading(true);
    setError("");
    try {
      await signup(`${name} & ${partnerName}`, email, password);
      setLoading(false);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const strength = password.length > 12 ? 3 : password.length > 7 ? 2 : password.length > 3 ? 1 : 0;
  const strengthLabels = ["", "Weak", "Good", "Strong"];
  const strengthColors = ["", "bg-red-500", "bg-amber-400", "bg-emerald-400"];

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6 }}
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary shadow-glow"
          >
            <Heart className="h-9 w-9 fill-primary-foreground text-primary-foreground" />
          </motion.div>
          <h2 className="font-display text-4xl font-bold">Your universe is ready</h2>
          <p className="mt-3 text-muted-foreground">
            Welcome, {name} & {partnerName}. A lifetime of memories starts now.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-8 py-4 text-sm font-semibold text-primary-foreground shadow-glow hover:shadow-[0_0_60px_oklch(0.72_0.32_350/0.6)] transition-all"
          >
            Enter MINI <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="glow-orb pointer-events-none fixed -top-40 left-1/2 z-0 h-[360px] w-[360px] -translate-x-1/2 rounded-full opacity-30 hidden sm:block" />

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
            transition={{ duration: 2.5, repeat: Infinity }}
            className="inline-flex"
          >
            <Heart className="h-10 w-10 fill-primary text-primary drop-shadow-glow" />
          </motion.div>
          <h1 className="mt-4 font-display text-4xl font-bold">
            Create your <span className="text-gradient">Universe</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">A private space for two, forever.</p>
        </div>

        {/* Step indicators */}
        <div className="mb-8 flex items-center justify-center gap-3">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-3">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  step > s
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : step === s
                    ? "bg-primary/20 border border-primary text-primary"
                    : "glass text-muted-foreground"
                }`}
              >
                {step > s ? <Check className="h-3.5 w-3.5" /> : s}
              </div>
              {s < 3 && <div className={`h-px w-8 transition-all ${step > s ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-3xl glass-strong p-8 shadow-cinema">
          <form onSubmit={handleNext} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-500 text-center">
                {error}
              </div>
            )}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name…"
                      required
                      className="w-full rounded-xl glass py-3.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Partner's Name</label>
                  <div className="relative">
                    <Heart className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 fill-primary text-primary" />
                    <input
                      value={partnerName}
                      onChange={(e) => setPartnerName(e.target.value)}
                      placeholder="Their name…"
                      required
                      className="w-full rounded-xl glass py-3.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
                {name && partnerName && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center text-sm text-rose"
                  >
                    ✨ {name} & {partnerName} — sounds perfect.
                  </motion.p>
                )}
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
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
                      className="w-full rounded-xl glass py-3.5 pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type={show ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Strong passphrase…"
                      required
                      minLength={6}
                      className="w-full rounded-xl glass py-3.5 pl-11 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/60"
                    />
                    <button type="button" onClick={() => setShow((s) => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition">
                      {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-1 gap-1">
                        {[1, 2, 3].map((l) => (
                          <div key={l} className={`h-1 flex-1 rounded-full transition-all ${strength >= l ? strengthColors[strength] : "bg-muted"}`} />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{strengthLabels[strength]}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div className="rounded-2xl glass p-4 space-y-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Review</p>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Couple</span><span className="font-semibold">{name} & {partnerName}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span className="font-semibold">{email}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Password</span><span className="font-semibold">{"•".repeat(password.length)}</span></div>
                </div>
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input type="checkbox" required className="mt-0.5 rounded accent-pink-500" />
                  I agree that this universe is private, encrypted, and made only for us.
                </label>
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-glow transition-all hover:shadow-[0_0_60px_oklch(0.72_0.32_350/0.6)] disabled:opacity-60"
            >
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
              ) : step < 3 ? (
                <>Continue <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>
              ) : (
                <>Create Our Universe <Heart className="h-4 w-4 fill-current" /></>
              )}
            </motion.button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground/60">
          🔒 End-to-end encrypted · Private & secure · Just for two
        </p>
      </motion.div>
    </div>
  );
}
