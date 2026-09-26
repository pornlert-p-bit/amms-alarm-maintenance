# ADR-005 — เขียน Audit Log จาก Server Action ไม่ใช้ Database Trigger

| | |
|---|---|
| **สถานะ** | Accepted |
| **วันที่** | 21 กันยายน 2569 |
| **เกี่ยวข้องกับ** | [ADR-002](ADR-002-server-mediated-mutations.md) · REQ-SEC-06 · NFR-OBS-01 |

## Context

Requirement กำหนดว่าการเปลี่ยนสถานะ Alarm/Maintenance, การแก้ Machine และการเปลี่ยน Role ต้องตามย้อนกลับได้ว่า **ใครทำอะไรกับข้อมูลใดเมื่อไร** (REQ-SEC-06)

มีสองวิธีหลักในการเก็บ:

1. **Database Trigger** — ผูกกับตาราง เขียน log อัตโนมัติทุกครั้งที่ข้อมูลเปลี่ยน
2. **Application-level** — Server Action เขียน log เองในทรานแซกชันเดียวกับการเปลี่ยนข้อมูล

## Decision

เขียน Audit Log จาก **Server Action** โดยมีเงื่อนไข:

1. เขียนในคำสั่งชุดเดียวกับการเปลี่ยนข้อมูล — ถ้าเขียน log ไม่สำเร็จให้ rollback ทั้งชุด
2. เก็บ **ความหมายของการกระทำ (action)** ไม่ใช่เพียง diff ของแถว เช่น `alarm.close`, `machine.soft_delete`, `user.role_change` — ค่าเหล่านี้สื่อเจตนาซึ่ง Trigger ไม่มีทางรู้
3. เก็บ `before_data` / `after_data` เป็น `jsonb` เฉพาะ field ที่เกี่ยวข้อง ไม่ dump ทั้งแถว
4. ตาราง `audit_logs` **ไม่มี Policy สำหรับ UPDATE/DELETE** → append-only จริงในระดับฐานข้อมูล
5. Policy INSERT บังคับ `actor_id = auth.uid()` → ผู้ใช้ปลอมตัวเป็นคนอื่นใน log ไม่ได้
6. อ่าน Audit Log ได้เฉพาะ Role Admin
7. **ยกเว้น 1 กรณี:** ประวัติการเปลี่ยนสถานะเครื่องจักรใช้ **Trigger** เขียนลง `machine_status_history` เพราะเป็นข้อมูลเชิงเหตุการณ์ล้วนที่ต้องไม่หายแม้สถานะจะถูกเปลี่ยนจากหลายเส้นทาง (ฟอร์ม, Simulator, PLC ใน v2)

## Alternatives ที่พิจารณา

| ทางเลือก | ข้อดี | เหตุที่ไม่เลือก |
|---|---|---|
| Database Trigger เขียนทุกตาราง | ไม่มีทางลืมเขียน log, ครอบทุกเส้นทางรวมถึงการแก้ด้วย SQL ตรง | ได้เพียง "แถวเปลี่ยนจาก A เป็น B" ไม่รู้ว่าเป็นการ *ปิด Alarm* หรือ *แก้คำผิด*; `auth.uid()` ใน Trigger ใช้ได้แต่จะว่างเมื่อทำงานผ่าน service role; และกฎกระจายไปอยู่ในฐานข้อมูลจนตามยาก |
| เขียน log แบบ fire-and-forget หลัง commit | ไม่ทำให้ Mutation ล้มเพราะ log | log อาจหายเงียบ ๆ ซึ่งทำลายจุดประสงค์เรื่อง accountability |
| ใช้ Application Log ของ Vercel แทนตาราง | ไม่ต้องทำตารางเพิ่ม | Admin เข้าดูเองไม่ได้, ค้นหา/กรองยาก, และ log ของ runtime มี retention จำกัด |
| เก็บทั้ง before/after ทั้งแถวทุกครั้ง | ข้อมูลครบที่สุด | เปลืองพื้นที่และเสี่ยงเก็บข้อมูลที่ไม่ควรเก็บซ้ำไปเรื่อย ๆ |

## Consequences

**ผลบวก**
- Log สื่อเจตนาเชิงธุรกิจ อ่านรู้เรื่องทันทีว่าเกิดอะไร
- Audit Log และการเปลี่ยนข้อมูลสอดคล้องกันเสมอ เพราะอยู่ทรานแซกชันเดียว
- แก้หรือลบ log ไม่ได้ในระดับฐานข้อมูล

**ผลลบ / สิ่งที่ต้องเฝ้าระวัง**
- **ถ้าลืมเรียก `writeAudit()` ใน Server Action ตัวใหม่ จะไม่มี log** — ลดความเสี่ยงด้วย 2 มาตรการ: (ก) รวมการเขียนไว้ในฟังก์ชัน `features/audit/write.ts` ตัวเดียว (ข) ใส่รายการตรวจ "Server Action ใหม่ต้องเขียน Audit" ไว้ใน Design Review Checklist
- การแก้ข้อมูลด้วย SQL ตรงใน Supabase Dashboard จะไม่ถูกบันทึกใน `audit_logs` — ยอมรับได้ เพราะเป็นการเข้าถึงระดับผู้ดูแลระบบซึ่งมี log ของแพลตฟอร์มเองอยู่แล้ว
- `machine_status_history` ใช้ Trigger จึงไม่รู้ "เจตนา" — ชดเชยด้วยคอลัมน์ `source` ที่ระบุว่าการเปลี่ยนมาจาก manual, simulator หรือ plc

## Audit Log vs Application Log

| | Audit Log | Application Log |
|---|---|---|
| ตอบคำถาม | ใครทำอะไรกับข้อมูลธุรกิจ | ระบบพังเพราะอะไร |
| เก็บที่ | ตาราง `audit_logs` | Vercel Runtime Log |
| ผู้เข้าถึง | Admin ผ่านหน้าในระบบ | ผู้พัฒนา |
| ตัวอย่าง | `alarm.close` / entity `ALM-103` / actor `U22` | `closeAlarm failed: alarm_id=ALM-103, user=U22, reason=invalid_transition` |
