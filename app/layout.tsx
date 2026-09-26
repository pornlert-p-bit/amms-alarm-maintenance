import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";

import "./globals.css";

// ฟอนต์ที่รองรับทั้งภาษาไทยและอังกฤษ — next/font ดาวน์โหลดมาเก็บตอน build ไม่ต้องโหลดจาก Google ตอนใช้งาน
const thaiFont = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai",
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
    <html lang="th" className={thaiFont.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
