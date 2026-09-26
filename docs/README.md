# เอกสารออกแบบระบบ — AMMS

**Alarm & Maintenance Management System**
รายวิชา การใช้คอมพิวเตอร์ควบคุมระบบการผลิตอัตโนมัติ (Programming in Automation Systems)
ผู้จัดทำ: _(ชื่อ–สกุล / รหัสนักศึกษา)_ · จัดทำ 21 กันยายน 2569

เอกสารชุดนี้จัดทำ **ก่อนเขียนโค้ด** ตามลำดับที่เอกสารประกอบการสอนบทที่ 1–3 กำหนดไว้
Analyze → Specify → Validate → **Design** → Review → Build

---

## สารบัญ

| ไฟล์ | เนื้อหา | ตรงกับบทเรียน |
|---|---|---|
| [01-requirement-analysis.md](01-requirement-analysis.md) | Problem Statement, Stakeholder, Functional/Non-functional Requirement, Scope, MoSCoW, MVP, User Story + Acceptance Criteria, Business Rule, Open Questions | Chapter 01 |
| [02-system-design.md](02-system-design.md) | System Context, Container Architecture, Module Responsibility, State Machine, Dynamic Flow, Failure Mode, Trust Boundary, Quality Attributes, Change Impact Analysis | Chapter 02 |
| [03-architecture.md](03-architecture.md) | Three-tier Responsibility, Client/Server Inventory, Routing Decision, Data Flow ระดับโค้ด, Error Contract, Secrets, Source of Truth, Project Structure, PLC Integration Interface | Chapter 03 |
| [04-database-schema.md](04-database-schema.md) | ERD, Constraint Matrix, RLS Policy Matrix, DDL ฉบับเต็มที่รันได้, Query ของ Dashboard, แผน Migration | Chapter 03 §3.3 |
| [05-traceability.md](05-traceability.md) | Traceability Matrix (REQ → Design → DB → Code → Test) และ Test Case ที่วางแผนไว้ 4 ระดับ | Chapter 01 §7.3 |
| [06-design-review.md](06-design-review.md) | ผลตรวจ Checklist 29 ข้อจากทั้ง 3 บท + ช่องโหว่ของแบบที่พบและแก้ไปแล้ว 8 จุด | Chapter 01 §7.1, Chapter 02 §11, Chapter 03 §12 |
| [adr/](adr/) | Architecture Decision Record 6 ฉบับ | Chapter 02 §10 |

### Architecture Decision Records

| ADR | หัวข้อ | สถานะ |
|---|---|---|
| [ADR-001](adr/ADR-001-modular-monolith.md) | ใช้ Modular Monolith บน Next.js App Router สำหรับ v1 | Accepted |
| [ADR-002](adr/ADR-002-server-mediated-mutations.md) | Mutation ทั้งหมดผ่าน Server Action โดยมี RLS เป็นชั้นบังคับสุดท้าย | Accepted |
| [ADR-003](adr/ADR-003-status-enum-and-db-constraints.md) | สถานะเป็น Postgres Enum และบังคับ Business Rule ด้วย Constraint ในฐานข้อมูล | Accepted |
| [ADR-004](adr/ADR-004-plc-integration-boundary.md) | กำหนด Integration Boundary ของ PLC ไว้ล่วงหน้า แต่ v1 ใช้ Simulator | Accepted |
| [ADR-005](adr/ADR-005-audit-log-in-server-action.md) | เขียน Audit Log จาก Server Action ไม่ใช้ Database Trigger | Accepted |
| [ADR-006](adr/ADR-006-least-privilege-grants.md) | ให้สิทธิ์ฐานข้อมูลเฉพาะ `authenticated` และใช้ RLS แบบ Default Deny | Accepted |

---

## สรุปการออกแบบใน 10 บรรทัด

1. ระบบกลางบนเว็บสำหรับ Machine Master, Alarm Record, Maintenance Record และ Dashboard ของงานซ่อมบำรุงในโรงงาน
2. Requirement ทั้งหมด **62 ข้อ** — 38 Must, 5 Should, 11 Could และ Non-functional 8 ข้อ ทุกข้อมี Test Case รองรับ
3. Role 3 ระดับ: **Admin / Technician / Viewer** โดยผู้ใช้ใหม่ได้ `viewer` ซึ่งเป็นสิทธิ์ต่ำสุดเป็นค่าตั้งต้น
4. สถาปัตยกรรม **Modular Monolith** บน Next.js App Router — 7 Module แบ่งตาม Business Capability ไม่ใช่ตามชื่อหน้า UI
5. **การอ่าน** ใช้ Server Component query ตรง · **การเขียนทั้งหมด** ผ่าน Server Action · Client เรียก Supabase ตรงได้เฉพาะ Auth
6. Authorization บังคับ **3 ชั้น**: Middleware → Server Action guard → RLS Policy โดยถือว่า RLS เป็นชั้นสุดท้ายไม่ใช่ชั้นเดียว
7. Business Rule สำคัญถูกบังคับซ้ำในฐานข้อมูล **9 จุด** (UNIQUE 2, CHECK 4, FK restrict 2, Trigger 1)
8. `anon` ถูกถอนสิทธิ์ออกจากฐานข้อมูลทั้งหมด ทำให้ตารางใหม่ที่ลืมเปิด RLS ไม่รั่วสู่ผู้ที่ยังไม่ Login
9. ออกแบบ **Error Path และ Failure Mode 9 กรณี** ไม่ใช่เฉพาะ Happy Path พร้อม Error Contract 6 code ที่ UI ใช้แสดงผล
10. เตรียม **Integration Boundary ของ PLC** ไว้ตั้งแต่ v1 (v1 ใช้ Simulator) ทำให้ Change Request เรื่องรับสถานะจาก PLC แตะเพียง Module เดียว

---

## Change Request ที่ระบบรองรับไว้ล่วงหน้าแล้ว

โจทย์ระบุว่าอาจมี Change Request ตอนประเมิน — รายการต่อไปนี้ถูกออกแบบเผื่อไว้ใน v1 แล้ว (ดูรายละเอียดผลกระทบใน [02 §11](02-system-design.md#11-change-impact-analysis))

| Change Request ตัวอย่างในโจทย์ | สถานะในแบบนี้ |
|---|---|
| เพิ่มสถานะ Waiting Part | ✅ อยู่ใน enum `mnt_status` แล้ว |
| เพิ่ม Filter ตามช่วงวันที่ | ✅ REQ-BON-08 + index รองรับแล้ว |
| เพิ่มข้อมูล Technician | ✅ `maintenance_records.technician_id` + ขยาย `profiles` ได้ |
| เพิ่มกราฟจำนวน Alarm | ✅ REQ-DSH-04 + query เขียนไว้แล้ว |
| เพิ่มหน้า Machine History | ✅ REQ-BON-03 + ตาราง `machine_status_history` |
| เพิ่ม Validation เพิ่มเติม | ✅ Validation 3 ชั้น ขยายได้ที่ `schema.ts` จุดเดียว |
| เพิ่ม Role เช่น Viewer | ✅ มีตั้งแต่ v1 |
| รับ Machine Status จาก PLC | ✅ Contract + คอลัมน์รองรับพร้อมแล้ว (ADR-004) |

---

## ขั้นถัดไป

- [ ] ยืนยัน Open Questions ที่ค้าง 3 ข้อกับอาจารย์ (OQ-01 สมัครเองได้หรือไม่, OQ-03 ต้องส่งเอกสาร Mini Lab แยกหรือไม่, OQ-06 กำหนดส่งและ Change Request)
- [ ] สร้าง Supabase Project และรัน `supabase/schema.sql`
- [ ] Scaffold Next.js + Tailwind ตามโครงสร้างใน [03 §9](03-architecture.md#9-project-structure)
- [ ] ตั้ง GitHub Repository + CI workflow (install → build → lint → test)
- [ ] พัฒนาตามลำดับ MVP: Auth/Role → Machine → Alarm → Maintenance → Dashboard → Deploy
- [ ] อัปเดตสถานะใน [05-traceability.md](05-traceability.md) ทุกครั้งที่ Test ผ่านจริง

---

## การใช้ AI ในการจัดทำเอกสารชุดนี้

ใช้ AI ช่วยร่างและตรวจเอกสาร โดยผู้พัฒนาเป็นผู้ตัดสินใจและยืนยันทุกข้อ

| ใช้ AI ช่วย | ผู้พัฒนาตัดสินใจเอง |
|---|---|
| แตก Requirement จากโจทย์เป็น REQ-ID ที่ตรวจสอบได้ | ลำดับความสำคัญ (MoSCoW) และขอบเขตของ v1 |
| ร่าง User Story / Acceptance Criteria / Test Case | กฎด้านความปลอดภัยและสิทธิ์การเข้าถึง |
| เสนอ Failure Mode และ Edge Case ที่อาจลืม | การเลือกสถาปัตยกรรมและ Trade-off ทุก ADR |
| ร่าง DDL และ RLS Policy | สมมติฐานเรื่องกระบวนการจริงในโรงงาน |
| ตรวจความครบถ้วนเทียบเกณฑ์การให้คะแนน | การยืนยัน Requirement ขั้นสุดท้าย |

**ข้อเสนอของ AI ที่ถูกปฏิเสธ:** Supabase Realtime และ Redis cache (เพิ่ม complexity เกินที่ Requirement ขอ)
**ข้อผิดพลาดของ AI ที่ตรวจพบและแก้:** `CHECK (occurred_at <= now())` ซึ่ง PostgreSQL รันไม่ได้ และ `grant ... to anon` ที่เปิดช่องความปลอดภัย — รายละเอียดใน [06 §5](06-design-review.md)
