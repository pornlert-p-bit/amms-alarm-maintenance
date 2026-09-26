# RUNBOOK — คู่มือดูแลระบบ AMMS

คู่มือนี้เขียนให้คนที่ต้องดูแลระบบต่อ (รวมถึงโปรแกรมเมอร์ที่มาช่วยตอนฉุกเฉิน) อ่านแล้วทำตามได้ทันที
อัปเดตล่าสุด: 26 ก.ย. 2569 — ครอบคลุมส่วน Login/สิทธิ์ และการ deploy (Module งานหลักจะเพิ่มตามที่พัฒนา)

---

## 1. ระบบมีส่วนไหนบ้าง

```
Browser ──► Vercel (Next.js 16) ──► Supabase (PostgreSQL + Auth)
             │  proxy.ts            │  ตาราง + RLS + Trigger
             │  หน้าเว็บ + Server Action
```

| ส่วน | อยู่ที่ไหน | หน้าที่ |
|---|---|---|
| หน้าเว็บ + โค้ดฝั่ง server | Vercel (deploy จาก GitHub อัตโนมัติ) | แสดงผล, ตรวจสิทธิ์, บันทึกข้อมูล |
| ฐานข้อมูล + ระบบ Login | Supabase | เก็บข้อมูล, ยืนยันตัวตน, บังคับสิทธิ์ด้วย RLS |
| ซอร์สโค้ด + CI | GitHub | เก็บโค้ด, ตรวจ build/lint/test ทุก push |

### ไฟล์และโฟลเดอร์สำคัญ

| Path | ทำอะไร |
|---|---|
| `proxy.ts` | **ด่านที่ 1** — ต่ออายุ session และส่งคนที่ยังไม่ Login ไปหน้า `/login` |
| `lib/auth/dal.ts` | **ด่านที่ 2** — `requireUser` / `requireStaff` / `requireAdmin` ที่ทุกหน้าต้องเรียก |
| `supabase/schema.sql` | **ด่านที่ 3** — โครงสร้างฐานข้อมูล, RLS Policy, Trigger, สิทธิ์ (GRANT) |
| `lib/auth/roles.ts` | กฎ Role, เมนูตาม Role, การกัน Open Redirect (ฟังก์ชันบริสุทธิ์ มี unit test) |
| `lib/auth/actions.ts` | Server Action ของ Login / Logout |
| `lib/supabase/server.ts` | สร้างตัวเชื่อม Supabase ฝั่ง server (ทำงานในนามผู้ใช้ → RLS ตรวจได้) |
| `lib/supabase/proxy.ts` | ตัวช่วยต่ออายุ session ที่ `proxy.ts` เรียกใช้ |
| `lib/env.ts` | อ่านค่า env และแจ้ง error ชัด ๆ ถ้าขาด |
| `app/globals.css` | ชุดสี (token) และฟอนต์ของธีม Station terminal — แก้สีทั้งระบบที่นี่ที่เดียว |
| `components/station/` | ชิ้นส่วนหน้าจอ: `group-box` (กรอบมีหัวข้อ), `status-pill` (ป้ายสถานะ), `shift-clock` (กะ + นาฬิกา), `top-nav` (เมนูบน), `page-title` |
| `lib/shift.ts` | คำนวณกะเช้า/บ่าย/ดึกจากชั่วโมง (มี unit test) |
| `app/(auth)/login/` | หน้า Login |
| `app/(app)/` | หน้าหลักทั้งหมดที่ต้อง Login (dashboard, machines, alarms, maintenance, users) |
| `app/forbidden/` | หน้าแจ้ง "ไม่มีสิทธิ์" |
| `tests/` | Unit test (รันด้วย `npm test`) |
| `.github/workflows/ci.yml` | CI: Install → Build → Lint → Test |
| `docs/` | เอกสารออกแบบ (Requirement, Design, Architecture, ADR) และคู่มือนี้ |

---

## 2. ตั้งค่าระบบครั้งแรก

### 2.1 Supabase
1. สร้าง Project ใหม่ที่ supabase.com (Region: Singapore)
2. เมนู **SQL Editor** → วางเนื้อหาไฟล์ `supabase/schema.sql` ทั้งไฟล์ → **Run** (ต้องขึ้น Success)
3. เมนู **Authentication → Sign In / Providers** → ปิด **Allow new users to sign up**
   (ระบบนี้ให้ผู้ดูแลสร้างบัญชีให้เท่านั้น — กันคนนอกสมัครเข้ามาเอง)

### 2.2 สร้างบัญชีผู้ใช้และกำหนด Role
1. **Authentication → Users → Add user → Create new user** ใส่อีเมล + รหัสผ่าน และ **ติ๊ก Auto Confirm User**
2. ระบบจะสร้างโปรไฟล์ให้อัตโนมัติด้วย Role `viewer` (สิทธิ์ต่ำสุด — ตั้งใจให้เป็นแบบนี้)
3. ยกระดับ Role ใน **SQL Editor** (แก้อีเมลให้ตรง):
   ```sql
   update profiles set role = 'admin'
    where id = (select id from auth.users where email = 'admin@amms-demo.test');
   update profiles set role = 'technician'
    where id = (select id from auth.users where email = 'tech@amms-demo.test');
   ```
4. บัญชีทดสอบที่ใช้ในโปรเจกต์นี้ (เก็บรหัสผ่านในที่ปลอดภัย **ห้ามเขียนรหัสผ่านลงไฟล์ใน repo**)

   | Role | อีเมล |
   |---|---|
   | admin | `admin@amms-demo.test` |
   | technician | `tech@amms-demo.test` |
   | viewer | `viewer@amms-demo.test` |

### 2.3 ค่า Environment
คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่าจาก **Supabase → Project Settings → API Keys**

| ตัวแปร | ค่า | ใส่ที่ไหน |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | `.env.local` และ Vercel |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (ชื่อเดิม anon key) | `.env.local` และ Vercel |
| `SUPABASE_SECRET_KEY` | **v1 ยังไม่ใช้ — อย่าใส่** | — |

> ⚠️ Secret key (ชื่อเดิม service_role) ข้ามสิทธิ์ทุกอย่างในฐานข้อมูล ระบบ v1 ออกแบบให้ไม่ต้องใช้เลย
> ถ้าวันหนึ่งจำเป็น: ใส่เฉพาะฝั่ง server, ห้ามตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_`, ห้าม commit

### 2.4 รันในเครื่อง
```bash
npm ci          # ติดตั้งตาม package-lock.json
npm run dev     # เปิด http://localhost:3000
```

### 2.5 Deploy บน Vercel
1. vercel.com → **Add New → Project** → Import repository จาก GitHub
2. **Environment Variables** ใส่ 2 ค่าตามตาราง 2.3 (เลือกทั้ง Production และ Preview)
3. **Deploy** — หลังจากนี้ทุกครั้งที่ push เข้า `main` Vercel จะ deploy ใหม่ให้อัตโนมัติ

---

## 3. ค่า Config สำคัญอยู่ที่ไหน

| เรื่อง | ที่อยู่ |
|---|---|
| URL / Key ของ Supabase | `.env.local` (เครื่องตัวเอง), Vercel → Settings → Environment Variables (ระบบจริง) |
| Role ที่มีในระบบ | enum `user_role` ใน `supabase/schema.sql` **และ** `ROLES` ใน `lib/auth/roles.ts` (ต้องตรงกัน) |
| หน้าที่ต้องเป็น Admin | `ADMIN_ONLY_PATHS` ใน `lib/auth/roles.ts` + `requireAdmin()` ในหน้านั้น |
| หน้าที่เข้าได้โดยไม่ Login | `PUBLIC_PATHS` ใน `lib/auth/roles.ts` |
| เมนูด้านบน (ชื่อ/ลำดับ) | `NAV_ITEMS` ใน `lib/auth/roles.ts` |
| สีและฟอนต์ของหน้าจอ | `@theme` ใน `app/globals.css` (มีค่าความต่างสี WCAG กำกับไว้) — เหตุผลการออกแบบดู ADR-007 |
| ช่วงเวลาของแต่ละกะ | `lib/shift.ts` |
| เปิด/ปิดการสมัครสมาชิกเอง | Supabase → Authentication → Sign In / Providers |
| CI | `.github/workflows/ci.yml` |

---

## 4. แก้ปัญหาที่พบบ่อย

| อาการ | ตรวจที่ไหน | วิธีแก้ |
|---|---|---|
| ทุกหน้าขึ้น error **"ขาดค่า Environment: …"** | Vercel → Settings → Environment Variables หรือ `.env.local` | ใส่ค่าให้ครบ แล้ว **Redeploy** (ค่า `NEXT_PUBLIC_` ถูกฝังตอน build ต้อง build ใหม่ถึงจะมีผล) |
| Login แล้วขึ้น **"อีเมลหรือรหัสผ่านไม่ถูกต้อง"** | Supabase → Authentication → Users | ตรวจว่ามีบัญชีจริง; ถ้าลืมรหัส ใช้เมนู ⋯ → Reset password / ตั้งรหัสใหม่ |
| Login แล้วขึ้น **"บัญชียังไม่ได้ยืนยันอีเมล"** | Authentication → Users → คอลัมน์ Confirmed | ลบแล้วสร้างใหม่โดยติ๊ก **Auto Confirm User** |
| Login แล้วขึ้น **"เข้าสู่ระบบไม่สำเร็จ ระบบอาจขัดข้องชั่วคราว"** | Vercel → Project → Logs ค้นคำว่า `signIn failed` ดูค่า `code` / `status` | `status=0` = ติดต่อ Supabase ไม่ได้ (URL ผิด หรือ Project ถูก Pause) → ตรวจ URL และสถานะ Project |
| Login ได้แต่เด้งไปหน้า **"บัญชีนี้ยังไม่พร้อมใช้งาน"** | SQL Editor: `select * from profiles where id = '<user id>';` | ไม่มีโปรไฟล์ (มักเกิดเมื่อสร้างบัญชี **ก่อน** รัน schema.sql) → รันคำสั่งเติมโปรไฟล์ในข้อ 4.1 |
| Technician เปิด `/users` แล้วเจอ "ไม่มีสิทธิ์" | — | **ถูกต้องแล้ว** หน้านี้สำหรับ Admin เท่านั้น |
| CI ขึ้น ❌ ที่ขั้น **Install dependencies** | GitHub → Actions → คลิก run ที่แดง | มักเกิดจาก `package-lock.json` ไม่ตรงกับ `package.json` → รัน `npm install` ในเครื่องแล้ว commit ไฟล์ lock ใหม่ (**อย่าแก้ด้วย `--legacy-peer-deps`**) |
| CI ขึ้น ❌ ที่ขั้น **Build** แต่ในเครื่องผ่าน | log ของ Actions | มักเป็น error ของ TypeScript → รัน `npm run build` ในเครื่องแล้วอ่าน error |
| Supabase Project ถูก **Pause** (แผน Free หยุดเองเมื่อไม่มีการใช้งานนาน) | Supabase Dashboard | กด **Restore project** รอประมาณ 1–2 นาที |

### 4.1 เติมโปรไฟล์ให้บัญชีที่ไม่มีโปรไฟล์
```sql
insert into profiles (id, full_name, role)
select u.id, split_part(u.email, '@', 1), 'viewer'
from auth.users u
left join profiles p on p.id = u.id
where p.id is null;
```

---

## 5. Restart, Backup และ Restore

### Restart
| ส่วน | วิธี |
|---|---|
| หน้าเว็บ (Vercel) | Vercel → Deployments → deployment ล่าสุด → ⋯ → **Redeploy** |
| ฐานข้อมูล (Supabase) | Project Settings → General → **Restart project** |

### Backup
- **โครงสร้างฐานข้อมูล** อยู่ใน `supabase/schema.sql` ใน Git แล้ว — สร้างใหม่ได้ทุกเมื่อ
- **ข้อมูล**: แผน Free ของ Supabase ไม่มี backup ที่กดกู้คืนเองได้ (ตรวจได้ที่ Database → Backups ของ Project)
  ให้ export เองก่อนงานสำคัญ (เช่น ก่อนนำเสนอ): **Table Editor → เลือกตาราง → Export → CSV**
  ทำครบ 6 ตาราง: `profiles`, `machines`, `alarms`, `maintenance_records`, `machine_status_history`, `audit_logs`

### Restore (กรณีต้องสร้าง Project ใหม่)
1. รัน `supabase/schema.sql` ใน Project ใหม่
2. สร้างบัญชีผู้ใช้ใหม่ตามข้อ 2.2 (รหัสผ่านย้ายข้าม Project ไม่ได้)
3. Import CSV ตามลำดับ: `machines` → `alarms` → `maintenance_records` → `machine_status_history` → `audit_logs`
   (ตารางลูกต้อง import หลังตารางแม่ ไม่งั้น Foreign Key จะปฏิเสธ; คอลัมน์ที่อ้างถึง user เดิมให้ล้างเป็นค่าว่างก่อน)
4. แก้ `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ใน Vercel แล้ว Redeploy

### Rollback (ย้อนเวอร์ชันระบบ)
| กรณี | วิธี |
|---|---|
| เวอร์ชันใหม่บน Vercel มีปัญหา | Vercel → Deployments → เลือก deployment ก่อนหน้าที่ใช้ได้ → ⋯ → **Promote to Production** (ย้อนทันที ไม่ต้องแก้โค้ด) |
| ต้องการยกเลิก commit ที่ผิด | `git revert <commit>` แล้ว push (**ห้าม** `git push --force`) |
| schema.sql เปลี่ยนแล้วมีปัญหา | ต้องเขียนคำสั่ง SQL ย้อนกลับเอง — จึงต้อง export CSV ก่อนแก้ schema ทุกครั้ง |

---

## 6. ส่วนที่ควรให้คน review ก่อนส่งมอบ

ส่วนต่อไปนี้เกี่ยวกับความปลอดภัยโดยตรง **ควรให้คน review ก่อนส่งมอบ**:

| ไฟล์ | เหตุผล | ประเด็นที่ควรตรวจ |
|---|---|---|
| `supabase/schema.sql` §6–7 | RLS และ GRANT คือด่านสุดท้ายของสิทธิ์ | Policy ครบทุกตาราง, `anon` ไม่มีสิทธิ์, Admin เปลี่ยน Role ตัวเองไม่ได้ |
| `lib/auth/dal.ts` | ด่านตรวจสิทธิ์ของทุกหน้า | ทุกหน้าเรียก `require*()` จริง, กรณีไม่มีโปรไฟล์ไม่วนลูป |
| `proxy.ts`, `lib/supabase/proxy.ts` | จัดการ session / cookie | คัดลอก cookie ตอน redirect, matcher ไม่ข้ามหน้าที่ควรป้องกัน |
| `lib/auth/actions.ts` | รับรหัสผ่าน | ไม่ log รหัสผ่าน, ข้อความ error ไม่บอกว่าอีเมลมีในระบบหรือไม่ |
| `lib/auth/roles.ts` → `safeNextPath` | กัน Open Redirect | ปฏิเสธ URL ภายนอกทุกรูปแบบ |
| Environment Variables ใน Vercel | ความลับ | ไม่มี Secret key หลุดไปอยู่ในตัวแปรที่ขึ้นต้น `NEXT_PUBLIC_` |

---

## 7. บันทึกการเปลี่ยนแปลงที่กระทบคู่มือนี้

| วันที่ | เปลี่ยนอะไร |
|---|---|
| 26 ก.ย. 2569 | สร้างคู่มือ: โครงสร้างระบบ, Login/Role, การตั้งค่าครั้งแรก, CI, Deploy |
| 26 ก.ย. 2569 | เปลี่ยนหน้าจอเป็นธีม Station terminal (ADR-007): เพิ่มไฟล์ธีม, ชิ้นส่วน `components/station/`, กะ + นาฬิกา |
