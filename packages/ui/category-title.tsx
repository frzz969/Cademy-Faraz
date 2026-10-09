import * as React from "react";

function cx(...parts: Array<string | false | undefined | null>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Frame dasar neo-brutalist untuk judul/badge kategori (design tokens Cademy):
 * border 3px hitam + shadow 4px + radius penuh.
 */
const frameBase =
  "inline-flex select-none items-center gap-1.5 border-[3px] border-black shadow-[4px_4px_0px_#000000] font-label uppercase tracking-wider";

export interface CategoryPillProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** chip kategori: aktif = primary blue, non-aktif = putih */
  active?: boolean;
  /** tampilkan sebagai tautan (Next Link) daripada tombol */
  href?: string;
}

export function CategoryPill({
  active = false,
  className,
  children,
  href,
  type,
  ...rest
}: CategoryPillProps) {
  const cls = cx(
    frameBase,
    "whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold",
    active
      ? "bg-brand-blue text-white"
      : "bg-white text-brand-navy transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
    className
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  return (
    <button type={type ?? "button"} className={cls} {...rest}>
      {children}
    </button>
  );
}

export interface CategoryTitleProps {
  /** nama kategori, mis. "Penulisan & Skripsi" */
  label: string;
  /** ikon Material Symbols opsional, mis. "menu_book" */
  icon?: string;
  /** jumlah tools dalam kategori (opsional) */
  count?: number;
  /** "panel" = kertas sky, "solid" = biru primary */
  tone?: "panel" | "solid";
  className?: string;
  /** heading element, default h2 */
  as?: "h1" | "h2" | "h3";
}

/**
 * Judul kategori dengan frame menyatu dengan tema neo-brutalist.
 * Dipakai bersama oleh halaman tools & homepage agar styling konsisten.
 */
export function CategoryTitle({
  label,
  icon,
  count,
  tone = "panel",
  className,
  as: Tag = "h2",
}: CategoryTitleProps) {
  const Heading = Tag;
  return (
    <Heading className={className}>
      <span
        className={cx(
          frameBase,
          "rounded-xl px-3 py-1.5 text-sm font-extrabold",
          tone === "solid" ? "bg-brand-blue text-white" : "bg-brand-panel text-brand-navy"
        )}
      >
        {icon ? (
          <span aria-hidden className="material-symbols-outlined text-[20px]">
            {icon}
          </span>
        ) : null}
        <span>{label}</span>
        {typeof count === "number" ? (
          <span
            className={cx(
              "ml-1 rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-extrabold",
              tone === "solid" ? "bg-brand-yellow text-black" : "bg-white text-brand-navy"
            )}
          >
            {count}
          </span>
        ) : null}
      </span>
    </Heading>
  );
}
