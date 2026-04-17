import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { MajrLogo } from "@/components/MajrLogo";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { loading, user, role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
    } else if (role === "admin") {
      navigate({ to: "/admin" });
    } else {
      navigate({ to: "/dashboard" });
    }
  }, [loading, user, role, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 fade-in">
        <MajrLogo size={56} withWordmark={false} />
        <div className="h-1 w-32 overflow-hidden rounded-full bg-secondary">
          <div className="h-full w-1/2 animate-pulse rounded-full bg-gradient-to-r from-primary to-lilac" />
        </div>
      </div>
    </div>
  );
}
