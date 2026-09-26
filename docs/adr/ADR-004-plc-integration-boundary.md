# ADR-004 — กำหนด Integration Boundary ของ PLC ไว้ล่วงหน้า แต่ v1 ใช้ Simulator

| | |
|---|---|
| **สถานะ** | Accepted |
| **วันที่** | 21 กันยายน 2569 |
| **เกี่ยวข้องกับ** | [ADR-001](ADR-001-modular-monolith.md) · REQ-BON-09 · FM-06 · FM-07 · TB-6 |

## Context

- โจทย์ระบุ Out of Scope ว่า v1 **ไม่เชื่อม PLC จริง** แต่บทเรียนตั้ง Challenge ไว้ว่า *"สมมติว่า v2 ต้องรับ Machine Status จาก PLC Gateway ทุก 5 วินาที ให้ปรับ Context/Container Design และอธิบายว่าอะไรต้องเปลี่ยน อะไรไม่ควรเปลี่ยน"*
- ระบบ Automation มีข้อจำกัดที่ต่างจาก Web App ทั่วไป: protocol เป็น OPC UA / Modbus / MQTT ไม่ใช่ HTTP, รอบเวลาถี่กว่า, และ network ฝั่ง OT แยกจาก IT
- ถ้าไม่วางขอบเขตไว้ตั้งแต่ v1 การเพิ่ม PLC ใน v2 จะกลายเป็นการรื้อ Machine, Alarm และ Dashboard พร้อมกัน

## Decision

1. สร้าง **Module `integration`** เป็นจุดเดียวที่รับข้อมูลจากฝั่ง OT ตั้งแต่ v1
2. v1 มี `simulator.ts` ให้ Admin กดเปลี่ยนสถานะเครื่องผ่านหน้า `/simulator` ซึ่ง **เดินผ่านเส้นทางเดียวกับที่ PLC จริงจะใช้** ไม่ใช่แก้ตารางตรง
3. กำหนด **Contract ของ endpoint ไว้แล้วใน v1** แม้ยังไม่มีผู้เรียก:

```
POST /api/plc/status
Headers: X-Signature = HMAC-SHA256(body, PLC_WEBHOOK_SECRET)
Body:    { event_id, machine_id, status, occurred_at, alarm_code?, description? }
```

4. เตรียมโครงสร้างข้อมูลรองรับไว้แล้วตั้งแต่ v1 เพื่อให้ v2 **ไม่ต้องแก้ตาราง**:
   - `machines.last_seen_at` — ให้ UI แยกข้อมูลสดจากข้อมูลล้าสมัยได้
   - `alarms.event_id` (UNIQUE) — Idempotency Key กัน Alarm ซ้ำเมื่อ Gateway retry
   - `machine_status_history.source` (enum `manual | simulator | plc`) — รู้ว่าสถานะมาจากไหน
5. **Source of Truth ของ Machine Live Status ย้ายไปเป็น PLC ใน v2** — เมื่อถึงตอนนั้นฟอร์มทั่วไปต้องแก้สถานะไม่ได้ (BR-09) แต่ตาราง `machines.status` ยังเป็นที่เก็บค่าที่อ่านล่าสุดเหมือนเดิม
6. **ไม่** ใช้ Realtime Subscription และ **ไม่** ให้ Browser คุยกับ PLC/SCADA ตรงเด็ดขาด

## อะไรเปลี่ยน / อะไรไม่ควรเปลี่ยน ใน v2

| | รายการ |
|---|---|
| **ต้องเปลี่ยน** | เพิ่ม Gateway ฝั่ง OT (แปลง protocol, buffer, retry, batch) · เปิดใช้ `/api/plc/status` จริง · ตรวจ signature และ allow-list machine · UI แสดงป้าย "ข้อมูลล้าสมัย" จาก `last_seen_at` · ปิดการแก้สถานะผ่านฟอร์มทั่วไป |
| **ไม่ควรเปลี่ยน** | Schema ของ `machines`, `alarms`, `maintenance_records` · Business Rule ของ Alarm/Maintenance · RLS Policy · Server Action ของ Alarm/Maintenance · Query และ Component ของ Dashboard |
| **Failure Mode ใหม่ที่เพิ่มขึ้น** | Gateway offline → สถานะค้างเป็นข้อมูลเก่า (FM-06) · Event ซ้ำหลัง retry (FM-07) · Clock skew ระหว่าง PLC กับ server · Event มาถี่กว่าที่ระบบเขียนทัน (ต้อง batch/throttle) · อุปกรณ์ปลอมยิงข้อมูลเข้า (TB-6) |

## Alternatives ที่พิจารณา

| ทางเลือก | ข้อดี | เหตุที่ไม่เลือก |
|---|---|---|
| ไม่คิดเรื่อง PLC เลยใน v1 | งานน้อยที่สุด | v2 จะต้องแก้ตาราง + Business Rule + UI พร้อมกัน ซึ่งเป็นสิ่งที่ Change Impact Analysis เตือนไว้ |
| เชื่อม PLC จริงตั้งแต่ v1 | สมจริงที่สุด | อยู่นอก Scope, ไม่มีอุปกรณ์จริง และเสี่ยงส่งงานไม่ทัน |
| ให้ Browser poll PLC โดยตรง | ไม่ต้องทำ Gateway | protocol, credential และความพร้อมใช้งานของฝั่ง OT ต่างกับ Browser สิ้นเชิง — เป็นสิ่งที่บทเรียนห้ามชัดเจน |
| ใช้ Supabase Realtime ตั้งแต่ v1 | UX สด | Dashboard สำหรับคนดูอัปเดตทุก 1–5 วินาทีก็พอ ไม่ต้องระดับ millisecond และ Realtime เพิ่มเรื่อง connection/ordering ที่ไม่คุ้มในขั้นนี้ |

## Consequences

**ผลบวก**
- Change Request "รับ Machine Status จาก PLC ทุก 5 วินาที" กลายเป็นงานระดับ **ปานกลางที่แตะ Module เดียว** ไม่ใช่การรื้อระบบ
- Simulator ใน v1 ทำให้ทดสอบ workflow แบบ end-to-end ได้จริงโดยไม่มีอุปกรณ์
- แยก network boundary ระหว่าง OT และ IT ไว้ในแบบตั้งแต่ต้น

**ผลลบ / สิ่งที่ต้องเฝ้าระวัง**
- มีโค้ดและคอลัมน์ที่ยังไม่มีใครใช้ใน v1 (`event_id`, `last_seen_at`) — ต้องอธิบายในเอกสารว่ามีไว้ทำไม ไม่ใช่เศษที่ลืมลบ
- Simulator อาจทำให้เข้าใจผิดว่าระบบเชื่อม PLC จริงแล้ว → ต้องระบุชัดใน README และบนหน้า `/simulator` ว่าเป็น Mock

**หมายเหตุ:** สิ่งที่ยังต้องอยู่ใน PLC/Safety Controller ไม่ใช่ Web Application คือ Control Loop และ Safety Interlock ซึ่งต้อง deterministic และต้องไม่พึ่ง internet
