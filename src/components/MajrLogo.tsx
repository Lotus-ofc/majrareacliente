import logo from "@/assets/logo-majr-lotus.png";

interface Props {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}

export function MajrLogo({ size = 44, withWordmark = true, className }: Props) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <img
        src={logo}
        alt="Leandro MAJR"
        width={size}
        height={size}
        loading="lazy"
        className="object-contain"
        style={{ width: size, height: size }}
      />
      {withWordmark && (
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            Leandro <span className="text-gradient-brand">MAJR</span>
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Client Portal
          </span>
        </div>
      )}
    </div>
  );
}
