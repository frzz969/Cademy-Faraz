<!-- DESIGN.md - Neo-Comic Cyan & Navy -->
# DESIGN.md: Neo-Comic Cyan & Navy (Akademika Design System)

**Version:** 2.4.0
**Design Philosophy:** Neo-Brutalist Comic Academic (Playful yet Authoritative, High-Contrast, Zero-Fluff)
**Tone & Mood:** Energik, Percaya Diri, Ramah Mahasiswa, Terstruktur, Bebas Distraksi

---

## 1. Color Palette & Token Architecture

Sistem warna dirancang flat murni tanpa gradien semu atau efek glassmorphism, mengandalkan kontras tinggi antara latar cerah dan aksen biru-navy yang tegas.

### Brand & Functional Colors
| Token Name | Hex Code | Deskripsi & Peruntukan |
|---|---|---|
| `primary` | `#0E4A6E` | Deep Navy: Tombol aksi utama, header navigasi terpilih, judul krusial |
| `primary-hover` | `#082F49` | Deep Navy Dark: State hover tombol primer |
| `primary-light` | `#2B7FFF` | Sky Blue Comic: Aksen aktif, link, pill badge sorotan |
| `surface` | `#F6F9FF` | Soft Cyan Tint: Latar kanvas utama aplikasi |
| `surface-container` | `#FFFFFF` | Pure White: Latar belakang kartu, form modal, papan kanban |
| `surface-accent` | `#EAF5FC` | Soft Sky Blue: Latar section banner, kartu info, tag pendukung |
| `border-dark` | `#000000` | Solid Black (3px): Garis tepi tegas untuk seluruh kartu & elemen interaktif |
| `border-navy` | `#0E4A6E` | Deep Navy (3px): Alternatif garis tepi pada komponen sub-modul |
| `accent-yellow` | `#FFD02B` | Comic Alert Yellow: Badge 'Beta', tombol CTA sekunder, status perhatian |
| `accent-green` | `#10B981` | Success Mint: Indikator status selesai, nilai kelulusan A, ambang aman AI |
| `accent-red` | `#EF4444` | Danger Coral: Tag tenggat mepet (H-2 submit), peringatan revisi mayor |

---

## 2. Typography System

Menggunakan font display tunggal yang ekspresif dan sangat terbaca: **Bricolage Grotesque** (atau fallback `Plus Jakarta Sans` / `Inter` / system-ui).

### Type Hierarchy
* **Display / Hero Title:**
  * Size: `36px - 44px` (Desktop), `28px - 32px` (Mobile)
  * Weight: `800 ExtraBold`
  * Letter-spacing: `-0.03em`
  * Line-height: `1.1`
* **Heading 1 (H1 - Section Title):**
  * Size: `24px - 28px`
  * Weight: `700 Bold`
  * Transform: Default / Sentence case
* **Heading 2 (H2 - Card Title):**
  * Size: `18px - 20px`
  * Weight: `700 Bold`
* **Body Regular:**
  * Size: `14px - 15px`
  * Weight: `500 Medium` / `400 Regular`
  * Line-height: `1.5`
  * Color: `#0F172A` (Slate Dark) atau `#334155`
* **Badge / Label / Tag:**
  * Size: `11px - 12px`
  * Weight: `700 Bold`
  * Transform: `UPPERCASE`
  * Letter-spacing: `0.05em`

---

## 3. Structural Rules, Outlines & Shadows

Ciri khas Neo-Brutalist Comic Akademika terletak pada kekakuan geometris berpadu dengan aksen komik yang ramah:

### Border Specifications
* **Standard Border:** `3px solid #000000` (atau `3px solid #0E4A6E`) pada seluruh kartu, input form, dialog, dan tombol.
* **Inner Dividers:** `2px solid #E2E8F0` atau `2px dashed #000000` untuk pemisah sub-tugas dalam kartu.

### Shadow Treatments (Hard Offset Shadows)
Tidak ada efek bayangan kabur (*no Gaussian blur, no opacity diffusion*):
* **Card Shadow:** `4px 4px 0px #000000`
* **Button Shadow (Resting):** `3px 3px 0px #000000`
* **Button Shadow (Active/Pressed):** `0px 0px 0px #000000` dengan transform `translate(3px, 3px)`
* **Floating Badge Shadow:** `2px 2px 0px #000000`

### Corner Radii (Border Radius)
* **Cards & Containers:** `ROUND_EIGHT` hingga `16px` (`rounded-xl` atau `rounded-2xl`) dengan outline tebal.
* **Buttons & Badges:** `ROUND_FULL` (`rounded-full`) untuk kesan komik modern, atau `8px` untuk tombol form fungsional.

---

## 4. Component Library & Interaction Patterns

### 4.1. Buttons
1. **Primary Button:** Latar Deep Navy `#0E4A6E`, teks putih, border 3px hitam, hard shadow `3px 3px 0px #000000`.
2. **Action / Comic CTA Button:** Latar Yellow `#FFD02B`, teks hitam `#000000`, border 3px hitam, hard shadow `3px 3px 0px #000000`.
3. **Secondary / Outlined Button:** Latar Putih `#FFFFFF`, teks hitam, border 3px hitam, hover latar soft sky blue `#EAF5FC`.

### 4.2. Status Badges & Pills
* **Pill Format:** Padding `4px 12px`, border `2px solid #000000`, font size `11px`, bold uppercase.
* **Preset Status:**
  * `TERSEDIA`: Latar Deep Navy `#0E4A6E`, teks putih.
  * `EKSTERNAL`: Latar Coral Red `#EF4444`, teks putih.
  * `FASE BETA`: Latar Comic Yellow `#FFD02B`, teks hitam.
  * `SEGERA HADIR`: Latar Slate `#64748B`, teks putih.

### 4.3. Interactive Form & Input Elements
* Input text & textarea berlatar `#FFFFFF` atau `#F6F9FF`, border `3px solid #000000`, focus ring `none` (hanya penebalan visual atau shadow offset).
* Checklist & radio box custom dengan border tebal `3px solid #000000` dan tanda centang tebal kontras.

---

## 5. Layout & Responsive Breakpoint Standards

* **Mobile (390px):**
  * Single-column vertical stack.
  * Padding horizontal: `16px` (`px-4`).
  * Fixed bottom tab navigation (pada layar utama/modul).
* **Desktop (1280px):**
  * Centered layout dengan container `max-width: 1240px`.
  * Padding horizontal: `24px` - `32px`.
  * Multi-column grid: 2-kolom pada Hero, 3-kolom pada Katalog Alat & Kanban, 4-kolom pada Roadmap Skripsi.
  * Top navigation bar lengkap dengan menu eksplorasi, command search (`⌘K`), dan profil pengguna. Zero bottom navigation.
