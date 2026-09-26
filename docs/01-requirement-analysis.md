# 01 — Requirement Analysis

**ระบบ:** Alarm & Maintenance Management System (AMMS)
**รายวิชา:** การใช้คอมพิวเตอร์ควบคุมระบบการผลิตอัตโนมัติ (Programming in Automation Systems)
**ผู้จัดทำ:** _(ชื่อ–สกุล / รหัสนักศึกษา)_
**วันที่:** 21 กันยายน 2569
**สถานะเอกสาร:** Baseline v1.0 — ใช้เป็น input ของ [02-system-design.md](02-system-design.md)

> อ้างอิงแนวทางจากเอกสารประกอบการสอน Chapter 01 — Requirement Analysis
> (Analyze → Specify → Validate → Build)

---

## 1. Problem Statement

โรงงานบันทึก Alarm ของเครื่องจักรและงานซ่อมบำรุงกระจายอยู่หลายแหล่ง — สมุดบันทึกกะ, ไฟล์ Excel ของแต่ละแผนก และการแจ้งผ่านแชต ทำให้เกิดปัญหา 4 อย่าง: (1) ค้นประวัติซ่อมของเครื่องหนึ่ง ๆ ย้อนหลังได้ยากและใช้เวลานาน (2) ไม่รู้ว่างานซ่อมแต่ละรายการค้างอยู่ที่ขั้นไหนและใครรับผิดชอบ (3) ผู้เกี่ยวข้องแต่ละฝ่ายเห็นข้อมูลไม่ตรงกันเพราะต่างคนต่างถือสำเนา และ (4) ไม่มีตัวเลขรวมให้หัวหน้าฝ่ายผลิตดูว่าตอนนี้เครื่องหยุดกี่เครื่องและ Alarm ค้างเท่าไร

จึงต้องการ **ระบบกลางบนเว็บ** ที่เก็บข้อมูล Machine, Alarm และ Maintenance ไว้ที่เดียว มีสิทธิ์การเข้าถึงตามบทบาท และมี Dashboard สรุปสถานะแบบเห็นพร้อมกันทุกฝ่าย

---

## 2. Stakeholders

| Stakeholder | ความต้องการหลัก | ใช้ระบบผ่าน Role |
|---|---|---|
| Production Manager | เห็นภาพรวมสถานะเครื่องและ Alarm ที่กระทบการผลิต ไม่ต้องแก้ข้อมูล | Viewer |
| Maintenance Engineer | ติดตาม Alarm ค้าง, คิวงานซ่อม และประวัติของเครื่องแต่ละตัว | Admin |
| Technician | รับงานซ่อม บันทึกสาเหตุ/การแก้ไข และปิดงาน | Technician |
| Operator (หน้างาน) | แจ้ง Alarm ที่พบ และดูสถานะเครื่องเบื้องต้น | Technician |
| System Admin | จัดการผู้ใช้, Role และ Master Data ของเครื่องจักร | Admin |

**Primary users ของ v1:** Admin และ Technician (Viewer เป็นส่วนเพิ่มเพื่อรองรับ Manager)

---

## 3. ระดับของ Requirement

| ระดับ | Requirement |
|---|---|
| Business | ลดเวลาค้นหาประวัติซ่อมและติดตามสถานะ Alarm ให้เห็นข้อมูลชุดเดียวกันทุกฝ่าย |
| User | Technician บันทึกและปิด Alarm พร้อมผลการแก้ไขได้ / Manager ดูภาพรวมได้โดยไม่แก้ข้อมูล |
| System | เมื่อปิด Alarm ระบบต้องบันทึกผู้ดำเนินการและเวลาโดยอัตโนมัติจากฝั่ง server |
| Constraint | ใช้ Next.js + Tailwind CSS + Supabase, จัดเก็บโค้ดบน GitHub, CI ด้วย GitHub Actions, Deploy บน Vercel, อนุญาตใช้ AI ช่วยพัฒนา |

---

## 4. Functional Requirements

> เกณฑ์การเขียน: ระบุ **ผู้กระทำ (Role) + การกระทำ + วัตถุ** ให้ตรวจสอบได้ หลีกเลี่ยงคำว่า "จัดการได้" / "ใช้งานง่าย"

### 4.1 Authentication & Role

| ID | Requirement | Priority |
|---|---|---|
| REQ-AUTH-01 | ผู้ใช้ต้อง Login ด้วย Email + Password ผ่าน Supabase Authentication ได้ | Must |
| REQ-AUTH-02 | ผู้ใช้ต้อง Logout ได้ และหลัง Logout ต้องเข้าหน้าภายในระบบไม่ได้ | Must |
| REQ-AUTH-03 | ระบบต้องมี Role อย่างน้อย 3 ระดับ: Admin, Technician, Viewer | Must |
| REQ-AUTH-04 | ผู้ใช้ที่ถูกสร้างใหม่ต้องได้ Role ต่ำสุด (Viewer) เป็นค่าตั้งต้น | Must |
| REQ-AUTH-05 | Admin ต้องเปลี่ยน Role ของผู้ใช้คนอื่นได้ผ่านหน้า Users | Must |
| REQ-AUTH-06 | ผู้ใช้ทุกคนรวมถึง Admin ต้องเปลี่ยน Role ของตนเองไม่ได้ | Must |

### 4.2 Machine Master

| ID | Requirement | Priority |
|---|---|---|
| REQ-MCH-01 | Admin ต้อง Create, Read, Update และ Delete ข้อมูล Machine ได้ครบถ้วน | Must |
| REQ-MCH-02 | Machine ต้องเก็บ Machine ID, Machine Name, Machine Type, Location และ Status | Must |
| REQ-MCH-03 | Machine ID ต้องไม่ซ้ำกันในระบบ | Must |
| REQ-MCH-04 | Status ของ Machine ต้องเป็นค่าใดค่าหนึ่งใน Running, Stop, Alarm, Maintenance | Must |
| REQ-MCH-05 | การลบ Machine ต้องเป็น Soft Delete และต้องไม่ทำให้ Alarm/Maintenance เดิมของเครื่องนั้นหายไป | Should |
| REQ-MCH-06 | Technician และ Viewer ต้องดูข้อมูล Machine ได้ แต่แก้ไขไม่ได้ | Must |

### 4.3 Alarm Record

| ID | Requirement | Priority |
|---|---|---|
| REQ-ALM-01 | ผู้ใช้ Role Admin หรือ Technician ต้องบันทึก Alarm โดยระบุ Machine, Alarm Code, Description และ Date/Time ที่เกิดเหตุได้ | Must |
| REQ-ALM-02 | Admin/Technician ต้องเปลี่ยนสถานะ Alarm เป็น Open, In Progress หรือ Closed ได้ | Must |
| REQ-ALM-03 | การปิด Alarm (เป็น Closed) ต้องกรอก Cause ก่อน มิฉะนั้นระบบต้องไม่บันทึก | Must |
| REQ-ALM-04 | เมื่อ Alarm ถูกปิด ระบบต้องบันทึก Closed By และ Closed At โดยกำหนดค่าจากฝั่ง server เท่านั้น | Must |
| REQ-ALM-05 | Alarm ที่มีสถานะ Closed แล้วต้องเปลี่ยนสถานะย้อนกลับไม่ได้ | Should |
| REQ-ALM-06 | ผู้ใช้ทุก Role ที่ Login แล้วต้องอ่านรายการ Alarm ได้ | Must |

### 4.4 Maintenance Record

| ID | Requirement | Priority |
|---|---|---|
| REQ-MNT-01 | Admin/Technician ต้องบันทึกงานซ่อมโดยระบุ Machine, Problem, Technician ผู้รับผิดชอบ และวันเวลาที่เข้าซ่อมได้ | Must |
| REQ-MNT-02 | Maintenance Record ต้องเชื่อมโยงกับ Alarm ที่เป็นต้นเหตุได้ (ไม่บังคับ) | Should |
| REQ-MNT-03 | สถานะงานซ่อมต้องเป็นค่าใดค่าหนึ่งใน Open, In Progress, Waiting Part, Done | Must |
| REQ-MNT-04 | การเปลี่ยนสถานะเป็น Done ต้องกรอก Action Taken ก่อน มิฉะนั้นระบบต้องไม่บันทึก | Must |
| REQ-MNT-05 | Admin/Technician ต้อง Create, Read และ Update งานซ่อมได้ | Must |

### 4.5 Search & Filter

| ID | Requirement | Priority |
|---|---|---|
| REQ-SRC-01 | ผู้ใช้ต้องค้นหา Machine ด้วย Machine ID หรือ Machine Name ได้ | Must |
| REQ-SRC-02 | ผู้ใช้ต้องกรองรายการ Alarm ได้อย่างน้อย 2 เงื่อนไขพร้อมกัน จาก Machine, Status, Alarm Code และช่วงวันที่ | Must |
| REQ-SRC-03 | ผู้ใช้ต้องกรองรายการ Maintenance ได้จาก Machine, Status, Technician และช่วงวันที่ | Must |

### 4.6 Dashboard

| ID | Requirement | Priority |
|---|---|---|
| REQ-DSH-01 | Dashboard ต้องแสดงจำนวน Machine ทั้งหมด | Must |
| REQ-DSH-02 | Dashboard ต้องแสดงจำนวน Machine แยกตามสถานะ Running, Stop, Alarm และ Maintenance | Must |
| REQ-DSH-03 | Dashboard ต้องแสดงจำนวน Alarm ที่ยังไม่ปิด และจำนวนงาน Maintenance ที่ยังไม่เสร็จ | Must |
| REQ-DSH-04 | Dashboard ต้องแสดงกราฟจำนวน Alarm ต่อวันย้อนหลัง 7 และ 30 วัน | Could |
| REQ-DSH-05 | Dashboard ต้องแสดงรายการ Alarm ล่าสุด 5 รายการพร้อมลิงก์ไปหน้ารายละเอียด | Should |

### 4.7 Input Validation

| ID | Requirement | Priority |
|---|---|---|
| REQ-VAL-01 | ช่องข้อมูลที่จำเป็นทุกช่องต้องไม่ยอมรับค่าว่างหรือช่องว่างล้วน | Must |
| REQ-VAL-02 | Machine ID ต้องตรงรูปแบบที่กำหนด (ตัวอักษร/ตัวเลข/ขีด ยาว 2–20 ตัว) และต้องไม่ซ้ำ โดยบังคับทั้งฝั่ง Client, Server และ Database | Must |
| REQ-VAL-03 | เมื่อข้อมูลไม่ถูกต้อง ระบบต้องแสดงข้อความแจ้งเตือนที่ระบุช่องที่ผิดเป็นภาษาไทย | Must |
| REQ-VAL-04 | วันเวลาที่เกิด Alarm (Occurred At) ต้องไม่เป็นเวลาในอนาคต | Should |

### 4.8 Security

| ID | Requirement | Priority |
|---|---|---|
| REQ-SEC-01 | ผู้ใช้ที่ยังไม่ Login ต้องเข้าหน้าใด ๆ ภายในระบบไม่ได้ และต้องถูก Redirect ไปหน้า Login | Must |
| REQ-SEC-02 | ผู้ใช้ Role Technician หรือ Viewer ที่เปิด URL หน้าจัดการ Machine หรือ Users โดยตรงต้องถูกปฏิเสธหรือ Redirect | Must |
| REQ-SEC-03 | Supabase Service Role Key และ Secret อื่นต้องไม่ปรากฏใน Bundle ฝั่ง Client และต้องไม่ถูก Commit ลง GitHub | Must |
| REQ-SEC-04 | ทุก Mutation ที่สำคัญต้องตรวจสิทธิ์ที่ฝั่ง Server และต้องมี RLS Policy เป็นชั้นบังคับสุดท้าย | Must |
| REQ-SEC-05 | Role `anon` ของฐานข้อมูลต้องไม่มีสิทธิ์ SELECT/INSERT/UPDATE/DELETE บนตารางข้อมูลของระบบ | Must |
| REQ-SEC-06 | การเปลี่ยนสถานะ Alarm/Maintenance, การแก้ Machine และการเปลี่ยน Role ต้องถูกบันทึกลง Audit Log | Could |

### 4.9 Delivery & Operations

| ID | Requirement | Priority |
|---|---|---|
| REQ-OPS-01 | ต้องมี GitHub Actions Workflow อย่างน้อย 1 ชุด ที่ทำงานตามลำดับ Install → Build → Lint → Test เมื่อ Push/PR เข้า main | Must |
| REQ-OPS-02 | ระบบต้อง Deploy บน Vercel และ URL ต้องเปิดใช้งานได้จริง | Must |
| REQ-OPS-03 | ต้องมี README ที่ครอบคลุมชื่อ/วัตถุประสงค์, Function หลัก, Technology, Database Structure, วิธีติดตั้ง, Vercel URL และรายละเอียดการใช้ AI | Must |
| REQ-OPS-04 | ต้องมีประวัติ Commit ต่อเนื่องระหว่างการพัฒนา แยกตาม Module ไม่ใช่ Commit เดียวตอนเสร็จ | Must |

### 4.10 ส่วนเพิ่ม (Bonus)

| ID | Requirement | Priority |
|---|---|---|
| REQ-BON-01 | Role Viewer ที่ดู Dashboard/รายงานได้แต่แก้ข้อมูลไม่ได้ | Could |
| REQ-BON-02 | กราฟวิเคราะห์ Alarm (จำนวนต่อวัน และ Top Alarm Code) | Could |
| REQ-BON-03 | หน้า Machine History แสดงประวัติ Alarm, Maintenance และการเปลี่ยนสถานะของเครื่องหนึ่งเครื่อง | Could |
| REQ-BON-04 | Export รายการ Alarm/Maintenance เป็นไฟล์ CSV ตามเงื่อนไข Filter ปัจจุบัน | Could |
| REQ-BON-05 | ตาราง Audit Log และหน้าแสดงผลสำหรับ Admin | Could |
| REQ-BON-06 | UI ใช้งานได้บนหน้าจอมือถือ และรองรับ Dark Mode | Could |
| REQ-BON-07 | สถานะ Waiting Part ในงานซ่อมบำรุง | Could |
| REQ-BON-08 | Filter ตามช่วงวันที่ในหน้า Alarm และ Maintenance | Could |
| REQ-BON-09 | Interface รับสถานะเครื่องจักรจาก PLC Gateway (v1 ใช้ Simulator แทนของจริง) | Could |

---

## 5. Non-functional Requirements

| ID | ด้าน | Requirement (วัดได้) |
|---|---|---|
| NFR-PERF-01 | Performance | หน้า Dashboard ต้องแสดงข้อมูลสรุปครบภายใน 3 วินาที ภายใต้ข้อมูลทดสอบ 50 machines / 500 alarms / 200 maintenance records |
| NFR-PERF-02 | Performance | หน้ารายการทุกหน้าต้องใช้ Pagination ไม่เกิน 25 แถวต่อหน้า และต้องไม่ดึงข้อมูลทั้งตารางมา filter ที่ฝั่ง Client |
| NFR-SEC-01 | Security | Authorization ของทุก Mutation ต้องถูกบังคับอย่างน้อย 2 ชั้น (Server Action + RLS) |
| NFR-INT-01 | Data Integrity | กฎ "Machine ID ไม่ซ้ำ", "Closed ต้องมี Cause" และ "Done ต้องมี Action Taken" ต้องถูกบังคับด้วย Constraint ระดับ Database ไม่ใช่โค้ดเพียงชั้นเดียว |
| NFR-USE-01 | Usability | Form ต้องแสดงข้อความผิดพลาดใต้ช่องที่ผิด และต้องไม่ล้างค่าที่ผู้ใช้กรอกไว้แล้วเมื่อบันทึกไม่สำเร็จ |
| NFR-AVAIL-01 | Availability | หากการเรียกฐานข้อมูลล้มเหลว ระบบต้องแสดง Error State ที่อธิบายได้พร้อมปุ่มลองใหม่ ไม่แสดงหน้าว่างและไม่แจ้งว่าบันทึกสำเร็จ |
| NFR-MAINT-01 | Maintainability | การเพิ่มค่าสถานะใหม่ 1 ค่า ต้องแก้ไขไม่เกิน 3 จุด (Enum ใน DB, Type กลาง และ Label แสดงผล) |
| NFR-OBS-01 | Observability | Mutation สำคัญทุกครั้งต้องเขียน Audit Record ที่ระบุ ใคร/ทำอะไร/กับข้อมูลใด/เมื่อไร |

### Quality Attribute Scenarios

| # | Scenario |
|---|---|
| QAS-01 | **เมื่อ** Technician 30 คนเปิด Dashboard พร้อมกันในช่วงเปลี่ยนกะ **ระบบต้อง** แสดงข้อมูลสรุปล่าสุดภายใน 3 วินาที โดยใช้ Aggregate Query ฝั่ง Server และไม่ดึงทุกแถวมานับที่ Client |
| QAS-02 | **เมื่อ** Technician กดปุ่ม Save ซ้ำ 2 ครั้งรวดเร็ว **ระบบต้อง** สร้าง Alarm เพียงรายการเดียว โดย disable ปุ่มระหว่างส่งและอาศัย Constraint ฝั่ง DB |
| QAS-03 | **เมื่อ** ผู้ใช้ Role Technician เรียก API แก้ข้อมูล Machine โดยตรงด้วย Token ของตน **ระบบต้อง** ปฏิเสธที่ชั้น RLS แม้จะข้าม UI และ Server Action ไปได้ |
| QAS-04 | **เมื่อ** Supabase ไม่ตอบสนองภายใน 5 วินาที **ระบบต้อง** แสดง Error State พร้อมปุ่ม "ลองใหม่" และเขียน Log ที่มี Context (use case + user id + reason) |

---

## 6. Scope

| In Scope (v1) | Out of Scope (v1) |
|---|---|
| Machine Master (CRUD + Soft Delete) | เชื่อมต่อ PLC / SCADA จริง |
| Alarm Record + State Transition | แจ้งเตือนผ่าน SMS / LINE / Email |
| Maintenance Record + State Transition | Predictive Maintenance ด้วย AI |
| Login + Role 3 ระดับ (Admin/Technician/Viewer) | Mobile Native App |
| Dashboard + กราฟสรุป | เชื่อม ERP / MES |
| Search / Filter / Export CSV | Spare Part Inventory และระบบจัดซื้อ |
| Audit Log | Multi-plant / Multi-tenant |
| PLC **Mock** Simulator (จำลองสัญญาณเข้า) | Realtime Subscription แบบ Push |

> **หมายเหตุ:** Out of Scope ไม่ได้แปลว่าไม่คิดถึง — ดู Integration Interface ที่เตรียมไว้สำหรับ PLC Gateway ใน [03-architecture.md](03-architecture.md) §8

---

## 7. MoSCoW Prioritization

| ระดับ | รายการ |
|---|---|
| **Must have** | REQ-AUTH-01…06, REQ-MCH-01…04, REQ-MCH-06, REQ-ALM-01…04, REQ-ALM-06, REQ-MNT-01, REQ-MNT-03…05, REQ-SRC-01…03, REQ-DSH-01…03, REQ-VAL-01…03, REQ-SEC-01…05, REQ-OPS-01…04 |
| **Should have** | REQ-MCH-05, REQ-ALM-05, REQ-MNT-02, REQ-DSH-05, REQ-VAL-04 |
| **Could have** | REQ-SEC-06, REQ-DSH-04, REQ-BON-01…09 |
| **Won't have now** | เชื่อม PLC จริง, Notification ภายนอก, ERP/MES Integration, Predictive Maintenance |

## 8. MVP

```
Login/Role  →  Machine Master  →  Alarm Record  →  Maintenance Record  →  Dashboard  →  Deploy ใช้งานได้จริง
```

ทุกอย่างในลำดับนี้คือ Must have ทั้งหมด — ต้องเสร็จและใช้งานได้จริงบน Vercel ก่อนเริ่มทำรายการ Could have

---

## 9. User Stories และ Acceptance Criteria

### US-01 — Technician ปิด Alarm

> **As a** Technician, **I want to** ปิด Alarm พร้อมระบุสาเหตุ, **so that** ทีมซ่อมบำรุงรู้ว่าปัญหานั้นจบแล้วและรู้ว่าเกิดจากอะไร

| Acceptance Criteria | อ้างอิง |
|---|---|
| เลือกสถานะได้เฉพาะ Open / In Progress / Closed | REQ-ALM-02 |
| ต้องกรอก Cause ก่อนเปลี่ยนเป็น Closed | REQ-ALM-03 |
| ระบบบันทึก Closed By = ผู้ใช้ปัจจุบัน และ Closed At = เวลาของ server | REQ-ALM-04 |
| Alarm ที่ Closed แล้วเปลี่ยนสถานะอีกไม่ได้ (ปุ่มถูกปิดและ server ปฏิเสธ) | REQ-ALM-05 |

```
Given  มี Alarm รหัส ALM-001 สถานะ In Progress
When   Technician เปลี่ยนสถานะเป็น Closed โดยเว้น Cause ว่าง
Then   ระบบไม่บันทึก และแสดงข้อความ "กรุณาระบุสาเหตุก่อนปิด Alarm"

Given  มี Alarm รหัส ALM-001 สถานะ In Progress
When   Technician เปลี่ยนสถานะเป็น Closed และกรอก Cause = "Sensor เสีย"
Then   ระบบบันทึกสถานะ Closed, closed_by = user ปัจจุบัน, closed_at = เวลา server
And    Dashboard แสดงจำนวน Alarm ค้างลดลง 1 รายการ
```

### US-02 — Admin เพิ่ม Machine

> **As an** Admin, **I want to** เพิ่มเครื่องจักรเข้าระบบ, **so that** ทีมบันทึก Alarm และงานซ่อมอ้างอิงเครื่องเดียวกันได้

| Acceptance Criteria | อ้างอิง |
|---|---|
| ห้ามบันทึกเมื่อ Machine ID ซ้ำกับที่มีอยู่ | REQ-MCH-03 |
| ห้ามบันทึกเมื่อช่องจำเป็นว่าง | REQ-VAL-01 |
| Machine ID ต้องตรง pattern ที่กำหนด | REQ-VAL-02 |
| เมื่อบันทึกไม่สำเร็จ ค่าที่กรอกไว้ต้องยังอยู่ในฟอร์ม | NFR-USE-01 |

```
Given  มี Machine ID = M-001 อยู่ในระบบแล้ว
When   Admin เพิ่ม Machine ใหม่ด้วย Machine ID = M-001
Then   ระบบไม่บันทึกข้อมูล และแสดงข้อความ "Machine ID นี้มีอยู่แล้วในระบบ"
And    Unique Constraint ในฐานข้อมูลปฏิเสธคำสั่งด้วย แม้จะเรียก API ตรง
```

### US-03 — Manager ดูภาพรวมสถานะ

> **As a** Production Manager, **I want to** เห็นจำนวนเครื่องแยกตามสถานะและ Alarm ค้าง, **so that** ตัดสินใจเรื่องแผนผลิตของกะถัดไปได้

| Acceptance Criteria | อ้างอิง |
|---|---|
| Dashboard แสดง Total / Running / Stop / Alarm / Maintenance | REQ-DSH-01, REQ-DSH-02 |
| Dashboard แสดงจำนวน Alarm ค้างและงานซ่อมค้าง | REQ-DSH-03 |
| ข้อมูลสรุปแสดงครบภายใน 3 วินาทีภายใต้ข้อมูลทดสอบที่กำหนด | NFR-PERF-01 |
| Role Viewer เห็น Dashboard แต่ไม่เห็นปุ่มแก้ไข และเรียก Mutation ไม่สำเร็จ | REQ-BON-01, REQ-SEC-02 |

### US-04 — Technician ค้นประวัติซ่อมของเครื่อง

> **As a** Technician, **I want to** ดูประวัติ Alarm และงานซ่อมของเครื่องหนึ่งเครื่อง, **so that** รู้ว่าปัญหานี้เคยเกิดและเคยแก้ด้วยวิธีใด

| Acceptance Criteria | อ้างอิง |
|---|---|
| ค้นหา Machine ด้วย ID หรือ Name แล้วผลลัพธ์ตรงกับคำค้น | REQ-SRC-01 |
| หน้า Machine History แสดง Alarm และ Maintenance ของเครื่องนั้นเรียงตามเวลา | REQ-BON-03 |
| กรองประวัติตามช่วงวันที่ได้ | REQ-BON-08 |

### US-05 — Admin กำหนดสิทธิ์ผู้ใช้

> **As an** Admin, **I want to** กำหนด Role ของผู้ใช้, **so that** แต่ละคนเข้าถึงได้เฉพาะสิ่งที่ตรงกับหน้าที่

| Acceptance Criteria | อ้างอิง |
|---|---|
| ผู้ใช้ใหม่ได้ Role Viewer โดยอัตโนมัติ | REQ-AUTH-04 |
| Admin เปลี่ยน Role ของคนอื่นได้ แต่เปลี่ยนของตัวเองไม่ได้ | REQ-AUTH-05, REQ-AUTH-06 |
| เปิด URL `/users` ด้วย Role Technician แล้วต้องถูกปฏิเสธหรือ Redirect | REQ-SEC-02 |
| การเปลี่ยน Role ถูกบันทึกใน Audit Log | REQ-SEC-06 |

---

## 10. Business Rules

| ID | Rule | บังคับที่ |
|---|---|---|
| BR-01 | Machine ID ต้องไม่ซ้ำ | Client + Server Action + DB Unique Constraint |
| BR-02 | Alarm เปลี่ยนสถานะได้เฉพาะ Open → In Progress → Closed (ห้ามย้อนกลับ) | Server Action + CHECK constraint |
| BR-03 | ปิด Alarm ต้องมี Cause และระบบกำหนด closed_by/closed_at เอง | Server Action + CHECK constraint |
| BR-04 | Maintenance สถานะ Done ต้องมี Action Taken | Server Action + CHECK constraint |
| BR-05 | ห้ามลบ Machine ที่ยังมี Alarm สถานะ Open ค้างอยู่ | Server Action |
| BR-06 | Soft Delete: Machine ที่ถูกลบต้องไม่ปรากฏในรายการและตัวเลือก แต่ประวัติที่อ้างถึงยังอยู่ | Server Action + Query filter + FK `on delete restrict` |
| BR-07 | ห้ามผู้ใช้เปลี่ยน Role ของตัวเอง | Server Action + RLS Policy |
| BR-08 | Occurred At ของ Alarm ต้องไม่เป็นอนาคต | Client + Server Action |
| BR-09 | สถานะ Machine ที่มาจาก PLC/Simulator เป็นข้อมูลของระบบอัตโนมัติ — แก้ผ่านฟอร์มทั่วไปไม่ได้ | Server Action (แยก entry point) |

---

## 11. Open Questions

| # | คำถาม | ผู้ตอบ | สมมติฐานที่ใช้ไปก่อน |
|---|---|---|---|
| OQ-01 | ผู้ใช้สมัครเองได้ หรือ Admin สร้างบัญชีให้เท่านั้น? | อาจารย์ผู้สอน | **Admin สร้างให้** — ปิด Public Sign-up เพื่อลดความเสี่ยง และผู้ใช้ใหม่ได้ Role Viewer |
| OQ-02 | Alarm Code เป็นค่าอิสระ หรือต้องมีตาราง Master ของรหัส Alarm? | Maintenance Engineer | **ค่าอิสระ (text) ใน v1** แต่มี index เพื่อรองรับการ group ทำ Top Alarm Code |
| OQ-03 | ต้องส่งเอกสาร Mini Lab ของบทที่ 1–3 แยกจากตัวระบบหรือไม่? | อาจารย์ผู้สอน | **ทำไว้ใน `docs/` และสรุปลิงก์ใน README** เพื่อให้ครบทั้งสองกรณี |
| OQ-04 | หนึ่ง Alarm สร้างงานซ่อมได้มากกว่า 1 ใบหรือไม่? | Maintenance Engineer | **1 Alarm → 0..1 Maintenance** ใน v1 (ใส่ unique ที่ `alarm_id` ได้ทีหลังถ้ายืนยัน) |
| OQ-05 | ต้องเก็บ Audit Log ย้อนหลังนานเท่าไร? | System Admin | **ไม่ลบใน v1** เพราะข้อมูลปริมาณน้อย และยังไม่มีข้อกำหนด Retention |
| OQ-06 | กำหนดส่งงานวันไหน และมี Change Request ตอนนำเสนอหรือไม่? | อาจารย์ผู้สอน | เตรียมระบบให้รองรับ Change Request ตัวอย่างในโจทย์ล่วงหน้า (ดู NFR-MAINT-01) |

---

## 12. Requirement Review Checklist

| ข้อตรวจ | ผล | หมายเหตุ |
|---|---|---|
| ผู้ใช้และ Role ชัดเจน | ✅ | 3 Role + ตาราง Stakeholder §2 |
| แต่ละ Requirement มี Business Need รองรับ | ✅ | สืบกลับ Problem Statement §1 ได้ทุกกลุ่ม |
| Requirement ตรวจสอบได้ (เขียน Test ได้) | ✅ | ทุกข้อมี Acceptance Criteria หรือ Given-When-Then |
| ไม่มี Requirement ขัดกันหรือซ้ำกัน | ✅ | ตรวจคู่ REQ-MCH-05 กับ BR-06 แล้ว — ใช้ Soft Delete ร่วมกัน ไม่ขัดกัน |
| กำหนด Scope และ Priority แล้ว | ✅ | §6 Scope, §7 MoSCoW |
| ข้อมูลที่ต้องเก็บครบ | ✅ | แปลงเป็น Schema ใน [04-database-schema.md](04-database-schema.md) |
| มี Security / Validation / Error Case | ✅ | §4.7, §4.8, Failure Mode ใน [02-system-design.md](02-system-design.md) §6 |
| Open Questions ถูกปิดหรือระบุสมมติฐานไว้ | ⚠️ | ยังรอคำตอบ OQ-01, OQ-03, OQ-06 — ระบุสมมติฐานที่ใช้ไปก่อนแล้วทุกข้อ |
| Stakeholder หลักยอมรับ Requirement | ⚠️ | รอยืนยันกับอาจารย์ผู้สอน (ผู้รับมอบงาน) |

---

## 13. การใช้ AI ในขั้น Requirement

| ใช้ AI ช่วย | ไม่ให้ AI ตัดสินแทน |
|---|---|
| แตก Functional / Non-functional Requirement จากโจทย์ | ลำดับความสำคัญ (MoSCoW) และขอบเขต v1 |
| ร่าง User Story และ Acceptance Criteria แบบ Given-When-Then | กฎสิทธิ์ที่เกี่ยวกับความปลอดภัย (BR-07, REQ-SEC-*) |
| เสนอ Edge Case / Error Case ที่อาจลืม | สมมติฐานเรื่องกระบวนการจริงในโรงงาน (OQ-01…OQ-06) |
| ตรวจความครบถ้วนเทียบเกณฑ์การให้คะแนน | การยืนยัน Requirement ขั้นสุดท้าย |

---

## สรุป

Requirement ชุดนี้ให้ **Must have 38 ข้อ** ที่ครอบคลุมข้อกำหนด 3.1–3.12 ของโจทย์ครบทุกหัวข้อ พร้อม Non-functional 8 ข้อและ Business Rule 9 ข้อที่วัดผลได้ ทุก REQ-ID ถูกสืบกลับไปหา Design, Schema, หน้าจอ และ Test Case ใน [05-traceability.md](05-traceability.md)
