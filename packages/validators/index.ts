import { z } from "zod";

export const slugSchema = z.string().min(1).max(50);

export const gpaInputSchema = z.object({
  credits: z.number().positive(),
  gradePoint: z.number().min(0).max(4)
});

export const citationSchema = z.object({
  judul: z.string().min(3, "Judul minimal 3 karakter"),
  penulis: z.string().min(3, "Isi minimal 1 penulis"),
  tahun: z.string().regex(/^\d{4}$/, "Tahun harus 4 digit"),
  penerbit: z.string().optional().default(""),
  identifier: z.string().optional().default(""),
});

export const gradeRowSchema = z.object({
  nama: z.string().min(1),
  bobot: z.number().min(0).max(100),
  nilai: z.number().min(0).max(100).nullable(),
});

export const plannerTaskSchema = z.object({
  nama: z.string().min(2, "Nama tugas minimal 2 karakter"),
  deadline: z.string().optional().default(""),
  prioritas: z.enum(["rendah", "sedang", "tinggi"]),
  durasi: z.number().min(5).max(1440),
});

export const flashcardsSchema = z.object({
  depan: z.string().min(1),
  belakang: z.string().min(1),
});
