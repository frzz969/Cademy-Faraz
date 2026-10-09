import * as React from "react";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Kartu putih standar: border 3px + shadow 4px + radius 16px. */
export function Card({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal sm:p-6",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Sub-panel inset: bg panel, border 3px, tanpa drop shadow. */
export function Panel({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cx(
        "rounded-xl border-[3px] border-black bg-brand-panel p-4",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export type BadgeTone = "beta" | "external" | "info" | "neutral" | "muted";

const badgeTones: Record<BadgeTone, string> = {
  beta: "bg-brand-yellow text-black",
  external: "bg-brand-brick text-white",
  info: "bg-brand-blue text-white",
  neutral: "bg-white text-brand-navy",
  muted: "bg-brand-panel text-brand-navy",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1 rounded-full border-2 border-black px-2.5 py-1 font-label text-[11px] font-extrabold uppercase tracking-wider shadow-brutal-sm",
        badgeTones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
