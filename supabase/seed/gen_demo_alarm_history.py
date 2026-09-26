"""สร้างไฟล์ supabase/seed/demo_alarm_history.sql — Alarm ย้อนหลัง 29 วันสำหรับสาธิต

ใช้ random seed คงที่ รันกี่ครั้งก็ได้ไฟล์เดิม — ใช้แค่ Python มาตรฐาน ไม่ต้องติดตั้งอะไรเพิ่ม
รันจากโฟลเดอร์ amms:  python supabase/seed/gen_demo_alarm_history.py
ถ้าจะเปลี่ยนวันอ้างอิง ให้แก้ TODAY แล้วรันใหม่ (ข้อมูลจะย้อนหลังจากวันนั้น 1–29 วัน)
"""
import random
from datetime import date, datetime, timedelta

rng = random.Random(2569)
TODAY = date(2026, 9, 26)

# (machine, code, description, จำนวนครั้ง, ช่วงเวลาซ่อม (นาที), สาเหตุตัวอย่าง)
CODES = [
    ("M-003", "C-301", "Conveyor belt slip — สายพานลื่น ความเร็วตก", 14, (20, 70),
     ["ปรับความตึงสายพาน", "ทำความสะอาดลูกกลิ้งขับที่มีคราบน้ำมัน", "เปลี่ยนสายพานที่สึก"]),
    ("M-001", "E-101", "Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน", 11, (45, 180),
     ["ถ่วงสมดุลหัวจับชิ้นงานใหม่", "เปลี่ยนลูกปืนแกนหมุน", "ขันแน่นฐานยึดมอเตอร์"]),
    ("M-006", "P-601", "Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่", 8, (25, 90),
     ["เปลี่ยน thermocouple หัวซีล", "ปรับค่า PID ของตัวควบคุมอุณหภูมิ", "ขันสายไฟฮีตเตอร์ที่หลวม"]),
    ("M-005", "H-201", "Hydraulic pressure low — แรงดันไฮดรอลิกต่ำ", 6, (40, 150),
     ["เติมน้ำมันไฮดรอลิก", "เปลี่ยนซีลกระบอกสูบที่รั่ว", "ล้างไส้กรองน้ำมัน"]),
    ("M-003", "C-305", "Jam sensor triggered — ชิ้นงานติดบนสายพาน", 5, (10, 30),
     ["นำชิ้นงานที่ติดออกและรีเซ็ตเซนเซอร์", "ปรับตำแหน่งราวกั้นชิ้นงาน"]),
    ("M-002", "E-042", "Motor overtemperature — มอเตอร์ร้อนเกิน", 4, (30, 120),
     ["ทำความสะอาดพัดลมระบายความร้อนมอเตอร์", "ตรวจกระแสมอเตอร์และปรับรอบการทำงาน"]),
    ("M-004", "R-410", "Wire feed fault — ป้อนลวดเชื่อมไม่สม่ำเสมอ", 3, (20, 60),
     ["เปลี่ยนลูกกลิ้งป้อนลวด", "ตัดลวดที่พันกันและตั้งแรงกดใหม่"]),
    ("M-002", "I-210", "Mold temperature deviation — อุณหภูมิแม่พิมพ์เบี่ยงเบน", 3, (30, 90),
     ["ล้างท่อน้ำหล่อเย็นแม่พิมพ์", "เปลี่ยนวาล์วควบคุมน้ำหล่อเย็น"]),
    ("M-001", "E-105", "Coolant level low — น้ำหล่อเย็นต่ำ", 2, (10, 25),
     ["เติมน้ำหล่อเย็นและตรวจรอยรั่ว"]),
    ("M-004", "R-401", "Torch collision detected — หัวเชื่อมชนชิ้นงาน", 2, (40, 120),
     ["ปรับจุดสอนของหุ่นยนต์ใหม่ (re-teach)", "เปลี่ยนหัวเชื่อมที่งอ"]),
    ("M-005", "H-220", "Oil temperature high — น้ำมันไฮดรอลิกร้อนเกิน", 1, (60, 180),
     ["ทำความสะอาดแผงระบายความร้อนน้ำมัน"]),
    ("M-006", "P-615", "Film roll empty — ฟิล์มหมดม้วน", 1, (5, 15),
     ["เปลี่ยนม้วนฟิล์มใหม่"]),
]

rows = []
for machine, code, desc, n, (lo, hi), causes in CODES:
    for _ in range(n):
        days_ago = rng.randint(1, 29)                 # ไม่แตะวันนี้ (มีข้อมูลจริงอยู่แล้ว)
        hour = rng.choice([7, 8, 9, 10, 11, 13, 14, 15, 16, 19, 21, 23, 2, 4])   # กระจายทั้ง 3 กะ
        minute = rng.randint(0, 59)
        d = TODAY - timedelta(days=days_ago)
        occ = datetime(d.year, d.month, d.day, hour, minute)
        mins = rng.randint(lo, hi)
        cause = rng.choice(causes)
        creator = "technician" if rng.random() < 0.8 else "admin"
        closer = "technician" if rng.random() < 0.75 else "admin"
        rows.append((occ, machine, code, desc, mins, cause, creator, closer))

rows.sort()
lines = []
for i, (occ, machine, code, desc, mins, cause, creator, closer) in enumerate(rows, 1):
    q = lambda s: "'" + s.replace("'", "''") + "'"
    lines.append(
        f"  ({q(machine)}, {q(code)}, {q(desc)}, {q(occ.strftime('%Y-%m-%d %H:%M') + '+07')}, "
        f"{mins}, {q(cause)}, {q(creator)}, {q(closer)}, {q(f'demo-seed-{i:03d}')})"
    )

values_block = ",\n".join(lines)
sql = f"""-- =====================================================================
-- ข้อมูลสาธิต: Alarm ย้อนหลัง 29 วัน ({len(rows)} รายการ, ปิดแล้วทั้งหมด) — 26 ก.ย. 2569
-- ใช้ให้กราฟหน้าภาพรวม (รายวัน / Pareto / MTTR) มีข้อมูลสมจริงสำหรับวิดีโอนำเสนอ
-- ไฟล์นี้สร้างจาก supabase/seed/gen_demo_alarm_history.py (random seed คงที่) — รันซ้ำได้ ไม่เพิ่มซ้ำ (on conflict ... do nothing)
--
-- รันใน Supabase → SQL Editor (สิทธิ์ postgres) หลังรัน schema.sql / migration ครบแล้ว
-- ไม่มีข้อมูลคนจริง: ผู้บันทึก/ผู้ปิดเลือกจากบัญชีทดสอบตาม role
--
-- ทำไมต้องปิด trigger ชั่วคราว:
--   trg_alarms_enforce_insert (migration 004) บังคับให้ Alarm ใหม่เริ่มที่ Open เสมอ
--   และการปิดผ่าน UPDATE จะใช้เวลาปัจจุบันเป็นเวลาปิด (migration 003) — ซึ่งถูกต้องสำหรับการใช้งานจริง
--   แต่ทำให้ใส่ "ประวัติที่ปิดไปแล้วในอดีต" ไม่ได้ จึงปิด trigger เฉพาะใน transaction นี้
--   ถ้ามีคำสั่งใดล้มเหลว ทุกอย่างรวมถึงการปิด trigger จะถูกย้อนกลับเอง (DDL ของ PostgreSQL อยู่ใน transaction ได้)
--
-- ลบข้อมูลสาธิตทั้งหมด:
--   delete from alarms where event_id like 'demo-seed-%' returning alarm_code;
-- =====================================================================

begin;

alter table public.alarms disable trigger trg_alarms_enforce_insert;

insert into public.alarms
  (machine_id, alarm_code, description, occurred_at, status, cause, created_by, closed_by, closed_at, event_id)
select
  m.id, v.code, v.descr, v.occ::timestamptz, 'Closed', v.cause,
  (select p.id from public.profiles p where p.role = v.creator_role::user_role order by p.created_at limit 1),
  (select p.id from public.profiles p where p.role = v.closer_role::user_role order by p.created_at limit 1),
  v.occ::timestamptz + make_interval(mins => v.mins),
  v.event_id
from (values
{values_block}
) as v(machine_code, code, descr, occ, mins, cause, creator_role, closer_role, event_id)
join public.machines m on m.machine_id = v.machine_code and m.deleted_at is null
on conflict (event_id) do nothing;

alter table public.alarms enable trigger trg_alarms_enforce_insert;

commit;

-- ตรวจผล: ควรได้ {len(rows)} แถว และ trigger ต้องกลับมาเปิด (tgenabled = 'O')
select count(*) as demo_alarms from public.alarms where event_id like 'demo-seed-%';
select tgname, tgenabled from pg_trigger where tgname = 'trg_alarms_enforce_insert';
"""
open("supabase/seed/demo_alarm_history.sql", "w", encoding="utf-8", newline="\n").write(sql)

# สรุปเพื่อตรวจ
from collections import Counter
print("rows", len(rows))
print(Counter(r[2] for r in rows).most_common())
last7 = [r for r in rows if (TODAY - r[0].date()).days <= 6]
print("last 7 days:", len(last7), "range", rows[0][0], rows[-1][0])
print("avg repair", sum(r[4] for r in rows) / len(rows))
