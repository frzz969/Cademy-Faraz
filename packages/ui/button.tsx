import * as React from "react";

type Variant = "primary" | "secondary" | "accent" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary: "bg-brand-blue text-white hover:bg-brand-navy",
  secondary: "bg-white text-brand-navy hover:bg-brand-panel",
  accent: "bg-brand-yellow text-black hover:brightness-95",
  danger: "bg-brand-brick text-white hover:brightness-95",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-xs",
  lg: "h-12 px-6 text-sm",
  icon: "h-11 w-11",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  pill?: boolean;
}

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    { variant = "primary", size = "md", pill = true, className, type = "button", ...rest }: ButtonProps,
    ref: React.ForwardedRef<HTMLButtonElement>
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          "inline-flex select-none items-center justify-center gap-2 border-[3px] border-black font-label font-bold uppercase tracking-wider",
          "shadow-brutal transition-transform active:translate-x-1 active:translate-y-1 active:shadow-none",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50",
          pill ? "rounded-full" : "rounded-xl",
          variants[variant],
          sizes[size],
          className
        )}
        {...rest}
      />
    );
  }
);
