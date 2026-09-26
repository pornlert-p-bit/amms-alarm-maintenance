# ADR-002 — Mutation ทั้งหมดผ่าน Server Action โดยมี RLS เป็นชั้นบังคับสุดท้าย

| | |
|---|---|
| **สถานะ** | Accepted |
| **วันที่** | 21 กันยายน 2569 |
| **เกี่ยวข้องกับ** | [ADR-003](ADR-003-status-enum-and-db-constraints.md) · [ADR-005](ADR-005-audit-log-in-server-action.md) · [ADR-006](ADR-006-least-privilege-grants.md) |

## Context

Supabase มี Auto-generated Data API และ Client SDK ที่ให้ Browser อ่าน/เขียนฐานข้อมูลได้โดยตรงภายใต้ Auth Token และ RLS ซึ่งเป็นรูปแบบที่ใช้งานจริงและลดโค้ดได้มาก คำถามคือระบบนี้ควรใช้รูปแบบนั้นหรือให้ทุกอย่างผ่าน Server

ลักษณะการเขียนข้อมูลในระบบนี้:

- **ไม่มี** Mutation ใดที่เป็น CRUD เปล่า ๆ — ทุกตัวมีกฎผูกอยู่ (BR-01 ถึง BR-09)
- บาง field ต้องถูกกำหนดโดยระบบ ไม่ใช่โดยผู้ใช้: `created_by`, `closed_by`, `closed_at`
- ทุก Mutation สำคัญต้องเขียน Audit Log ควบคู่ (REQ-SEC-06)
- การเปลี่ยนสถานะต้องตรวจ Transition จากค่าปัจจุบัน ซึ่งต้องอ่านก่อนเขียนในบริบทที่เชื่อถือได้

## Decision

1. **การอ่าน** ใช้ Server Component query ฐานข้อมูลตรง ไม่สร้าง API ภายในครอบทุก Query
2. **การเขียนข้อมูลธุรกิจทั้งหมด** ผ่าน Server Action เท่านั้น
3. **Client เรียก Supabase ตรงได้เฉพาะ Auth** (`signInWithPassword`, `signOut`) ซึ่งไม่แตะข้อมูลธุรกิจ
4. Server Action ใช้ Supabase server client ที่ผูกกับ **session ของผู้ใช้** เป็นค่าตั้งต้น เพื่อให้ RLS ยังทำงาน — ไม่ใช้ Service Role Key เป็นทางผ่านสะดวก
5. Service Role Key ใช้เฉพาะงาน admin ที่ RLS ทำไม่ได้ และต้องเรียกจากไฟล์ที่มี `import 'server-only'`
6. **RLS ไม่ใช่ชั้นเดียว แต่เป็นชั้นสุดท้าย** — ออกแบบโดยสมมติว่า Server Action อาจมีบั๊ก ฐานข้อมูลต้องปฏิเสธได้ด้วยตัวเอง
7. Server Action รับเฉพาะ field ตาม allow-list และ **ไม่รับ** `created_by` / `closed_by` / `closed_at` / `role` จาก payload ของ client

## Alternatives ที่พิจารณา

| ทางเลือก | ข้อดี | เหตุที่ไม่เลือก |
|---|---|---|
| Client → Supabase ตรงทั้งหมด พึ่ง RLS | โค้ดน้อยที่สุด, latency ต่ำ, ทำ Realtime ง่าย | กฎเช่น "ตรวจ Transition จากสถานะปัจจุบัน" และ "เขียน Audit ควบคู่ในทรานแซกชันเดียว" ทำใน RLS ไม่ได้; และไม่มีทางกัน client ส่ง `closed_by` ปลอมได้หมด |
| Client ตรงสำหรับ Query ง่าย + Server สำหรับ Mutation | สมดุลระหว่างโค้ดน้อยและควบคุมได้ | ต้องดูแล Security Model สองแบบพร้อมกัน เพิ่มพื้นที่ผิดพลาดโดยแลกกับประโยชน์เล็กน้อย เพราะ Server Component อ่านได้อยู่แล้ว |
| สร้าง REST API ภายในครอบทุก endpoint | ขอบเขตชัดเจนตามแบบเดิม | ซ้ำซ้อนกับสิ่งที่ Server Component/Action ทำได้ เพิ่มโค้ดและ hop โดยไม่ได้อะไรเพิ่ม |

## Consequences

**ผลบวก**
- Business Rule, Authorization และ Audit อยู่จุดเดียวต่อ use case — อ่านและทดสอบง่าย
- ไม่มีทางที่ Client ปลอม `closed_by` หรือยกระดับ `role` ผ่าน payload
- พื้นที่ที่ต้องพึ่ง RLS โดยลำพังแคบลงมาก

**ผลลบ / สิ่งที่ต้องเฝ้าระวัง**
- โค้ดมากกว่าและมี hop เพิ่มเทียบกับเรียก Supabase ตรง
- เสียความสะดวกของ Realtime Subscription ฝั่ง Client (ยอมรับได้เพราะ v1 ไม่ทำ Realtime)
- ต้องระวังไม่ให้ Server Action กลายเป็นไฟล์ยักษ์ — แก้ด้วยการแยก `rules.ts` เป็นฟังก์ชันบริสุทธิ์

**ผลต่อการทดสอบ**
- กฎ Transition และ Validation อยู่ใน `rules.ts` / `schema.ts` ที่เป็น pure function → เขียน Unit Test ได้โดยไม่ต้องต่อฐานข้อมูล ใช้เป็น Test ที่รันใน CI
