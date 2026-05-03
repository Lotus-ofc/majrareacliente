import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { MajrLogo } from "@/components/MajrLogo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog";
import { PushToggle } from "@/components/PushToggle";
import { ChevronDown, KeyRound, LogOut, Menu, MessageCircle, User } from "lucide-react";
import { DEFAULT_WHATSAPP } from "@/lib/sources";

interface Props {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  rightSlot?: React.ReactNode;
}

export function PortalHeader({ onMenuClick, showMenuButton, rightSlot }: Props) {
  const { profile, signOut, role, user } = useAuth();
  const navigate = useNavigate();
  const [pwOpen, setPwOpen] = useState(false);
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 px-2 text-foreground hover:bg-secondary/60"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/60">
                <User className="h-3.5 w-3.5 text-lilac" />
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-xs font-medium leading-tight text-foreground">
                  {displayName}
                </span>
                {profile?.company && (
                  <span className="block text-[10px] leading-tight text-muted-foreground">
                    {profile.company}
                  </span>
                )}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-xs">
              <div className="font-medium text-foreground">{displayName}</div>
              {profile?.company && (
                <div className="mt-0.5 text-[10px] font-normal text-muted-foreground">
                  {profile.company}
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setPwOpen(true)} className="cursor-pointer">
              <KeyRound className="mr-2 h-4 w-4" />
              Alterar senha
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ChangePasswordDialog open={pwOpen} onOpenChange={setPwOpen} />
    </header>
  );
}
