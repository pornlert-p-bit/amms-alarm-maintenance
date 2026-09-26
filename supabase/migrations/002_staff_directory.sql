-- =====================================================================
-- Migration 002 — staff_directory (26 ก.ย. 2569)
-- รันใน Supabase → SQL Editor หนึ่งครั้ง (schema.sql ฉบับเต็มรวมส่วนนี้ไว้แล้วสำหรับติดตั้งใหม่)
--
-- ปัญหา: RLS ของ profiles ให้ technician/viewer อ่านได้แค่แถวของตัวเอง
--        จึงแสดงชื่อ "ผู้ปิด Alarm" ที่เป็นคนอื่น หรือเลือก "ช่างผู้รับผิดชอบ" ในงานซ่อมไม่ได้
-- ทางแก้: view ที่เปิดให้ผู้ที่ Login แล้วอ่านได้เฉพาะ id, ชื่อ, role ของทุกคน
--         ข้อมูลอื่นในตาราง profiles ยังถูก RLS ปิดไว้ตามเดิม
--
-- ⚠️ ส่วนนี้ควรให้คน review ก่อนส่งมอบ:
--    view นี้ทำงานด้วยสิทธิ์ของเจ้าของ (security_invoker = false) จึง "ข้าม" RLS ของ profiles โดยตั้งใจ
--    ความปลอดภัยจึงขึ้นกับว่า view เลือกคอลัมน์มาแค่ 3 ตัวนี้ และให้สิทธิ์เฉพาะ authenticated
--    ถ้าวันหนึ่งเพิ่มคอลัมน์ที่อ่อนไหวใน profiles ห้ามเพิ่มลงใน view นี้
-- =====================================================================

create or replace view public.staff_directory
with (security_invoker = false) as
  select id, full_name, role
  from public.profiles;

comment on view public.staff_directory is
  'รายชื่อผู้ใช้สำหรับแสดงชื่อและเลือกช่าง — เปิดเฉพาะ id, full_name, role (ข้าม RLS ของ profiles โดยตั้งใจ)';

-- ห้ามผู้ที่ยังไม่ Login อ่าน, ให้อ่านได้เฉพาะผู้ที่ Login แล้ว (ADR-006)
revoke all on public.staff_directory from public, anon;
grant select on public.staff_directory to authenticated;
