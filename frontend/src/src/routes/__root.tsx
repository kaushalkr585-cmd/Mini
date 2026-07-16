import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRoute,
} from "@tanstack/react-router";

import { ThemeProvider } from "@/components/ThemeProvider";
import { AmbientBackground } from "@/components/AmbientBackground";

import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import { useCoupleStore } from "@/store/coupleStore";
import { Toaster } from "react-hot-toast";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

export const Route = createRootRoute({
  notFoundComponent: NotFoundComponent,
  component: RootComponent,
});

import { MusicPlayer } from "@/components/MusicPlayer";

import { Navbar } from "@/components/Navbar";

function RootComponent() {
  const loadFromStorage = useAuthStore((s) => s.loadFromStorage);
  const initSocketListeners = useCoupleStore((s) => s.initSocketListeners);
  const fetchPartner = useCoupleStore((s) => s.fetchPartner);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    loadFromStorage();
    if (useAuthStore.getState().token) {
      fetchPartner();
    }
    initSocketListeners();
  }, [loadFromStorage, initSocketListeners, fetchPartner]);

  // Re-fetch partner when user logs in
  useEffect(() => {
    if (user) {
      fetchPartner();
    }
  }, [user, fetchPartner]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AmbientBackground />

        <Navbar />
        <Outlet />
        <MusicPlayer />
        <Toaster position="bottom-center" toastOptions={{ className: 'glass-strong text-foreground border border-primary/20', duration: 4000 }} />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
