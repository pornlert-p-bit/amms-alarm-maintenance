-- =====================================================================
-- ข้อมูลสาธิต: Alarm ย้อนหลัง 29 วัน (60 รายการ, ปิดแล้วทั้งหมด) — 26 ก.ย. 2569
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
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-08-28 04:59+07', 52, 'ทำความสะอาดลูกกลิ้งขับที่มีคราบน้ำมัน', 'technician', 'technician', 'demo-seed-001'),
  ('M-001', 'E-105', 'Coolant level low — น้ำหล่อเย็นต่ำ', '2026-08-28 14:16+07', 23, 'เติมน้ำหล่อเย็นและตรวจรอยรั่ว', 'admin', 'admin', 'demo-seed-002'),
  ('M-005', 'H-201', 'Hydraulic pressure low — แรงดันไฮดรอลิกต่ำ', '2026-08-28 23:28+07', 52, 'เปลี่ยนซีลกระบอกสูบที่รั่ว', 'admin', 'technician', 'demo-seed-003'),
  ('M-005', 'H-201', 'Hydraulic pressure low — แรงดันไฮดรอลิกต่ำ', '2026-08-29 14:43+07', 104, 'เติมน้ำมันไฮดรอลิก', 'technician', 'technician', 'demo-seed-004'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-08-30 07:28+07', 108, 'ถ่วงสมดุลหัวจับชิ้นงานใหม่', 'admin', 'technician', 'demo-seed-005'),
  ('M-003', 'C-305', 'Jam sensor triggered — ชิ้นงานติดบนสายพาน', '2026-08-30 08:29+07', 14, 'นำชิ้นงานที่ติดออกและรีเซ็ตเซนเซอร์', 'technician', 'technician', 'demo-seed-006'),
  ('M-004', 'R-410', 'Wire feed fault — ป้อนลวดเชื่อมไม่สม่ำเสมอ', '2026-08-30 19:24+07', 37, 'ตัดลวดที่พันกันและตั้งแรงกดใหม่', 'technician', 'technician', 'demo-seed-007'),
  ('M-006', 'P-601', 'Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่', '2026-08-30 19:33+07', 81, 'เปลี่ยน thermocouple หัวซีล', 'technician', 'admin', 'demo-seed-008'),
  ('M-002', 'E-042', 'Motor overtemperature — มอเตอร์ร้อนเกิน', '2026-08-30 21:22+07', 98, 'ทำความสะอาดพัดลมระบายความร้อนมอเตอร์', 'technician', 'technician', 'demo-seed-009'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-08-30 21:49+07', 125, 'ถ่วงสมดุลหัวจับชิ้นงานใหม่', 'admin', 'technician', 'demo-seed-010'),
  ('M-002', 'I-210', 'Mold temperature deviation — อุณหภูมิแม่พิมพ์เบี่ยงเบน', '2026-08-30 23:31+07', 50, 'เปลี่ยนวาล์วควบคุมน้ำหล่อเย็น', 'technician', 'technician', 'demo-seed-011'),
  ('M-006', 'P-601', 'Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่', '2026-08-30 23:44+07', 56, 'ปรับค่า PID ของตัวควบคุมอุณหภูมิ', 'technician', 'admin', 'demo-seed-012'),
  ('M-002', 'I-210', 'Mold temperature deviation — อุณหภูมิแม่พิมพ์เบี่ยงเบน', '2026-08-31 02:15+07', 50, 'ล้างท่อน้ำหล่อเย็นแม่พิมพ์', 'admin', 'technician', 'demo-seed-013'),
  ('M-004', 'R-401', 'Torch collision detected — หัวเชื่อมชนชิ้นงาน', '2026-08-31 19:37+07', 118, 'ปรับจุดสอนของหุ่นยนต์ใหม่ (re-teach)', 'technician', 'technician', 'demo-seed-014'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-01 14:07+07', 43, 'ทำความสะอาดลูกกลิ้งขับที่มีคราบน้ำมัน', 'technician', 'technician', 'demo-seed-015'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-01 15:33+07', 23, 'ทำความสะอาดลูกกลิ้งขับที่มีคราบน้ำมัน', 'admin', 'technician', 'demo-seed-016'),
  ('M-006', 'P-601', 'Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่', '2026-09-02 09:38+07', 27, 'ปรับค่า PID ของตัวควบคุมอุณหภูมิ', 'technician', 'technician', 'demo-seed-017'),
  ('M-002', 'I-210', 'Mold temperature deviation — อุณหภูมิแม่พิมพ์เบี่ยงเบน', '2026-09-02 19:49+07', 33, 'เปลี่ยนวาล์วควบคุมน้ำหล่อเย็น', 'technician', 'technician', 'demo-seed-018'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-03 10:52+07', 21, 'ปรับความตึงสายพาน', 'admin', 'technician', 'demo-seed-019'),
  ('M-006', 'P-601', 'Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่', '2026-09-03 11:05+07', 68, 'เปลี่ยน thermocouple หัวซีล', 'technician', 'technician', 'demo-seed-020'),
  ('M-006', 'P-601', 'Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่', '2026-09-03 16:50+07', 69, 'ปรับค่า PID ของตัวควบคุมอุณหภูมิ', 'technician', 'technician', 'demo-seed-021'),
  ('M-003', 'C-305', 'Jam sensor triggered — ชิ้นงานติดบนสายพาน', '2026-09-05 04:40+07', 26, 'ปรับตำแหน่งราวกั้นชิ้นงาน', 'technician', 'technician', 'demo-seed-022'),
  ('M-005', 'H-220', 'Oil temperature high — น้ำมันไฮดรอลิกร้อนเกิน', '2026-09-06 11:56+07', 83, 'ทำความสะอาดแผงระบายความร้อนน้ำมัน', 'technician', 'technician', 'demo-seed-023'),
  ('M-005', 'H-201', 'Hydraulic pressure low — แรงดันไฮดรอลิกต่ำ', '2026-09-07 02:58+07', 50, 'ล้างไส้กรองน้ำมัน', 'technician', 'technician', 'demo-seed-024'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-07 09:25+07', 22, 'เปลี่ยนสายพานที่สึก', 'admin', 'technician', 'demo-seed-025'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-09-07 19:36+07', 149, 'ถ่วงสมดุลหัวจับชิ้นงานใหม่', 'technician', 'technician', 'demo-seed-026'),
  ('M-006', 'P-615', 'Film roll empty — ฟิล์มหมดม้วน', '2026-09-08 02:46+07', 5, 'เปลี่ยนม้วนฟิล์มใหม่', 'technician', 'admin', 'demo-seed-027'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-08 19:03+07', 57, 'ปรับความตึงสายพาน', 'technician', 'technician', 'demo-seed-028'),
  ('M-006', 'P-601', 'Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่', '2026-09-09 07:02+07', 48, 'ปรับค่า PID ของตัวควบคุมอุณหภูมิ', 'admin', 'technician', 'demo-seed-029'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-09 13:55+07', 64, 'ปรับความตึงสายพาน', 'technician', 'technician', 'demo-seed-030'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-09-09 16:40+07', 70, 'เปลี่ยนลูกปืนแกนหมุน', 'technician', 'admin', 'demo-seed-031'),
  ('M-004', 'R-401', 'Torch collision detected — หัวเชื่อมชนชิ้นงาน', '2026-09-09 21:01+07', 59, 'ปรับจุดสอนของหุ่นยนต์ใหม่ (re-teach)', 'technician', 'admin', 'demo-seed-032'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-09-10 07:18+07', 79, 'ขันแน่นฐานยึดมอเตอร์', 'technician', 'technician', 'demo-seed-033'),
  ('M-005', 'H-201', 'Hydraulic pressure low — แรงดันไฮดรอลิกต่ำ', '2026-09-11 10:11+07', 118, 'ล้างไส้กรองน้ำมัน', 'technician', 'admin', 'demo-seed-034'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-12 08:49+07', 45, 'ทำความสะอาดลูกกลิ้งขับที่มีคราบน้ำมัน', 'admin', 'technician', 'demo-seed-035'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-09-13 02:10+07', 74, 'เปลี่ยนลูกปืนแกนหมุน', 'admin', 'admin', 'demo-seed-036'),
  ('M-004', 'R-410', 'Wire feed fault — ป้อนลวดเชื่อมไม่สม่ำเสมอ', '2026-09-13 11:34+07', 44, 'ตัดลวดที่พันกันและตั้งแรงกดใหม่', 'technician', 'technician', 'demo-seed-037'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-14 02:35+07', 26, 'เปลี่ยนสายพานที่สึก', 'technician', 'technician', 'demo-seed-038'),
  ('M-005', 'H-201', 'Hydraulic pressure low — แรงดันไฮดรอลิกต่ำ', '2026-09-15 11:23+07', 147, 'เปลี่ยนซีลกระบอกสูบที่รั่ว', 'technician', 'technician', 'demo-seed-039'),
  ('M-002', 'E-042', 'Motor overtemperature — มอเตอร์ร้อนเกิน', '2026-09-15 14:45+07', 85, 'ตรวจกระแสมอเตอร์และปรับรอบการทำงาน', 'technician', 'technician', 'demo-seed-040'),
  ('M-005', 'H-201', 'Hydraulic pressure low — แรงดันไฮดรอลิกต่ำ', '2026-09-16 02:14+07', 103, 'ล้างไส้กรองน้ำมัน', 'technician', 'technician', 'demo-seed-041'),
  ('M-002', 'E-042', 'Motor overtemperature — มอเตอร์ร้อนเกิน', '2026-09-16 07:56+07', 117, 'ทำความสะอาดพัดลมระบายความร้อนมอเตอร์', 'admin', 'admin', 'demo-seed-042'),
  ('M-001', 'E-105', 'Coolant level low — น้ำหล่อเย็นต่ำ', '2026-09-16 10:59+07', 12, 'เติมน้ำหล่อเย็นและตรวจรอยรั่ว', 'technician', 'admin', 'demo-seed-043'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-09-16 13:11+07', 103, 'เปลี่ยนลูกปืนแกนหมุน', 'admin', 'admin', 'demo-seed-044'),
  ('M-004', 'R-410', 'Wire feed fault — ป้อนลวดเชื่อมไม่สม่ำเสมอ', '2026-09-16 15:37+07', 33, 'เปลี่ยนลูกกลิ้งป้อนลวด', 'technician', 'technician', 'demo-seed-045'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-18 15:53+07', 21, 'เปลี่ยนสายพานที่สึก', 'technician', 'technician', 'demo-seed-046'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-09-20 07:48+07', 170, 'เปลี่ยนลูกปืนแกนหมุน', 'technician', 'technician', 'demo-seed-047'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-09-20 16:55+07', 142, 'ขันแน่นฐานยึดมอเตอร์', 'technician', 'admin', 'demo-seed-048'),
  ('M-006', 'P-601', 'Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่', '2026-09-21 04:56+07', 65, 'ปรับค่า PID ของตัวควบคุมอุณหภูมิ', 'technician', 'technician', 'demo-seed-049'),
  ('M-003', 'C-305', 'Jam sensor triggered — ชิ้นงานติดบนสายพาน', '2026-09-21 10:58+07', 22, 'ปรับตำแหน่งราวกั้นชิ้นงาน', 'admin', 'technician', 'demo-seed-050'),
  ('M-006', 'P-601', 'Seal jaw temperature unstable — อุณหภูมิหัวซีลไม่คงที่', '2026-09-21 23:01+07', 35, 'เปลี่ยน thermocouple หัวซีล', 'technician', 'technician', 'demo-seed-051'),
  ('M-003', 'C-305', 'Jam sensor triggered — ชิ้นงานติดบนสายพาน', '2026-09-21 23:21+07', 10, 'ปรับตำแหน่งราวกั้นชิ้นงาน', 'technician', 'technician', 'demo-seed-052'),
  ('M-003', 'C-305', 'Jam sensor triggered — ชิ้นงานติดบนสายพาน', '2026-09-22 04:00+07', 24, 'ปรับตำแหน่งราวกั้นชิ้นงาน', 'technician', 'admin', 'demo-seed-053'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-22 07:39+07', 30, 'ปรับความตึงสายพาน', 'technician', 'technician', 'demo-seed-054'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-09-22 10:28+07', 167, 'ขันแน่นฐานยึดมอเตอร์', 'technician', 'technician', 'demo-seed-055'),
  ('M-002', 'E-042', 'Motor overtemperature — มอเตอร์ร้อนเกิน', '2026-09-22 19:53+07', 114, 'ตรวจกระแสมอเตอร์และปรับรอบการทำงาน', 'technician', 'technician', 'demo-seed-056'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-24 14:13+07', 50, 'ทำความสะอาดลูกกลิ้งขับที่มีคราบน้ำมัน', 'technician', 'technician', 'demo-seed-057'),
  ('M-001', 'E-101', 'Spindle vibration high — แกนหมุนสั่นเกินค่ามาตรฐาน', '2026-09-24 16:42+07', 57, 'ถ่วงสมดุลหัวจับชิ้นงานใหม่', 'technician', 'technician', 'demo-seed-058'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-24 19:35+07', 59, 'ทำความสะอาดลูกกลิ้งขับที่มีคราบน้ำมัน', 'technician', 'admin', 'demo-seed-059'),
  ('M-003', 'C-301', 'Conveyor belt slip — สายพานลื่น ความเร็วตก', '2026-09-25 09:20+07', 52, 'เปลี่ยนสายพานที่สึก', 'technician', 'technician', 'demo-seed-060')
) as v(machine_code, code, descr, occ, mins, cause, creator_role, closer_role, event_id)
join public.machines m on m.machine_id = v.machine_code and m.deleted_at is null
on conflict (event_id) do nothing;

alter table public.alarms enable trigger trg_alarms_enforce_insert;

commit;

-- ตรวจผล: ควรได้ 60 แถว และ trigger ต้องกลับมาเปิด (tgenabled = 'O')
select count(*) as demo_alarms from public.alarms where event_id like 'demo-seed-%';
select tgname, tgenabled from pg_trigger where tgname = 'trg_alarms_enforce_insert';
