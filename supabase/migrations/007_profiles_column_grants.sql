-- =====================================================================
-- Migration 007 — จำกัดคอลัมน์ของ profiles ที่ผู้ใช้แก้ได้ (26 ก.ย. 2569)
-- รันใน Supabase → SQL Editor หนึ่งครั้ง (schema.sql ฉบับเต็มรวมส่วนนี้ไว้แล้ว)
--
-- ปัญหา (บทเรียนเดียวกับ Alarm ใน migration 003): policy profiles_admin_update_others คุมแค่
--   "admin แก้แถวของคนอื่นได้" แต่ไม่ได้คุมว่าแก้ "คอลัมน์ไหน" — ถ้ายิง Data API ตรง
--   admin จะแก้ full_name, created_at หรือแม้แต่ id ของผู้ใช้อื่นได้ ทั้งที่หน้าเว็บให้แก้แค่ Role
-- ทางแก้: ให้สิทธิ์ UPDATE ระดับคอลัมน์ (column privilege) เฉพาะ role
--   RLS ยังทำงานเหมือนเดิม: ต้องเป็น admin และห้ามแก้แถวของตัวเอง (REQ-AUTH-05, REQ-AUTH-06)
--
-- ไม่กระทบ: trigger ที่แก้ updated_at (สิทธิ์คอลัมน์ตรวจเฉพาะคอลัมน์ที่ผู้ใช้สั่ง SET)
--           และ handle_new_user() ที่สร้างโปรไฟล์ (ทำงานด้วยสิทธิ์เจ้าของตาราง)
--
-- ⚠️ ส่วนนี้ควรให้คน review ก่อนส่งมอบ
-- =====================================================================

-- ถอนสิทธิ์ระดับตาราง (INSERT ไม่มี policy อยู่แล้ว — ถอนเพื่อให้สิทธิ์น้อยที่สุดตาม ADR-006)
revoke insert, update on public.profiles from authenticated;

-- ให้แก้ได้คอลัมน์เดียว
grant update (role) on public.profiles to authenticated;
