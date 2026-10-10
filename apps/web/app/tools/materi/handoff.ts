// Smart Handoff Tahap 3 — helper murni (tanpa fetch internal, tanpa dependensi).
// Handoff = tombol membuka pencarian EKSTERNAL (Google Scholar / YouTube) di
// tab baru dengan query "topik + matkul". Cademy tidak mengambil, menilai,
// atau menyimpan hasil pencarian tersebut — user menilai sendiri relevansi,
// status peer-review, dan keterbukaan aksesnya.

export function handoffQuery(topicTitle: string, matkul: string): string {
  const t = topicTitle.trim().replace(/\s+/g, " ");
  const m = matkul.trim().replace(/\s+/g, " ");
  if (t && m) return `${t} ${m}`;
  return t || m || "";
}

/** URL pencarian Google Scholar untuk query (dibuka di tab baru). */
export function scholarUrl(query: string): string {
  return `https://scholar.google.com/scholar?q=${encodeURIComponent(query)}`;
}

/** URL pencarian YouTube untuk query (dibuka di tab baru). */
export function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

/**
 * Buka URL eksternal di tab baru secara aman.
 * @returns false bila popup diblokir / window tak tersedia.
 */
export function openExternal(url: string): boolean {
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    return w !== null;
  } catch {
    return false;
  }
}
