"use client";

import { usePathname } from "next/navigation";
import { NAV_ITEMS, isNavActive } from "./nav-items";

/** Pill navigasi desktop — label, href, ikon, dan active state sama
 *  persis dengan BottomNav mobile (satu sumber: NAV_ITEMS). */
export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className="hidden items-center gap-2 md:flex">
      {NAV_ITEMS.map((item) => {
        const active = isNavActive(pathname, item);
        return (
          <a
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`brutal-press inline-flex items-center gap-1.5 rounded-full border-[3px] border-black px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0px_#000000] transition-colors hover:bg-brand-yellow ${
              active ? "bg-brand-yellow text-black" : "bg-white text-brand-navy"
            }`}
          >
            <span
              aria-hidden
              className="material-symbols-outlined shrink-0 text-[18px] leading-none"
            >
              {item.icon}
            </span>
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
