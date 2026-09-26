import type { Metadata } from "next";
import { Anuphan } from "next/font/google";

import "./globals.css";

// Anuphan — ฟอนต์ไทยชุดเดียวกับโปรเจกต์ One Card
// next/font ดาวน์โหลดมาเก็บไว้ในโปรเจกต์ตอน build ผู้ใช้จึงไม่ต้องโหลดจาก Google ตอนเปิดเว็บ
const anuphan = Anuphan({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-anuphan",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AMMS — Alarm & Maintenance Management System",
    template: "%s | AMMS",
  },
  description: "ระบบจัดการ Alarm และงานซ่อมบำรุงเครื่องจักรในโรงงาน",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" className={anuphan.variable}>
      <body className="min-h-screen font-sans text-[14px] antialiased">{children}</body>
    </html>
  );
}
