# ADR-006 — ให้สิทธิ์ฐานข้อมูลเฉพาะ `authenticated` และใช้ RLS แบบ Default Deny

| | |
|---|---|
| **สถานะ** | Accepted |
| **วันที่** | 21 กันยายน 2569 |
| **เกี่ยวข้องกับ** | [ADR-002](ADR-002-server-mediated-mutations.md) · REQ-SEC-04 · REQ-SEC-05 · TB-5 |

## Context

ใน PostgreSQL การเข้าถึงตารางถูกควบคุม **สองชั้นที่ทำงานคนละหน้าที่**:

1. **GRANT / Table Privilege** — บอกว่า database role นั้น *มีสิทธิ์แตะตารางนี้หรือไม่*
2. **RLS Policy** — บอกว่า *แถวไหน* ที่ role นั้นเห็นหรือแก้ได้

Supabase มี database role สองตัวที่มาจาก API คือ `anon` (ยังไม่ Login) และ `authenticated` (Login แล้ว) ตัวอย่าง schema ที่พบทั่วไปมักเขียนแบบนี้เพื่อให้ Data API ทำงาน:

```sql
grant select, insert, update, delete on all tables in schema public
  to anon, authenticated, service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to anon, authenticated, service_role;
```

ซึ่งทำงานได้ และดูปลอดภัยเพราะ RLS Policy ทุกข้อเช็ค `auth.uid() is not null` อยู่แล้ว **แต่มีความเสี่ยงแฝงสองข้อ**:

- **ปัญหาตารางใหม่:** `alter default privileges` ทำให้ตารางที่สร้างในอนาคตได้สิทธิ์ DML ให้ `anon` อัตโนมัติ และ PostgreSQL **ไม่ได้เปิด RLS ให้ตารางใหม่โดยปริยาย** — ถ้าวันหนึ่งเพิ่มตารางแล้วลืมสั่ง `enable row level security` ตารางนั้นจะเปิดให้คนที่ยังไม่ Login อ่านและเขียนได้ทันทีผ่าน Data API
- **ขัดหลัก Least Privilege:** ระบบนี้ไม่มีหน้าหรือข้อมูลใดที่ผู้ไม่ Login ต้องเข้าถึงเลย การให้สิทธิ์ `anon` จึงเป็นสิทธิ์ที่ไม่มีใครใช้แต่เปิดพื้นที่ความเสี่ยงไว้

## Decision

1. **ถอนสิทธิ์ `anon` ออกจาก schema `public` ทั้งหมด** รวมถึง `usage` บน schema และ default privileges
2. **Grant เฉพาะ `authenticated`** และระบุชื่อตารางตรง ๆ ไม่ใช้ `all tables in schema public` เพื่อให้ตารางใหม่ต้อง grant อย่างตั้งใจ
3. **ไม่ grant `DELETE` ให้ใครเลย** — ระบบใช้ Soft Delete และตาราง log เป็น append-only จึงไม่มี use case ที่ต้องลบแถว
4. **RLS เป็น Default Deny** — ไม่เขียน Policy ให้ operation ใด แปลว่า operation นั้นทำไม่ได้ ไม่ต้องเขียน Policy ปฏิเสธ
5. `service_role` ยังได้สิทธิ์เต็ม (bypass RLS ตามธรรมชาติ) แต่ Key ของมันอยู่ฝั่ง server เท่านั้นและใช้เฉพาะงาน admin ที่จำเป็น
6. ฟังก์ชัน `current_role_name()` ซึ่งเป็น `security definer` ถูก `revoke execute` จาก `public` และ `anon` และตั้ง `set search_path = public` เพื่อกัน search_path hijacking

```sql
revoke all on all tables in schema public from anon;
revoke usage on schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

grant usage on schema public to authenticated, service_role;
grant select, insert, update on
  profiles, machines, alarms, maintenance_records,
  machine_status_history, audit_logs
  to authenticated;
```

## Alternatives ที่พิจารณา

| ทางเลือก | ข้อดี | เหตุที่ไม่เลือก |
|---|---|---|
| Grant ให้ `anon, authenticated` ทั้งหมดตามแบบทั่วไป | ตั้งค่าครั้งเดียวจบ ไม่ต้องแก้ทุกครั้งที่เพิ่มตาราง | ตารางใหม่ที่ลืมเปิด RLS จะรั่วทันที และให้สิทธิ์ที่ไม่มีใครใช้ |
| พึ่ง RLS อย่างเดียวโดยไม่แตะ GRANT | เรียบง่าย เข้ากับตัวอย่างในเอกสาร Supabase | ทำให้เหลือชั้นป้องกันเพียงชั้นเดียว ขัดกับ NFR-SEC-01 ที่ต้องการอย่างน้อย 2 ชั้น |
| ปิด Data API ทั้งหมด ใช้ connection string ฝั่ง server เท่านั้น | ควบคุมได้สูงสุด | เสีย Supabase Auth flow ฝั่ง Client และเกินความจำเป็นของระบบขนาดนี้ |

## Consequences

**ผลบวก**
- ตารางใหม่ที่ลืมเปิด RLS **ไม่รั่ว** สู่ผู้ที่ยังไม่ Login เพราะไม่มีสิทธิ์ระดับตารางตั้งแต่ต้น — เป็นการป้องกันแบบ fail-safe
- สอดคล้องกับ Principle of Least Privilege: ไม่มีสิทธิ์ใดที่ให้ไปแล้วไม่มีใครใช้
- ได้ชั้นป้องกัน 2 ชั้นจริงในระดับฐานข้อมูล (GRANT + RLS) ตาม NFR-SEC-01

**ผลลบ / สิ่งที่ต้องเฝ้าระวัง**
- **ทุกครั้งที่เพิ่มตารางใหม่ต้องสั่ง `grant` และ `enable row level security` เอง** — ถ้าลืม ระบบจะพังแบบเห็นได้ทันที (ผู้ใช้ที่ Login แล้วอ่านไม่ได้) ซึ่งดีกว่าพังแบบเงียบที่ข้อมูลรั่ว
- ถ้าอนาคตต้องมีหน้า public เช่นหน้าสถานะสาธารณะ ต้อง grant ให้ `anon` เฉพาะตาราง/view นั้นอย่างตั้งใจ พร้อม RLS Policy ที่จำกัดคอลัมน์ — และควรเปิด ADR ใหม่มา supersede ข้อนี้

**วิธีตรวจว่าใช้ได้จริง**

```sql
-- ต้องคืนค่า 0 แถว
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon' and table_schema = 'public';

-- ทุกตารางต้องมี rowsecurity = true
select tablename, rowsecurity from pg_tables where schemaname = 'public';
```
