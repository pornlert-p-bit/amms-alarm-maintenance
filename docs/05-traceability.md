# 05 — Traceability Matrix

**ระบบ:** Alarm & Maintenance Management System (AMMS)
**วันที่:** 21 กันยายน 2569
**วัตถุประสงค์:** ให้ตรวจสอบได้ว่าทุก Requirement ถูกออกแบบ พัฒนา และทดสอบแล้ว ตามแนวทาง Chapter 01 §7.3

รูปแบบการสืบกลับ: **Requirement → Design → Implementation → Test**

> **อัปเดต 26 ก.ย. 2569:** ทดสอบ Login / สิทธิ์ / RLS บนฐานข้อมูลจริงแล้ว — ดู [รายงาน 26 ก.ย.](test-reports/2026-09-26-auth-rls.md)
>
> **สถานะ ณ วันจัดทำ:** เอกสารออกแบบเสร็จครบ — คอลัมน์ Implementation ระบุ *ตำแหน่งที่วางแผนไว้* และคอลัมน์สถานะยังเป็น `รอ implement` ทั้งหมด จะอัปเดตเป็น `ผ่าน` เมื่อ Test นั้นรันผ่านจริงใน CI

---

## 1. Functional Requirements

| REQ ID | Design | DB Object | Implementation (แผน) | Test ID | สถานะ |
|---|---|---|---|---|---|
| REQ-AUTH-01 | 02 §1, 03 §4 | `auth.users`, `profiles` | `app/(auth)/login/page.tsx` | TC-AUTH-01 | ✅ ผ่าน [รายงาน 26 ก.ย.](test-reports/2026-09-26-auth-rls.md) |
| REQ-AUTH-02 | 03 §4 | — | `lib/auth/actions.ts`, `proxy.ts` | TC-AUTH-02 | ✅ ผ่าน [รายงาน 26 ก.ย.](test-reports/2026-09-26-auth-rls.md) |
| REQ-AUTH-03 | 02 §3.1 | enum `user_role` | `lib/auth/roles.ts` | TC-AUTH-03 | ✅ ผ่าน (unit + [รายงาน 26 ก.ย.](test-reports/2026-09-26-auth-rls.md)) |
| REQ-AUTH-04 | 04 §2.1 | trigger `handle_new_user` | `supabase/schema.sql` §4.4 | TC-AUTH-04 | ✅ ผ่าน (สร้างบัญชีจริง 3 บัญชี) |
| REQ-AUTH-05 | 02 §3.1 | RLS `profiles_admin_update_others` | `features/users/actions.ts` → `changeUserRole` + migration 007 | TC-AUTH-05 | ✅ ผ่าน (A3 + W3–W7 + G1–G7) [รายงานผู้ใช้งาน](test-reports/2026-09-26-users.md) |
| REQ-AUTH-06 | 04 §4 (BR-07) | RLS `profiles_admin_update_others` (`id <> auth.uid()`) | `users/rules.ts` → `checkRoleChange` + RLS | TC-AUTH-06 | ✅ ผ่าน (A2, T4, V4 + W2, G6 + unit) |
| REQ-MCH-01 | 02 §3.1 | `machines` | `features/machine/actions.ts`, `app/(app)/machines/` | TC-MCH-01 | ✅ ผ่าน [รายงาน Machine](test-reports/2026-09-26-machine.md) |
| REQ-MCH-02 | 04 §2 | `machines` (5 คอลัมน์) | `features/machine/schema.ts` | TC-MCH-02 | ✅ ผ่าน [รายงาน Machine](test-reports/2026-09-26-machine.md) |
| REQ-MCH-03 | 04 §3 (BR-01) | `machines_machine_id_key` | `machine/actions.ts` + UNIQUE | TC-MCH-03 | ✅ ผ่าน (M5: UNIQUE ใน DB) |
| REQ-MCH-04 | 02 §4 | enum `machine_status` | `features/machine/schema.ts` (`MACHINE_STATUSES`) | TC-MCH-04 | ✅ ผ่าน (unit + M11) |
| REQ-MCH-05 | 04 §2.1 (BR-06) | `machines.deleted_at`, FK `restrict` | `machine/actions.ts` → `softDeleteMachine` | TC-MCH-05 | ✅ ผ่าน (M15 Soft Delete + A5 BR-05 กับข้อมูลจริง) |
| REQ-MCH-06 | 02 §7 (TB-4) | RLS `machines_admin_update` | `proxy.ts` + `requireAdmin()` | TC-MCH-06 | ✅ ผ่าน (T5 INSERT + P6 UPDATE ด้วยข้อมูลจริง) |
| REQ-ALM-01 | 02 §5.1 | `alarms` | `features/alarm/actions.ts` → `createAlarm` | TC-ALM-01 | ✅ ผ่าน (A4, A12) [รายงาน Alarm](test-reports/2026-09-26-alarm.md) |
| REQ-ALM-02 | 02 §4 | enum `alarm_status` | `alarm/rules.ts` → `allowedAlarmTransition` | TC-ALM-02 | ✅ ผ่าน (unit 9 กรณี + A7, A8) |
| REQ-ALM-03 | 02 §5.3 (BR-03) | `alarms_closed_requires_cause` | `alarm/actions.ts` → `closeAlarm` | TC-ALM-03 | ✅ ผ่าน (A6 + unit) |
| REQ-ALM-04 | 02 §5.2, 03 §5.2 | `alarms.closed_by`, `closed_at` | `closeAlarm` + trigger `trg_alarms_enforce_update` | TC-ALM-04 | ✅ ผ่าน (A8 + P3: ปลอมไม่ได้แม้ยิง API ตรง) |
| REQ-ALM-05 | 02 §4 (BR-02) | — (`rules.ts`, เหตุผลใน ADR-003) | `rules.ts` + trigger `trg_alarms_enforce_update` (migration 003) | TC-ALM-05 | ✅ ผ่าน (A10 + P1, P2) |
| REQ-ALM-06 | 04 §4 | RLS `alarms_select_authenticated` | `alarm/queries.ts` | TC-ALM-06 | ✅ ผ่าน |
| REQ-MNT-01 | 02 §3.1 | `maintenance_records` | `features/maintenance/actions.ts` → `createMaintenance` | TC-MNT-01 | ✅ ผ่าน (W1–W4) [รายงานงานซ่อม](test-reports/2026-09-26-maintenance.md) |
| REQ-MNT-02 | 04 §2.1 | `maintenance_records.alarm_id` (nullable FK) | `maintenance/schema.ts` + trigger `enforce_maintenance_insert` | TC-MNT-02 | ✅ ผ่าน (W1 ผูก Alarm + I1 Alarm คนละเครื่องถูกปฏิเสธ) |
| REQ-MNT-03 | 02 §4 | enum `mnt_status` (มี `Waiting Part`) | `maintenance/rules.ts` + trigger (migration 005) | TC-MNT-03 | ✅ ผ่าน (unit 16 กรณี + W5 + U5, U6, U11) |
| REQ-MNT-04 | 04 §3 (BR-04) | `mnt_done_requires_action` | `maintenance/actions.ts` → `changeMaintenanceStatus` | TC-MNT-04 | ✅ ผ่าน (W7, W8 + U9) |
| REQ-MNT-05 | 04 §4 | RLS `mnt_staff_insert/update` | `requireStaff()` + `authorizeAction(isStaff)` | TC-MNT-05 | ✅ ผ่าน (viewer V1–V5 + API I2, U7, D1) |
| REQ-SRC-01 | 03 §3.1 | `idx_machines_search` | `machine/queries.ts` → `getMachines` | TC-SRC-01 | ✅ ผ่าน (M8–M10) |
| REQ-SRC-02 | 03 §3.2 | `idx_alarms_status`, `idx_alarms_occurred` | `alarm/queries.ts` + `AlarmFilterBar` | TC-SRC-02 | ✅ ผ่าน (A11) |
| REQ-SRC-03 | 03 §3.2 | `idx_mnt_status`, `idx_mnt_technician` | `maintenance/queries.ts` → `getMaintenanceBoard` | TC-SRC-03 | ✅ ผ่าน (W11, W12) |
| REQ-DSH-01 | 04 §6 | `machines` (นับจากรายการที่ใช้วาดผังอยู่แล้ว) | `dashboard/queries.ts` + `metrics.ts` | TC-DSH-01 | ✅ ผ่าน (D2 + unit) [รายงาน Dashboard](test-reports/2026-09-26-dashboard.md) |
| REQ-DSH-02 | 04 §6 | `idx_machines_status` | `metrics.ts` → `countByStatus` | TC-DSH-02 | ✅ ผ่าน (D2, D4 + unit) |
| REQ-DSH-03 | 04 §6 | `idx_alarms_open`, `idx_mnt_status` | `dashboard/queries.ts` | TC-DSH-03 | ✅ ผ่าน (D3) |
| REQ-DSH-04 | 04 §6 | view `dashboard_alarm_code_daily` (migration 006) | `dashboard/components/charts.tsx` → `DailyAlarmChart` | TC-DSH-04 | ✅ ผ่าน (D7, D8 + unit) |
| REQ-DSH-05 | 04 §6 | `idx_alarms_occurred` | `app/(app)/dashboard/page.tsx` (กรอบ Alarm ล่าสุด) | TC-DSH-05 | ✅ ผ่าน (D6) |
| REQ-VAL-01 | 03 §5.3 | `check btrim(...) <> ''` ทุกตาราง | `features/*/schema.ts` (zod) | TC-VAL-01 | ✅ ผ่าน (M3 + unit) |
| REQ-VAL-02 | 04 §3 | `machines_machine_id_format` + UNIQUE | `machine/schema.ts` | TC-VAL-02 | ✅ ผ่าน (M4, M5, M7 + unit) |
| REQ-VAL-03 | 03 §5.3 | — | `lib/action-result.ts`, `components/station/ui.tsx` | TC-VAL-03 | ✅ ผ่าน (M3, M5, M6) |
| REQ-VAL-04 | 04 §3 (BR-08) | trigger `trg_alarms_check_occurred_at` | `alarm/schema.ts` + trigger | TC-VAL-04 | ✅ ผ่าน (A3 + unit + trigger) |
| REQ-SEC-01 | 02 §7 (TB-4) | — | `proxy.ts` | TC-SEC-01 | ✅ ผ่าน [รายงาน 26 ก.ย.](test-reports/2026-09-26-auth-rls.md) |
| REQ-SEC-02 | 02 §7 (TB-4) | RLS admin policies | `proxy.ts` + `requireAdmin()` | TC-SEC-02 | ✅ ผ่าน [รายงาน 26 ก.ย.](test-reports/2026-09-26-auth-rls.md) |
| REQ-SEC-03 | 03 §6 | — | `.gitignore`, `import 'server-only'` | TC-SEC-03 | ✅ ผ่าน (ไม่พบ key ใน git history, v1 ไม่ใช้ Secret key) |
| REQ-SEC-04 | 02 §7, ADR-002 | RLS ทุกตาราง | Server Action guards | TC-SEC-04 | รอ implement |
| REQ-SEC-05 | ADR-006 | `revoke ... from anon` | `supabase/schema.sql` §7 | TC-SEC-05 | ✅ ผ่าน (N1, DB-1) |
| REQ-SEC-06 | ADR-005 | `audit_logs` | `features/audit/write.ts` | TC-SEC-06 | รอ implement |
| REQ-OPS-01 | — | — | `.github/workflows/ci.yml` | TC-OPS-01 | ✅ ผ่าน (CI เขียวบน GitHub) |
| REQ-OPS-02 | — | — | Vercel Project | TC-OPS-02 | รอ implement |
| REQ-OPS-03 | — | — | `README.md` | TC-OPS-03 | รอ implement |
| REQ-OPS-04 | — | — | Git history | TC-OPS-04 | รอ implement |

## 2. Bonus Requirements

| REQ ID | Design | DB Object | Implementation (แผน) | Test ID | สถานะ |
|---|---|---|---|---|---|
| REQ-BON-01 | 02 §3.1 | enum `user_role` = `viewer` | `lib/auth/dal.ts`, `components/station/top-nav.tsx` | TC-BON-01 | ✅ ผ่านระดับ RLS (V2, V3) |
| REQ-BON-02 | 04 §6 | view `dashboard_alarm_code_daily` | `charts.tsx` → `ParetoChart` + `metrics.ts` → `pareto` | TC-BON-02 | ✅ ผ่าน (D9 + unit) — ทำเป็น Pareto แทน Top 5 |
| REQ-BON-03 | 02 §3.1, ADR-004 | `machine_status_history`, `alarms`, `maintenance_records` | `app/(app)/machines/[id]/page.tsx` + `features/machine/timeline.ts` | TC-BON-03 | ✅ ผ่าน (H1–H9 + unit) [รายงาน Machine History](test-reports/2026-09-26-machine-history.md) |
| REQ-BON-04 | 03 §4 | — | `app/api/export/alarms/route.ts` | TC-BON-04 | รอ implement |
| REQ-BON-05 | ADR-005 (+ Revision 2) | `audit_logs` + RLS admin only + trigger `trg_audit_enforce_insert` (migration 008) | `app/(app)/audit/page.tsx`, `features/audit/` | TC-BON-05 | ✅ ผ่าน (P7 + L1–L10 + Q1–Q4) [รายงาน Audit Log](test-reports/2026-09-26-audit.md) |
| REQ-BON-06 | 03 §3.2 | — | `ThemeToggle.tsx`, Tailwind breakpoints | TC-BON-06 | รอ implement |
| REQ-BON-07 | 02 §4 | enum `mnt_status` = `Waiting Part` | `maintenance/rules.ts` | TC-BON-07 | รอ implement |
| REQ-BON-08 | 03 §3.2 | `idx_alarms_occurred`, `idx_mnt_date` | `DateRangeFilter.tsx` | TC-BON-08 | ✅ ผ่าน (Alarm A11 + งานซ่อม W11 + ประวัติเครื่อง H6 + Audit Log L7) |
| REQ-BON-09 | ADR-004 | `alarms.event_id`, `machines.last_seen_at`, `status_source` | `features/simulator/*` + ฟังก์ชัน `simulate_machine_*` (migration 009) | TC-BON-09 | 🟡 Simulator ผ่าน (S1–S6, A1–A6, T1–T3) [รายงาน Simulator](test-reports/2026-09-27-simulator.md) — PLC Gateway จริงยังไม่ทำ (ADR-004 Revision) |

## 3. Non-functional Requirements

| NFR ID | Design | วิธีพิสูจน์ | Test ID | สถานะ |
|---|---|---|---|---|
| NFR-PERF-01 | 02 §8, 04 §6 | Seed ข้อมูลทดสอบตามที่ระบุ แล้ววัดเวลาโหลด Dashboard | TC-NFR-01 | รอ implement |
| NFR-PERF-02 | 03 §3.1 | ตรวจว่า query มี `limit`/`range` และ filter ทำฝั่ง server | TC-NFR-02 | รอ implement |
| NFR-SEC-01 | 02 §7, ADR-002 | ปิด guard ใน Server Action ชั่วคราวแล้วต้องยังถูก RLS ปฏิเสธ | TC-NFR-03 | ✅ ผ่าน (P1–P9: ข้าม Server Action แล้วฐานข้อมูลยังปฏิเสธ = TC-NFR-03) |
| NFR-INT-01 | ADR-003 | เรียก Data API ตรงด้วยข้อมูลผิดกฎ แล้วต้องถูก Constraint ปฏิเสธ | TC-NFR-04 | ✅ ผ่าน (T6: Foreign Key ปฏิเสธผ่าน API ตรง) |
| NFR-USE-01 | 03 §5.3 | ส่งฟอร์มที่ข้อมูลผิด แล้วตรวจว่าค่าที่กรอกยังอยู่และมี error ใต้ช่อง | TC-NFR-05 | ✅ ผ่าน (M6 หลังแก้บั๊ก select) |
| NFR-AVAIL-01 | 02 §6 | จำลอง DB error แล้วตรวจว่าแสดง Error State ไม่ใช่หน้าว่าง | TC-NFR-06 | รอ implement |
| NFR-MAINT-01 | ADR-003, 02 §11 | เพิ่มค่าสถานะ 1 ค่า แล้วนับจำนวนไฟล์ที่ต้องแก้ (≤3) | TC-NFR-07 | รอ implement |
| NFR-OBS-01 | ADR-005 | ทำ mutation สำคัญแล้วตรวจว่ามีแถวใน `audit_logs` | TC-NFR-08 | รอ implement |

---

## 4. Test Case ที่วางแผนไว้

### 4.1 Unit Test (รันใน CI — ไม่ต้องต่อฐานข้อมูล)

| Test ID | ทดสอบ | Expected |
|---|---|---|
| TC-ALM-02 | `allowedAlarmTransition('Open', 'In Progress')` | `true` |
| TC-ALM-05 | `allowedAlarmTransition('Closed', 'Open')` | `false` |
| TC-MNT-03 | `allowedMntTransition('In Progress', 'Waiting Part')` | `true` |
| TC-BON-07 | `allowedMntTransition('Open', 'Done')` | `false` (ต้องผ่าน In Progress) |
| TC-VAL-02 | `machineSchema.safeParse({ machine_id: 'M!' })` | ไม่ผ่าน, `field = machine_id` |
| TC-VAL-01 | `machineSchema.safeParse({ machine_name: '   ' })` | ไม่ผ่าน (ช่องว่างล้วนถือว่าว่าง) |
| TC-VAL-04 | `alarmSchema.safeParse({ occurred_at: พรุ่งนี้ })` | ไม่ผ่าน |
| TC-MNT-04 | `canCompleteMaintenance({ action_taken: '' })` | `false` |
| TC-MCH-05 | `canDeleteMachine({ openAlarms: 1 })` | `false` (BR-05) |
| TC-NFR-07 | นับไฟล์ที่ต้องแก้เมื่อเพิ่มสถานะ | ≤ 3 |

### 4.2 Integration Test (ต้องต่อฐานข้อมูลทดสอบ)

| Test ID | ทดสอบ | Expected |
|---|---|---|
| TC-MCH-03 | INSERT `machines` ด้วย `machine_id` ซ้ำ | ถูกปฏิเสธด้วย `machines_machine_id_key` |
| TC-ALM-03 | UPDATE `alarms` เป็น `Closed` โดยไม่ใส่ `cause` | ถูกปฏิเสธด้วย `alarms_closed_requires_cause` |
| TC-MNT-04 | UPDATE `maintenance_records` เป็น `Done` โดยไม่ใส่ `action_taken` | ถูกปฏิเสธด้วย `mnt_done_requires_action` |
| TC-VAL-04 | INSERT `alarms` ด้วย `occurred_at` เป็นอนาคต | ถูกปฏิเสธด้วย trigger |
| TC-MCH-05 | DELETE `machines` ที่มี `alarms` อ้างถึง | ถูกปฏิเสธด้วย FK `restrict` |
| TC-AUTH-04 | สร้าง user ใหม่ใน `auth.users` | มีแถวใน `profiles` ด้วย `role = 'viewer'` |
| TC-NFR-04 | เรียก Data API ตรงด้วยข้อมูลผิดกฎ | ถูกปฏิเสธที่ชั้น Constraint |

### 4.3 RLS / Security Test (สำคัญที่สุด — ทดสอบด้วย Token ของแต่ละ Role)

| Test ID | ทดสอบ | Expected |
|---|---|---|
| TC-SEC-01 | เปิด `/dashboard` โดยไม่ Login | Redirect ไป `/login` |
| TC-SEC-02 | เปิด `/users` ด้วย Token ของ Technician | ถูกปฏิเสธหรือ Redirect |
| TC-MCH-06 | UPDATE `machines` ผ่าน Data API ด้วย Token ของ Technician | 0 rows / ถูกปฏิเสธด้วย RLS |
| TC-AUTH-06 | UPDATE `profiles` ของตัวเองเพื่อเปลี่ยน `role` ด้วย Token ของ Admin | ถูกปฏิเสธด้วย RLS (`id <> auth.uid()`) |
| TC-BON-01 | INSERT `alarms` ด้วย Token ของ Viewer | ถูกปฏิเสธด้วย RLS |
| TC-BON-05 | SELECT `audit_logs` ด้วย Token ของ Technician | 0 rows |
| TC-SEC-05 | SELECT ทุกตารางด้วย `anon` key โดยไม่ Login | permission denied ทุกตาราง |
| TC-SEC-03 | `grep -r "SERVICE_ROLE" .next/static/` และตรวจ `git log -p` | ไม่พบ Secret |
| TC-NFR-03 | ปิด guard ใน Server Action ชั่วคราว แล้วเรียกด้วย Technician | ยังถูก RLS ปฏิเสธ |

### 4.4 End-to-End Test

| Test ID | ทดสอบ | Expected |
|---|---|---|
| TC-AUTH-01 | Login ด้วยบัญชีที่ถูกต้อง | เข้าหน้า Dashboard ได้ |
| TC-AUTH-02 | Logout แล้วกด Back | ไม่เห็นหน้าเดิม ถูก Redirect |
| TC-ALM-01 | สร้าง Alarm ครบทุกช่อง | ปรากฏในรายการและ Dashboard นับเพิ่ม |
| TC-ALM-04 | ปิด Alarm พร้อม Cause | สถานะเป็น Closed และแสดงผู้ปิด/เวลาปิด |
| TC-SRC-02 | กรอง Alarm ด้วย Machine + Status พร้อมกัน | ผลลัพธ์ตรงทั้งสองเงื่อนไข |
| TC-NFR-05 | ส่งฟอร์ม Machine ด้วย ID ซ้ำ | เห็น error ใต้ช่อง และค่าที่กรอกยังอยู่ |
| TC-NFR-06 | จำลอง DB error | เห็น Error State + ปุ่มลองใหม่ |
| TC-BON-04 | กด Export CSV ขณะมี Filter | ไฟล์มีเฉพาะแถวที่ตรง Filter |

---

## 5. Coverage สรุป

| กลุ่ม | จำนวน REQ | มี Design | มี Implementation Plan | มี Test Case |
|---|---|---|---|---|
| Functional (38 Must + 5 Should + 2 Could) | 45 | 45 | 45 | 45 |
| Bonus (Could) | 9 | 9 | 9 | 9 |
| Non-functional | 8 | 8 | 8 | 8 |
| **รวม** | **62** | **62** | **62** | **62** |

**ไม่มี Requirement ใดที่ไม่มี Design และไม่มี Design ใดที่ไม่มี Requirement รองรับ** — ตรวจทั้งสองทิศทางตามหลัก Traceability ของ Chapter 01 §7.3

---

## 6. วิธีอัปเดตเอกสารนี้

1. เมื่อ implement Requirement ใดเสร็จ ให้เปลี่ยนคอลัมน์ Implementation จาก *แผน* เป็นลิงก์ไฟล์จริง
2. เปลี่ยนสถานะเป็น `ผ่าน` **เฉพาะเมื่อ Test นั้นรันผ่านจริง** ไม่ใช่เมื่อเขียนโค้ดเสร็จ
3. ถ้ามี Change Request ให้เพิ่ม REQ-ID ใหม่ต่อท้ายกลุ่มเดิม และทำ Change Impact Analysis ตาม [02-system-design.md](02-system-design.md) §11 ก่อนแก้โค้ด
