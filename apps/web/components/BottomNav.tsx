"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "./nav-items";

const STORAGE_KEY = "cademy:bottomnav-open";

export function BottomNav() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = React.useState(true);
  const [siap, setSiap] = React.useState(false);

  // Muat preferensi collapse dari localStorage (default: tampil).
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) setIsOpen(raw !== "0");
    } catch {
      /* abaikan — tetap tampil */
    }
    setSiap(true);
  }, []);

  // Simpan setiap perubahan (tanpa freeze: tulis sinkron ringan saja).
  React.useEffect(() => {
    if (!siap) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, isOpen ? "1" : "0");
    } catch {
      /* abaikan */
    }
  }, [isOpen, siap]);

  if (!isOpen) {
    // Keadaan collapsed: FAB 48px, tidak makan ruang layout.
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Buka navigasi bawah"
        aria-expanded={false}
        title="Buka navigasi"
        className="fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full border-[3px] border-black bg-brand-yellow text-brand-navy shadow-brutal transition-transform duration-300 motion-safe:transition-transform active:translate-y-1 active:shadow-none md:hidden"
      >
        <span aria-hidden className="material-symbols-outlined shrink-0 text-[24px] leading-none">
          menu
        </span>
      </button>
    );
  }

  return (
    <nav
      aria-label="Navigasi bawah"
      aria-expanded={true}
      className="pb-safe fixed bottom-0 left-0 right-0 z-50 border-t-[3px] border-black bg-[#EAF5FC]/90 shadow-[0_-2px_0px_#000000] backdrop-blur-xl transition-transform duration-300 motion-safe:transition-transform md:hidden"
    >
      <div className="relative flex h-16 items-center justify-around px-1 pr-14">
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Sembunyikan navigasi bawah"
          aria-expanded={true}
          title="Sembunyikan navigasi"
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border-2 border-black bg-brand-panel text-brand-navy transition-transform active:translate-y-0.5"
        >
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">
            expand_more
          </span>
        </button>
        {NAV_ITEMS.map((item) => {
          const active = isNavActive(pathname, item);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[48px] min-w-[56px] flex-col items-center justify-center gap-0.5 transition-colors ${
                active
                  ? "font-bold text-brand-blue"
                  : "text-brand-muted hover:text-brand-navy"
              }`}
            >
              <span aria-hidden className="material-symbols-outlined shrink-0 text-[24px] leading-none">
                {item.icon}
              </span>
              <span className="font-label text-xs leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
