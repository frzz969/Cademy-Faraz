import * as React from "react";

export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-brand-navy/40 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border-[3px] border-black bg-white p-5 shadow-brutal-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="font-display text-xl font-bold text-brand-navy">
              {title}
            </h2>
          ) : (
            <span />
          )}
          <button
            type="button"
            aria-label="Tutup dialog"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-black bg-white text-brand-navy shadow-brutal-sm transition-transform hover:bg-brand-panel active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
