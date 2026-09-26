"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/lib/auth/roles";

/**
 * เมนูบนแถบด้านบน (แบบโหมด kiosk ของ One Card — ไม่มีเมนูด้านซ้าย)
 * เป็น Client Component เพราะต้องรู้ว่าตอนนี้อยู่หน้าไหนเพื่อขีดเส้นใต้เมนูนั้น
 */
export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav aria-label="เมนูหลัก" className="flex h-full min-w-0 gap-5 overflow-x-auto">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-full items-center whitespace-nowrap border-b-[3px] pt-[3px] text-[13.5px] transition-colors ${
              active
                ? "border-accent font-semibold text-white"
                : "border-transparent text-top-ink hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
