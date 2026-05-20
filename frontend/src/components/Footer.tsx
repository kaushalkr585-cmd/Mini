import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative mt-20 border-t border-border/50 py-12">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <div className="flex items-center justify-center gap-2 font-display text-3xl font-bold">
          <Heart className="h-6 w-6 fill-primary text-primary" />
          <span className="text-gradient">NISHY</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          A private universe. Made with love, kept forever.
        </p>
        <p className="mt-6 text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} · For us, only us.
        </p>
      </div>
    </footer>
  );
}
