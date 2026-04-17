import { Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { MajrLogo } from "@/components/MajrLogo";
import { Button } from "@/components/ui/button";
import { LogOut, MessageCircle, Menu } from "lucide-react";
import { DEFAULT_WHATSAPP } from "@/lib/sources";

interface Props {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  rightSlot?: React.ReactNode;
}

export function PortalHeader({ onMenuClick, showMenuButton, rightSlot }: Props) {
  const { profile, signOut, role } = useAuth();
  const navigate = useNavigate();
  const whats = profile?.whatsapp_url || DEFAULT_WHATSAPP;

  const handleLogout = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  const displayName = profile?.full_name?.trim() || (role === "admin" ? "Admin" : "Cliente");

  return (
    <header className="glass sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border px-4 sm:px-6">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <Link to="/" className="hidden sm:block">
          <MajrLogo size={36} />
        </Link>
        <Link to="/" className="sm:hidden">
          <MajrLogo size={32} withWordmark={false} />
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {rightSlot}
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium text-foreground">{displayName}</div>
          {profile?.company && (
            <div className="text-[11px] text-muted-foreground">{profile.company}</div>
          )}
        </div>

        <a
          href={whats}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden items-center gap-2 rounded-lg border border-border bg-mint/10 px-3 py-2 text-xs font-medium text-mint transition-colors hover:bg-mint/15 sm:inline-flex"
        >
          <MessageCircle className="h-4 w-4" />
          Falar com Suporte
        </a>
        <a
          href={whats}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Falar com suporte"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-mint/10 text-mint transition-colors hover:bg-mint/15 sm:hidden"
        >
          <MessageCircle className="h-4 w-4" />
        </a>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-foreground"
        >
          <LogOut className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Sair</span>
        </Button>
      </div>
    </header>
  );
}
