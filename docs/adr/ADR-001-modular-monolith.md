# ADR-001 — ใช้ Modular Monolith บน Next.js App Router สำหรับ v1

| | |
|---|---|
| **สถานะ** | Accepted |
| **วันที่** | 21 กันยายน 2569 |
| **ผู้ตัดสินใจ** | ผู้พัฒนา (ยืนยันด้วยตนเอง ไม่ใช้ข้อเสนอของ AI โดยไม่ตรวจ) |
| **เกี่ยวข้องกับ** | [ADR-002](ADR-002-server-mediated-mutations.md) · [ADR-004](ADR-004-plc-integration-boundary.md) |

## Context

- ทีมพัฒนา 1 คน ระยะเวลาจำกัด และ Requirement ยังมีโอกาสเปลี่ยน (มี Open Question ค้าง 3 ข้อ และโจทย์ระบุว่าอาจมี Change Request)
- Requirement บังคับ Stack ไว้แล้ว: Next.js + Tailwind CSS + Supabase + Vercel
- ระบบมี 7 Module แต่ปริมาณข้อมูลเล็ก (ระดับหลักสิบเครื่องจักร หลักร้อย–พัน Alarm) และมีผู้ใช้พร้อมกันไม่เกินหลักสิบ
- ไม่มีข้อกำหนดด้าน scale หรือ ownership ที่แยกทีมดูแลคนละส่วน

## Decision

พัฒนาเป็น **Modular Monolith** — Next.js Project เดียวที่ deploy เป็น Application เดียวบน Vercel โดยแบ่งขอบเขตภายในด้วยโฟลเดอร์ `features/<domain>/` ที่แต่ละ domain มี `actions.ts`, `queries.ts`, `rules.ts`, `schema.ts` และ `components/` ของตัวเอง

กฎที่ต้องรักษาเพื่อให้ยังเป็น "Modular":

1. Module หนึ่งห้าม import `queries.ts` หรือ `actions.ts` ของอีก Module โดยตรง — ถ้าต้องใช้ข้อมูลข้าม Module ให้ผ่านฟังก์ชันที่ Module เจ้าของข้อมูล export ไว้
2. Module `dashboard` เป็น **ผู้อ่านอย่างเดียว** ห้ามมี `actions.ts`
3. Module `integration` เป็นจุดเดียวที่คุยกับระบบภายนอก

## Alternatives ที่พิจารณา

| ทางเลือก | ข้อดี | เหตุที่ไม่เลือก |
|---|---|---|
| แยก Backend API เป็น service ต่างหาก | ขอบเขตชัด, reuse ได้หลาย client | ยังไม่มี client ที่สอง และเพิ่มงาน deploy/ดูแลอีกชุด |
| Microservices แยก Alarm / Maintenance | scale และ ownership แยกกันได้ | ไม่มีเหตุผลด้าน scale หรือ ownership รองรับ และเพิ่ม distributed complexity สูงมากเทียบกับขนาดงาน |
| Serverless Functions แยกต่อ use case | deploy เฉพาะส่วน, scale ตาม demand | Next.js Server Action ให้ผลคล้ายกันแล้วโดยไม่ต้องจัดการ function หลายตัวเอง |

## Consequences

**ผลบวก**
- พัฒนา ทดสอบ debug และ deploy จบในที่เดียว เหมาะกับข้อจำกัดด้านเวลา
- Transaction ครอบการเขียนข้อมูลกับ Audit Log ได้ในคำสั่งชุดเดียว ไม่ต้องทำ distributed transaction
- CI ชุดเดียวครอบทั้งระบบ (REQ-OPS-01)

**ผลลบ / สิ่งที่ต้องเฝ้าระวัง**
- ขอบเขต Module ถูกบังคับด้วยวินัยการเขียนโค้ดเท่านั้น ไม่มี network boundary มาบังคับ — ถ้าละเลยจะกลายเป็น monolith ที่พันกัน
- การ deploy ทุกครั้งกระทบทั้งระบบ (ยอมรับได้ในบริบทนี้)

**ตัวชี้วัดว่าการตัดสินใจนี้ยังถูกต้อง**
- ถ้าวันหนึ่งมีทีมอื่นต้องดูแล Module ใด Module หนึ่งแยกจากกัน หรือ Module ใดต้องการ scale ต่างจากส่วนอื่นอย่างชัดเจน → ให้กลับมาทบทวน ADR นี้
