import * as React from "react";

function cx(...parts: Array<string | false | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, ...rest }: InputProps, ref: React.ForwardedRef<HTMLInputElement>) {
    return (
      <input
        ref={ref}
        className={cx(
          "h-12 w-full rounded-xl border-[3px] border-black bg-brand-panel px-4 font-body text-sm font-medium text-brand-navy",
          "placeholder:text-brand-muted shadow-brutal outline-none transition-colors",
          "focus:bg-white focus:ring-2 focus:ring-brand-blue",
          className
        )}
        {...rest}
      />
    );
  }
);

export function SearchField({
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cx("relative flex-1", className)}>
      <span
        aria-hidden
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-navy"
      >
        ⌕
      </span>
      <Input className="pl-11" {...rest} />
    </div>
  );
}
