import { SOURCES, type ReportSource } from "@/lib/sources";
import { cn } from "@/lib/utils";
import { MajrLogo } from "@/components/MajrLogo";
import { X } from "lucide-react";

interface Props {
  active: ReportSource;
  onChange: (s: ReportSource) => void;
  open: boolean;
  onClose: () => void;
}

export function PortalSidebar({ active, onChange, open, onClose }: Props) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:sticky lg:top-0 lg:z-10 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <MajrLogo size={32} />
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-2 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Fontes de tráfego
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-6">
          {SOURCES.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.key;
            return (
              <button
                key={s.key}
                onClick={() => {
                  onChange(s.key);
                  onClose();
                }}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-primary/40 shadow-[0_0_24px_-6px_oklch(0.42_0.22_305/0.6)]"
                    : "text-sidebar-foreground/75 hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                    isActive
                      ? "border-primary/50 bg-primary/15 text-lilac"
                      : "border-border bg-card/60 text-muted-foreground group-hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {s.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-xl border border-border bg-card/60 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Status</p>
            <p className="mt-1 flex items-center gap-2 text-xs text-foreground">
              <span className="inline-block h-2 w-2 rounded-full bg-mint shadow-[0_0_12px_oklch(0.96_0.06_175/0.8)]" />
              Relatórios sincronizados
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
