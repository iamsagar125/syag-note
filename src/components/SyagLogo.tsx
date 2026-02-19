import { cn } from "@/lib/utils";

interface SyagLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

/**
 * Syag logo — stacked note pages with an AI sparkle.
 * Pure SVG, works in light and dark mode via currentColor.
 */
export function SyagLogo({ size = 24, className, showText = false }: SyagLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Background rounded square */}
        <rect width="32" height="32" rx="7" fill="hsl(var(--accent))" />

        {/* Back page */}
        <rect x="7" y="9" width="16" height="18" rx="2" fill="hsl(var(--accent-foreground))" opacity="0.45" />

        {/* Front page */}
        <rect x="9" y="6" width="16" height="18" rx="2" fill="hsl(var(--accent-foreground))" opacity="0.9" />

        {/* Text lines on front page */}
        <rect x="12" y="10" width="10" height="1.5" rx="0.75" fill="hsl(var(--accent))" opacity="0.5" />
        <rect x="12" y="13.5" width="7" height="1.5" rx="0.75" fill="hsl(var(--accent))" opacity="0.35" />
        <rect x="12" y="17" width="9" height="1.5" rx="0.75" fill="hsl(var(--accent))" opacity="0.35" />

        {/* AI sparkle — 4-pointed star */}
        <path
          d="M26 5 L26.8 7.2 L29 8 L26.8 8.8 L26 11 L25.2 8.8 L23 8 L25.2 7.2 Z"
          fill="hsl(var(--accent-foreground))"
        />
      </svg>

      {showText && (
        <span className="font-display text-lg text-foreground tracking-tight">syag</span>
      )}
    </span>
  );
}
