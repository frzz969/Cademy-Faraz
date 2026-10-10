/** Satu sumber kebenaran navigasi Cademy (desktop + mobile, jangan ubah lagi).
 *  Label baku: Beranda (/) | Kuliah (/tools/materi) | Tools (/tools) |
 *  Jadwal (/tools/jadwal) | Tentang (/about). */

export type NavItem = {
  href: string;
  label: string;
  /** Nama ikon Material Symbols Outlined — sama untuk desktop & mobile. */
  icon: string;
  /** kecocokan: exact = hanya path itu, prefix = ikut halaman anak */
  match: "exact" | "prefix";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Beranda", icon: "dashboard", match: "exact" },
  { href: "/tools/materi", label: "Kuliah", icon: "menu_book", match: "exact" },
  { href: "/tools", label: "Tools", icon: "build", match: "prefix" },
  { href: "/tools/jadwal", label: "Jadwal", icon: "calendar_today", match: "exact" },
  { href: "/about", label: "Tentang", icon: "account_circle", match: "exact" },
];

function cocokPath(pathname: string, item: NavItem): boolean {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Status aktif konsisten desktop-mobile: item spesifik (Kuliah/Jadwal)
 *  menang atas "Tools" agar tak dobel aktif di halaman anak. */
export function isNavActive(pathname: string, item: NavItem): boolean {
  const spesifik = NAV_ITEMS.some(
    (o) =>
      o.match === "exact" &&
      o.href !== item.href &&
      o.href.startsWith(`${item.href}/`) &&
      pathname === o.href
  );
  return !spesifik && cocokPath(pathname, item);
}
