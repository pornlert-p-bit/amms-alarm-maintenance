# AMMS — Alarm & Maintenance Management System

ระบบเว็บสำหรับจัดการข้อมูลเครื่องจักร บันทึก Alarm และติดตามงานซ่อมบำรุงในโรงงาน
โปรเจกต์รายวิชา **การใช้คอมพิวเตอร์ควบคุมระบบการผลิตอัตโนมัติ** (Programming in Automation Systems)

> **สถานะ:** กำลังพัฒนา — ส่วน Login / สิทธิ์ตาม Role / CI เสร็จแล้ว, Module งานหลักอยู่ระหว่างพัฒนา
> **Vercel URL:** _(จะเพิ่มหลัง deploy ครั้งแรก)_

## วัตถุประสงค์

โรงงานบันทึก Alarm และงานซ่อมกระจายหลายแหล่ง ทำให้ค้นประวัติยาก ติดตามสถานะไม่ได้ และแต่ละฝ่ายเห็นข้อมูลไม่ตรงกัน
AMMS รวม Machine, Alarm และ Maintenance ไว้ที่เดียว พร้อมสิทธิ์ตามบทบาทและ Dashboard สรุปภาพรวม
(รายละเอียด: [docs/01-requirement-analysis.md](docs/01-requirement-analysis.md))

## เทคโนโลยี

| ส่วน | เทคโนโลยี |
|---|---|
| Frontend + Backend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| ฐานข้อมูล + Login | Supabase (PostgreSQL, Auth, Row Level Security) |
| Validation | Zod |
| Test | Vitest |
| CI | GitHub Actions — Install → Build → Lint → Test |
| Deploy | Vercel |

## สิทธิ์ตามบทบาท

| Role | ดูข้อมูล | บันทึก Alarm / งานซ่อม | จัดการเครื่องจักร | จัดการผู้ใช้ |
|---|---|---|---|---|
| Admin | ✅ | ✅ | ✅ | ✅ |
| Technician | ✅ | ✅ | — | — |
| Viewer | ✅ | — | — | — |

สิทธิ์ถูกบังคับ 3 ชั้น: `proxy.ts` → ตรวจในแต่ละหน้า/Server Action → RLS ในฐานข้อมูล
(ซ่อนปุ่มอย่างเดียวไม่นับเป็นความปลอดภัย — ดู [ADR-002](docs/adr/ADR-002-server-mediated-mutations.md))

## ติดตั้งและรัน

```bash
git clone <repository-url>
cd amms
npm ci
cp .env.example .env.local   # แล้วใส่ค่า Supabase URL + Publishable key
npm run dev                  # http://localhost:3000
```

ขั้นตอนตั้งค่า Supabase, สร้างบัญชี และ deploy อยู่ใน **[docs/RUNBOOK.md](docs/RUNBOOK.md)**

| คำสั่ง | ทำอะไร |
|---|---|
| `npm run dev` | รันโหมดพัฒนา |
| `npm run build` | build สำหรับ production |
| `npm run lint` | ตรวจรูปแบบโค้ด |
| `npm test` | รัน unit test |

## เอกสาร

| เอกสาร | เนื้อหา |
|---|---|
| [docs/README.md](docs/README.md) | สารบัญเอกสารออกแบบทั้งหมด |
| [docs/04-database-schema.md](docs/04-database-schema.md) | โครงสร้างฐานข้อมูล, ERD, RLS |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | คู่มือดูแลระบบ / แก้ปัญหา / backup |
| [docs/adr/](docs/adr/) | เหตุผลของการตัดสินใจด้านสถาปัตยกรรม |

## การใช้ AI ในการพัฒนา

ใช้ Claude Code ช่วยวิเคราะห์ Requirement, ออกแบบ, เขียนโค้ด และตรวจสอบ โดยผู้พัฒนาตัดสินใจเรื่องขอบเขต สิทธิ์ และสถาปัตยกรรมเอง
รายละเอียดฉบับเต็มจะอยู่ใน `AI_USAGE_REPORT.md`
