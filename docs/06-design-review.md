# 06 — Design Review

**ระบบ:** Alarm & Maintenance Management System (AMMS)
**วันที่ตรวจ:** 21 กันยายน 2569
**ขอบเขตการตรวจ:** เอกสารออกแบบ 01–05 **ก่อนเริ่มเขียนโค้ด**
**ผู้ตรวจ:** ผู้พัฒนา (self-review) โดยใช้ AI ช่วยหาช่องโหว่ของแบบ แล้วยืนยันทุกข้อด้วยตนเอง

> **ขอบเขตที่ตรวจได้จริง:** เอกสารนี้ตรวจ *ความสมบูรณ์ของแบบ* ไม่ใช่ผลการทำงานของระบบ
> ข้อที่ต้องพิสูจน์ด้วยการรันโค้ดจริงถูกระบุสถานะว่า `ต้องพิสูจน์หลัง implement` พร้อมชี้ Test ID ที่จะใช้พิสูจน์ — ไม่มีข้อใดในเอกสารนี้ที่บันทึกว่า "ผ่าน" โดยยังไม่ได้ทดสอบ

**สัญลักษณ์:** ✅ ผ่านการตรวจระดับแบบ · ⚠️ มีข้อสังเกตที่ต้องติดตาม · ⏳ ต้องพิสูจน์หลัง implement

---

## 1. Requirement Review Checklist (Chapter 01 §7.1)

| # | ข้อตรวจ | ผล | บันทึกผลตรวจ |
|---|---|---|---|
| 1 | ผู้ใช้และ Role ชัดเจน | ✅ | 5 Stakeholder แมปเป็น 3 Role ครบ (01 §2) ไม่มี Stakeholder ที่ไม่มี Role รองรับ |
| 2 | แต่ละ Requirement มี Business Need รองรับ | ✅ | สุ่มตรวจย้อนกลับ 10 ข้อ ทุกข้อสืบถึงปัญหา 4 ข้อใน Problem Statement ได้ |
| 3 | Requirement ตรวจสอบได้ | ✅ | ทุก REQ มี Test ID ใน 05 §1–3 ไม่มีข้อที่ใช้คำว่า "ใช้งานง่าย/เร็ว/ปลอดภัย" ลอย ๆ |
| 4 | ไม่มี Requirement ขัดกันหรือซ้ำกัน | ⚠️ | ตรวจพบคู่ที่ต้องอ่านคู่กัน: REQ-MCH-01 ("Delete ได้") กับ REQ-MCH-05 ("Soft Delete") — **แก้แล้ว** โดยระบุใน BR-06 ว่า Delete ในระบบนี้หมายถึง Soft Delete และไม่มี RLS Policy สำหรับ DELETE |
| 5 | กำหนด Scope และ Priority แล้ว | ✅ | 01 §6 Scope, §7 MoSCoW — 38 Must / 5 Should / 11 Could |
| 6 | ข้อมูลที่ต้องใช้ครบ | ✅ | ทุก REQ ที่ต้องเก็บข้อมูลมีคอลัมน์รองรับใน 04 §5 |
| 7 | มี Security / Validation / Error Case | ✅ | REQ-SEC 6 ข้อ, REQ-VAL 4 ข้อ, Failure Mode 9 กรณี, Error Contract 6 code |
| 8 | Open Questions ถูกปิดหรือระบุไว้ | ⚠️ | ค้าง 3 ข้อ (OQ-01, OQ-03, OQ-06) ที่ต้องถามอาจารย์ — ทุกข้อมีสมมติฐานที่ใช้ไปก่อนแล้ว และไม่มีข้อใดที่บล็อกการเริ่มพัฒนา |
| 9 | Stakeholder หลักยอมรับ Requirement | ⚠️ | รอยืนยันกับอาจารย์ผู้สอนในฐานะผู้รับมอบงาน |

---

## 2. System Design Review Checklist (Chapter 02 §11.1)

| # | ข้อตรวจ | ผล | บันทึกผลตรวจ |
|---|---|---|---|
| 1 | System Boundary ชัดเจน | ✅ | 02 §1.1 ตอบคำถาม 6 ข้อครบ ระบุทั้งสิ่งที่เป็นและ**ไม่เป็น**หน้าที่ของระบบ |
| 2 | แต่ละ Module มี Responsibility ชัดและไม่ซ้ำกัน | ✅ | 7 Module ใน 02 §3.1 ไม่มี Module ใดเป็นเจ้าของตารางเดียวกัน |
| 3 | ไม่มี Business Rule สำคัญหลุดไปอยู่ใน UI อย่างเดียว | ✅ | BR-01 ถึง BR-09 ระบุชั้นบังคับทุกข้อ ไม่มีข้อใดที่บังคับเฉพาะ Client |
| 4 | Authentication/Authorization enforce ที่ server/database | ✅ | 3 ชั้น (TB-4) และ RLS Policy ครบทุกตารางใน 04 §4 |
| 5 | มี Single Source of Truth สำหรับข้อมูลหลัก | ✅ | 03 §7 ระบุทั้ง 8 ก้อนข้อมูล พร้อมระบุว่า v2 ย้าย Machine Live Status ไป PLC |
| 6 | รู้ว่า failure สำคัญเกิดตรงไหนและ user เห็นอะไร | ✅ | Failure Mode 9 กรณี (02 §6) จับคู่กับ Error Contract (03 §5.3) ครบทุก code |
| 7 | มี log/audit สำหรับ operation สำคัญ | ✅ | ADR-005 + `audit_logs` แบบ append-only + แยก Audit จาก Application Log |
| 8 | ไม่มีส่วนใดซับซ้อนเกิน Requirement | ✅ | ไม่มี queue / cache / microservice / realtime ใน v1 — เหตุผลบันทึกใน ADR-001 และ ADR-004 |
| 9 | ทดสอบ module/use case สำคัญได้ | ✅ | `rules.ts` และ `schema.ts` เป็น pure function → Unit Test 10 เคสใน 05 §4.1 ไม่ต้องต่อ DB |
| 10 | Requirement เปลี่ยน 1 จุด กระทบหลายส่วนเกินไปหรือไม่ | ⚠️ | ทำ Change Impact Analysis 8 รายการไว้แล้ว (02 §11) — 5 รายการทำล่วงหน้าใน v1 แล้ว ส่วน "ส่ง Notification" ประเมินว่า**สูง** เพราะต้องคิด retry/ordering จึงจัดเป็น Won't have now |

---

## 3. Architecture Review Checklist (Chapter 03 §12)

| # | ข้อตรวจ | ผล | บันทึกผลตรวจ |
|---|---|---|---|
| 1 | Frontend ไม่มี Business Rule สำคัญปะปน | ✅ | Rule อยู่ใน `features/*/rules.ts` ที่เรียกจาก Server Action เท่านั้น (03 §9.1) |
| 2 | ไม่มี Secret ถูกส่งไป Browser | ⏳ | แบบถูกต้องแล้ว (03 §6) + กันด้วย `import 'server-only'` — **ต้องพิสูจน์ด้วย TC-SEC-03** (grep bundle + ตรวจ git history) |
| 3 | ทุก mutation สำคัญมี Authorization ฝั่ง trusted layer | ⏳ | ออกแบบ 3 ชั้นครบ — **ต้องพิสูจน์ด้วย TC-MCH-06, TC-AUTH-06, TC-NFR-03** |
| 4 | Database มี key/constraint/policy รองรับความถูกต้อง | ✅ | 9 จุดบังคับใน 04 §3 (UNIQUE 2, CHECK 4, FK restrict 2, Trigger 1) |
| 5 | อธิบาย Data Flow ของ use case หลักได้ครบ | ✅ | Create Alarm และ Close Alarm ครบตั้งแต่ปุ่มจนถึง Constraint (02 §5, 03 §5) |
| 6 | Source of Truth ชัดเจน | ✅ | 03 §7 |
| 7 | ถ้า network/service ขัดข้องจะเกิดอะไร | ✅ | FM-01, FM-03, FM-09 + NFR-AVAIL-01 |
| 8 | ระบบ Automation แยกจาก Browser ด้วย Integration/Gateway | ✅ | 03 §8 — Browser ไม่ติดต่อ PLC ตรง และ Control Loop อยู่ใน PLC ไม่ใช่ Web App |
| 9 | ไม่มี module ใดรับผิดชอบหลายเรื่องเกินไป | ✅ | แยก UI / Rule / Schema / Query / Action / Integration (03 §9.1) |
| 10 | Architecture ไม่ซับซ้อนเกินขนาดของระบบ | ✅ | Monolith เดียว 1 deploy — ADR-001 |

---

## 4. Bad Design vs Better Design — ตรวจว่าเราอยู่ฝั่งไหน

| สถานการณ์ | Bad Design | แบบของระบบนี้ | ผล |
|---|---|---|---|
| Role | ซ่อนปุ่ม Admin อย่างเดียว | Middleware + Server Action guard + RLS | ✅ |
| Validation | ตรวจเฉพาะ Browser | Client (UX) + zod ฝั่ง Server + Constraint ใน DB | ✅ |
| Module | ทุกอย่างอยู่ไฟล์เดียว | แยกตาม domain ใน `features/` | ✅ |
| Database | เก็บ status เป็น text อะไรก็ได้ | Postgres enum + CHECK constraint | ✅ |
| Integration | เรียก PLC API ตรงจาก UI | ผ่าน Route Handler + Integration Service | ✅ |
| Error | `catch` แล้วไม่ทำอะไร | `ActionResult` มี code/message/field + Log ที่มี context | ✅ |
| Secret | ใส่ service role key ใน frontend | Server-only + `import 'server-only'` + ไม่ใช้ prefix `NEXT_PUBLIC_` | ✅ |
| Table Privilege | grant DML ให้ `anon` ทุกตาราง | revoke ทั้งหมดจาก `anon` grant เฉพาะ `authenticated` | ✅ ADR-006 |

---

## 5. ตรวจคำตอบที่ได้จาก AI (Chapter 02 §12.3, Chapter 03 §14)

| คำถามตรวจ | คำตอบ |
|---|---|
| AI เพิ่ม Feature ที่ Requirement ไม่ได้ขอหรือไม่? | มี 2 รายการที่ถูก **ตัดออก** — AI เสนอ Supabase Realtime สำหรับอัปเดต Dashboard สด และเสนอ Redis cache สำหรับ Aggregate ทั้งสองถูกปฏิเสธเพราะ Requirement ไม่ได้ขอและเพิ่ม complexity เกินขนาดงาน (บันทึกเหตุผลใน ADR-001, ADR-004) |
| AI เลือก technology เพราะจำเป็นหรือเพราะเป็น pattern ที่คุ้นเคย? | Stack ถูกบังคับโดยโจทย์อยู่แล้ว ส่วนที่เลือกเองคือ Server Action แทน Route Handler ซึ่งมีเหตุผลผูกกับ Requirement ใน ADR-002 |
| มี secret/permission boundary ที่ไม่ปลอดภัยหรือไม่? | พบ 1 จุดจาก schema แบบทั่วไปที่ AI ร่างมาตอนแรก คือ `grant ... to anon` + `alter default privileges` ซึ่ง**เปิดช่องให้ตารางใหม่ที่ลืมเปิด RLS รั่วสู่ผู้ไม่ Login** — แก้เป็น revoke จาก `anon` และบันทึกเป็น ADR-006 |
| มี component ใดที่ไม่มีเจ้าของข้อมูลชัดเจนหรือไม่? | ไม่มี — 03 §7 ระบุ Source of Truth ครบทุกก้อน |
| Architecture นี้ test/deploy/debug ได้จริงหรือไม่? | ได้ — Monolith เดียว, Unit Test ไม่ต้องต่อ DB, CI ชุดเดียว, deploy Vercel ปุ่มเดียว |
| AI ใช้แนวทางที่ล้าสมัยหรือไม่? | พบ 1 จุด — AI ร่าง `CHECK (occurred_at <= now())` ซึ่ง PostgreSQL ปฏิเสธเพราะ CHECK ต้องใช้ฟังก์ชัน `IMMUTABLE` แต่ `now()` เป็น `STABLE` **แก้เป็น Trigger** และบันทึกเหตุผลใน ADR-003 ข้อ 4 |

---

## 6. ช่องโหว่ของแบบที่พบและแก้ไปแล้ว

| # | ช่องโหว่ที่พบตอน Review | การแก้ไข |
|---|---|---|
| 1 | `CHECK (occurred_at <= now())` รันไม่ได้จริงบน PostgreSQL | เปลี่ยนเป็น Trigger `trg_alarms_check_occurred_at` พร้อมเผื่อ clock skew 1 นาที |
| 2 | Grant DML ให้ `anon` ทำให้ตารางใหม่ที่ลืมเปิด RLS รั่ว | Revoke ทั้งหมดจาก `anon`, grant เฉพาะ `authenticated` และระบุชื่อตารางตรง ๆ (ADR-006) |
| 3 | กฎ "ห้ามเปลี่ยน Role ตัวเอง" อยู่แต่ใน Server Action | ย้ายไปบังคับใน RLS ด้วยเงื่อนไข `id <> auth.uid()` — Admin ยิง Data API ตรงก็ยกระดับสิทธิ์ตัวเองไม่ได้ |
| 4 | Alarm ที่ยังไม่ปิดอาจมี `closed_at` ค้างจากการ update ผิด | เพิ่ม CHECK `alarms_open_has_no_close_data` |
| 5 | REQ-MCH-01 (Delete) ขัดกับ REQ-MCH-05 (Soft Delete) | นิยามชัดใน BR-06 และไม่สร้าง RLS Policy สำหรับ DELETE เลย |
| 6 | ลืมคิดว่า Gateway retry จะสร้าง Alarm ซ้ำ | เพิ่ม `alarms.event_id` UNIQUE เป็น Idempotency Key ตั้งแต่ v1 (FM-07) |
| 7 | ถ้าลืมเรียก `writeAudit()` ใน Server Action ใหม่ จะไม่มี log เงียบ ๆ | รวมการเขียนไว้ที่ `features/audit/write.ts` จุดเดียว + เพิ่มข้อตรวจในรายการ §7 |
| 8 | `current_role_name()` เป็น `security definer` อาจถูก search_path hijack | เพิ่ม `set search_path = public` และ revoke execute จาก `public`/`anon` |

---

## 7. รายการตรวจสำหรับทุก Pull Request / Feature ถัดไป

- [ ] Server Action ใหม่เรียก `requireUser()` / `requireStaff()` / `requireAdmin()` แล้ว
- [ ] Server Action ใหม่เขียน Audit Log ผ่าน `features/audit/write.ts` แล้ว (ADR-005)
- [ ] ไม่รับ field ที่ระบบต้องกำหนดเอง (`created_by`, `closed_by`, `closed_at`, `role`) จาก payload
- [ ] Query ใหม่กรอง `deleted_at is null` แล้ว (BR-06)
- [ ] Query รายการใหม่มี pagination (NFR-PERF-02)
- [ ] ตารางใหม่สั่ง `enable row level security` + `grant` ให้ `authenticated` แล้ว (ADR-006)
- [ ] Business Rule ใหม่ที่เกี่ยวกับความถูกต้องของข้อมูล มี Constraint ใน DB รองรับด้วย (ADR-003)
- [ ] มี Unit Test ของ `rules.ts` / `schema.ts` ที่เพิ่มหรือแก้
- [ ] อัปเดต Traceability Matrix ใน [05-traceability.md](05-traceability.md)
- [ ] ไม่มี Secret ใหม่ที่ใช้ prefix `NEXT_PUBLIC_`

---

## 8. สรุปผลการตรวจ

| ชุด Checklist | ผ่าน | มีข้อสังเกต | ต้องพิสูจน์หลัง implement |
|---|---|---|---|
| Requirement Review (9 ข้อ) | 6 | 3 | 0 |
| System Design Review (10 ข้อ) | 9 | 1 | 0 |
| Architecture Review (10 ข้อ) | 8 | 0 | 2 |
| **รวม 29 ข้อ** | **23** | **4** | **2** |

**ข้อสังเกต 4 ข้อ** เป็นเรื่องที่ติดตามได้และไม่บล็อกการเริ่มพัฒนา — 3 ข้อรอคำตอบจากอาจารย์ (OQ-01, OQ-03, OQ-06) และ 1 ข้อเป็นการประเมิน Change Impact ที่บันทึกไว้แล้ว

**ข้อที่ต้องพิสูจน์ 2 ข้อ** คือเรื่อง Secret ไม่รั่วและ Authorization บังคับได้จริง ซึ่งพิสูจน์ด้วยการรัน Test ไม่ใช่ด้วยการอ่านแบบ — จะอัปเดตผลเมื่อ TC-SEC-03, TC-MCH-06, TC-AUTH-06 และ TC-NFR-03 รันผ่าน

**ข้อสรุป:** แบบมีความสมบูรณ์พอที่จะเริ่มเขียนโค้ดได้ โดยพบและแก้ช่องโหว่ของแบบไปแล้ว 8 จุดก่อนลงมือ ซึ่งเป็นเหตุผลหลักที่ทำ Design Review ก่อนให้ AI สร้างโค้ด
