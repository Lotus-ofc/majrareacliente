import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  Icon: LucideIcon;
}

export function MetricCard({ label, value, Icon }: MetricCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card/40 p-5 backdrop-blur-sm transition-all hover:border-primary/40 hover:bg-card/60">
      {/* subtle gradient glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover:opacity-80" />

      <div className="relative flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <Icon className="h-4 w-4 text-lilac" />
        </div>
      </div>

      <p className="relative mt-4 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
        {value}
      </p>
    </div>
  );
}
