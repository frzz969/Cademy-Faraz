"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Badge, type BadgeTone } from "@cademy/ui";
import { tools, type Tool } from "@cademy/tool-registry";

function toolHref(t: Tool): { href: string; external: boolean } {
  if (t.status === "external" && t.url) return { href: t.url, external: true };
  return { href: `/tools/${t.slug}`, external: false };
}

/**
 * Cangkang halaman tool — pola dari kalkulator/jadwal/ai-detector:
 * breadcrumb + kartu sentral (corner stamp) + slot konten + sidebar opsional.
 * Prev/next antar tool + tools terkait terisi otomatis dari urutan registry
 * berdasarkan slug rute (/tools/[slug]), kecuali dimatikan via `hideNav`.
 */
export function ToolShell({
  eyebrow = "Hub / Alat",
  title,
  description,
  icon = "school",
  badge,
  badgeTone = "info",
  external = false,
  children,
  sidebar,
  slug,
  hideNav = false,
  relatedSlot,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: string;
  badgeTone?: BadgeTone;
  external?: boolean;
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  slug?: string;
  hideNav?: boolean;
  relatedSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const resolved =
    slug ??
    (pathname.startsWith("/tools/")
      ? pathname.split("/").filter(Boolean)[1]
      : undefined);
  const idx = resolved ? tools.findIndex((t) => t.slug === resolved) : -1;
  // Prev/next hanya antar tool internal — lewati entri status:"external"
  // agar tidak pernah lontar ke tab luar. Kartu related di bawah tetap
  // boleh menampilkan entri external (dengan badge).
  const internal = React.useMemo(
    () => tools.filter((t) => t.status !== "external"),
    []
  );
  const current = idx >= 0 ? tools[idx] : undefined;
  const pos =
    current && current.status !== "external"
      ? internal.findIndex((t) => t.slug === current.slug)
      : -1;
  const prev = pos > 0 ? internal[pos - 1] : undefined;
  const next =
    pos >= 0 && pos < internal.length - 1 ? internal[pos + 1] : undefined;
  const related = current
    ? tools
        .filter(
          (t) =>
            t.slug !== current.slug &&
            t.category.some((c) => current.category.includes(c))
        )
        .slice(0, 3)
    : [];
  // Slug asing (idx === -1): tetap render children normal, sembunyikan blok prev/next.
  const isKnownSlug = idx >= 0;
  const showNav = !hideNav && isKnownSlug;

  return (
    <div className="pb-safe mx-auto w-full max-w-7xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">
      <div className="mb-4 flex items-center justify-between py-2">
        <a
          href="/tools"
          aria-label="Kembali ke direktori tools"
          className="brutal-press inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-3 py-1.5 font-label text-xs font-bold text-brand-navy shadow-[4px_4px_0px_#000000] transition-transform"
        >
          <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">arrow_back</span> Kembali
        </a>
        <p className="font-label text-[11px] uppercase tracking-wider text-brand-muted">
          {eyebrow} / <span className="font-bold text-brand-blue">{title}</span>
        </p>
      </div>

      <section className="relative rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal sm:p-6">
        {badge ? (
          <div className="absolute -top-3 right-4">
            <Badge tone={external ? "external" : badgeTone}>{badge}</Badge>
          </div>
        ) : null}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-[3px] border-black bg-brand-panel text-[#0B2E4B] shadow-brutal">
            {typeof icon === "string" ? (
              <span className="material-symbols-outlined shrink-0 text-[24px] leading-none">{icon}</span>
            ) : (
              icon
            )}
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 max-w-2xl font-body text-sm text-brand-muted sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div
          className={
            sidebar
              ? "mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12"
              : "mt-6"
          }
        >
          <div className={sidebar ? "lg:col-span-8" : ""}>{children}</div>
          {sidebar ? (
            <aside className="space-y-4 lg:col-span-4">{sidebar}</aside>
          ) : null}
        </div>
      </section>

      {showNav ? (
        <nav aria-label="Navigasi antar tools" className="mt-6 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              {prev ? (
                (() => {
                  const target = toolHref(prev);
                  return (
                    <a
                      href={target.href}
                      {...(target.external
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                      className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-4 py-2 font-label text-xs font-bold text-brand-navy shadow-brutal transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      aria-label={`Tool sebelumnya: ${prev.name}`}
                    >
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">arrow_back</span>
                      <span className="max-w-[140px] truncate sm:max-w-[200px]">
                        {prev.name}
                      </span>
                    </a>
                  );
                })()
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  aria-label="Awal direktori — tidak ada tool sebelumnya"
                  className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-4 py-2 font-label text-xs font-bold text-brand-muted opacity-40 shadow-brutal"
                >
                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">arrow_back</span>
                  Awal direktori
                </button>
              )}
              {next ? (
                (() => {
                  const target = toolHref(next);
                  return (
                    <a
                      href={target.href}
                      {...(target.external
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                      className="inline-flex items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-4 py-2 font-label text-xs font-bold text-brand-navy shadow-brutal transition-all hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      aria-label={`Tool berikutnya: ${next.name}`}
                    >
                      <span className="max-w-[140px] truncate sm:max-w-[200px]">
                        {next.name}
                      </span>
                      <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">arrow_forward</span>
                    </a>
                  );
                })()
              ) : (
                <button
                  type="button"
                  disabled
                  aria-disabled="true"
                  aria-label="Akhir direktori — tidak ada tool berikutnya"
                  className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-full border-[3px] border-black bg-white px-4 py-2 font-label text-xs font-bold text-brand-muted opacity-40 shadow-brutal"
                >
                  Akhir direktori
                  <span aria-hidden className="material-symbols-outlined shrink-0 text-[18px] leading-none">arrow_forward</span>
                </button>
              )}
            </div>
            <span className="hidden font-label text-[11px] font-bold text-brand-muted sm:inline">
              {pos >= 0 ? pos + 1 : 0} / {internal.length}
            </span>
          </div>

          {relatedSlot ?? (related.length > 0 ? (
            <section
              aria-label="Tools terkait"
              className="rounded-2xl border-[3px] border-black bg-brand-panel p-4 shadow-brutal"
            >
              <h2 className="flex items-center gap-1.5 font-display text-base font-bold text-brand-navy">
                <span aria-hidden className="material-symbols-outlined shrink-0 text-[20px] leading-none">widgets</span>
                Tools terkait
              </h2>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                {related.map((t) => {
                  const target = toolHref(t);
                  return (
                    <a
                      key={t.slug}
                      href={target.href}
                      {...(target.external
                        ? { target: "_blank", rel: "noreferrer" }
                        : {})}
                      className="flex items-center gap-2.5 rounded-xl border-[3px] border-black bg-white p-3 shadow-[3px_3px_0px_#000000] transition-all hover:bg-brand-paper active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                    >
                      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 border-black bg-brand-panel text-brand-navy">
                        <span className="material-symbols-outlined shrink-0 text-[20px] leading-none">{t.icon}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-bold text-brand-navy">
                          {t.name}
                        </span>
                        {t.status === "external" ? (
                          <span className="mt-0.5 inline-block rounded-full border-2 border-black bg-brand-yellow px-1.5 py-px font-label text-[10px] font-extrabold uppercase tracking-wider text-black">
                            External • tab baru
                          </span>
                        ) : null}
                        <span className="block truncate font-body text-xs text-brand-muted">
                          {t.badge ?? t.description}
                        </span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          ) : null)}
        </nav>
      ) : null}
    </div>
  );
}
