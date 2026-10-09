"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** kecocokan: exact = hanya path itu, prefix = ikut halaman anak */
  match: "exact" | "prefix";
};

/** Item mengikuti referensi flowchart_skripsi mobile (Beranda/Kuliah/Alat/Jadwal/Profil),
 *  rute disesuaikan dengan halaman yang benar-benar ada di Cademy. */
const ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", icon: "dashboard", match: "exact" },
  { href: "/tools/materi", label: "Kuliah", icon: "menu_book", match: "exact" },
  { href: "/tools", label: "Alat", icon: "build", match: "prefix" },
  { href: "/tools/jadwal", label: "Jadwal", icon: "calendar_today", match: "exact" },
  { href: "/about", label: "Profil", icon: "account_circle", match: "exact" },
];

function isActive(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi bawah"
      className="pb-safe fixed bottom-0 left-0 right-0 z-50 border-t-[3px] border-black bg-[#EAF5FC]/90 shadow-[0_-2px_0px_#000000] backdrop-blur-xl md:hidden"
    >
      <div className="flex h-16 items-center justify-around px-1">
        {ITEMS.map((item) => {
          // item spesifik (jadwal/materi) menang atas "Alat" agar tak dobel aktif
          const spesifik = ITEMS.some(
            (o) =>
              o.match === "exact" &&
              o.href !== item.href &&
              o.href.startsWith(`${item.href}/`) &&
              pathname === o.href
          );
          const active = !spesifik && isActive(pathname, item);
          return (
            <Link
              key={item.label}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-[48px] min-w-[56px] flex-col items-center justify-center transition-colors ${
                active
                  ? "font-bold text-brand-blue"
                  : "text-brand-muted hover:text-brand-navy"
              }`}
            >
              <span aria-hidden className="material-symbols-outlined text-[24px]">
                {item.icon}
              </span>
              <span className="mt-0.5 font-label text-xs">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
