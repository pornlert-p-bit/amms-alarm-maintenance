# ADR-003 — สถานะเป็น Postgres Enum และบังคับ Business Rule ด้วย Constraint ในฐานข้อมูล

| | |
|---|---|
| **สถานะ** | Accepted |
| **วันที่** | 21 กันยายน 2569 |
| **เกี่ยวข้องกับ** | [ADR-002](ADR-002-server-mediated-mutations.md) · NFR-INT-01 · NFR-MAINT-01 |

## Context

ระบบมีสถานะ 4 ชุด (Machine, Alarm, Maintenance, User Role) และมีกฎความถูกต้องของข้อมูลที่ห้ามละเมิดเด็ดขาด:

- Machine ID ห้ามซ้ำ (BR-01)
- Alarm ที่ปิดแล้วต้องมี Cause, Closed By และ Closed At (BR-03)
- งานซ่อมที่ Done ต้องมี Action Taken (BR-04)

เอกสารบทที่ 3 ระบุ Anti-pattern ไว้ตรง ๆ ว่า *"ไม่มี constraint ใน DB → ข้อมูลผิดแม้ UI validate"* และ *"เก็บ status เป็น text อะไรก็ได้"* คำถามคือกฎเหล่านี้ควรอยู่ที่ชั้นไหน

## Decision

1. สถานะทุกชุดเป็น **PostgreSQL `enum`** ไม่ใช่ `text` — ค่าที่ไม่อยู่ในรายการเข้าฐานข้อมูลไม่ได้เลย
2. กฎ BR-01, BR-03, BR-04 ถูกบังคับด้วย **UNIQUE และ CHECK constraint** ในฐานข้อมูล **ซ้ำกับ** การตรวจใน Server Action
3. **กฎลำดับ Transition (BR-02) ไม่ทำเป็น Constraint** — ใช้ฟังก์ชันบริสุทธิ์ `allowedAlarmTransition()` ใน `rules.ts` เพราะ CHECK constraint มองเห็นเฉพาะแถวปัจจุบัน ไม่เห็นค่าก่อนหน้า (การทำด้วย Trigger ได้ แต่ทำให้ debug ยากและกระจายกฎออกไปอีกที่)
4. **BR-08 (Occurred At ไม่เป็นอนาคต) ใช้ Trigger ไม่ใช่ CHECK** เพราะ PostgreSQL บังคับให้ฟังก์ชันใน CHECK ต้องเป็น `IMMUTABLE` แต่ `now()` เป็น `STABLE` — เขียน `CHECK (occurred_at <= now())` จะถูกปฏิเสธตอนสร้างตาราง
5. `audit_logs` และ `machine_status_history` ไม่มี Policy สำหรับ UPDATE/DELETE เลย → เป็น append-only จริงในระดับฐานข้อมูล

**สรุปการแบ่งชั้น**

| กฎ | Client | Server Action | Database |
|---|---|---|---|
| ช่องจำเป็นห้ามว่าง | ✓ (UX) | ✓ (zod) | ✓ (`check btrim(...) <> ''`) |
| Machine ID ไม่ซ้ำ | ✓ (แจ้งล่วงหน้า) | ✓ (ตรวจก่อนเขียน) | ✓ (`UNIQUE`) |
| Machine ID ตรงรูปแบบ | ✓ | ✓ | ✓ (`CHECK ~ regex`) |
| ปิด Alarm ต้องมี Cause | ✓ | ✓ | ✓ (`CHECK`) |
| Done ต้องมี Action Taken | ✓ | ✓ | ✓ (`CHECK`) |
| ลำดับ Transition | ปิดปุ่มที่ไม่ควรกดได้ | ✓ (`rules.ts`) | — (เหตุผลข้อ 3) |
| Occurred At ไม่เป็นอนาคต | ✓ | ✓ | ✓ (Trigger) |

## Alternatives ที่พิจารณา

| ทางเลือก | ข้อดี | เหตุที่ไม่เลือก |
|---|---|---|
| เก็บสถานะเป็น `text` + ตรวจในโค้ดเท่านั้น | เพิ่มค่าใหม่ง่าย ไม่ต้อง migration | ข้อมูลผิดเข้าฐานข้อมูลได้ทันทีที่มีใครเรียกผ่านทางอื่น — เป็น Anti-pattern ที่บทเรียนเตือนไว้ |
| ตาราง Lookup (`alarm_statuses`) + FK | เพิ่มค่าใหม่โดยไม่ต้อง `ALTER TYPE` | ต้อง join เพิ่มทุก query และไม่ได้ประโยชน์เพราะสถานะเป็นชุดปิดที่แทบไม่เปลี่ยน |
| ใส่กฎทั้งหมดเป็น Trigger ใน DB | บังคับได้จากทุก client | กฎกระจายไปอยู่ในฐานข้อมูลจนตามและ debug ยาก และเขียน Unit Test ยากกว่า pure function |
| เชื่อ Validation ฝั่ง Client เท่านั้น | โค้ดน้อยที่สุด | ผู้ใช้ควบคุม Browser ได้ — Validation ฝั่ง Client มีไว้เพื่อ UX ไม่ใช่เพื่อ Integrity |

## Consequences

**ผลบวก**
- ความถูกต้องของข้อมูลไม่ขึ้นกับว่าใครเป็นผู้เรียก — ถึงข้าม UI และ Server Action ไปยิง Data API ตรง ข้อมูลผิดกฎก็เข้าไม่ได้ (ตอบ QAS-03 และ NFR-INT-01)
- Enum ทำให้ Requirement เรื่องค่าสถานะที่อนุญาตกลายเป็นสิ่งที่ตรวจสอบได้จริง

**ผลลบ / สิ่งที่ต้องเฝ้าระวัง**
- เพิ่มค่าสถานะใหม่ต้องรัน `alter type ... add value` เป็น migration และรันแยก transaction จากการใช้ค่านั้น
- ข้อความ error จาก Constraint ของฐานข้อมูลอ่านไม่รู้เรื่องสำหรับผู้ใช้ → **Server Action ต้อง map ชื่อ Constraint เป็นข้อความภาษาไทยและระบุ field** (ผูกกับ Error Contract ใน [03-architecture.md](../03-architecture.md) §5.3)
- กฎถูกเขียน 2–3 ที่ ต้องแก้ให้ตรงกันเมื่อเปลี่ยน — ยอมรับเพราะแลกกับความถูกต้องของข้อมูล และ NFR-MAINT-01 จำกัดให้ไม่เกิน 3 จุด
