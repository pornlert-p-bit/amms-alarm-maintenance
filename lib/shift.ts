/**
 * คำนวณ "กะการทำงาน" จากเวลา — ใช้แสดงในแถบสถานะ (แบบ One Card Station)
 * รูปแบบ 3 กะที่โรงงานไทยใช้บ่อย: เช้า 08–16, บ่าย 16–24, ดึก 00–08
 *
 * รับ "ชั่วโมง" (0–23) แทนการรับ Date ตรง ๆ
 * เพราะ Date บน server ของ Vercel เป็นเวลา UTC ไม่ใช่เวลาไทย — ให้ผู้เรียกเป็นคนแปลงเวลาเอง
 */
export type Shift = "เช้า" | "บ่าย" | "ดึก";

export function shiftOfHour(hour: number): Shift {
  if (!Number.isInteger(hour) || hour < 0 || hour > 23) {
    throw new RangeError(`ชั่วโมงต้องอยู่ระหว่าง 0–23 แต่ได้ ${hour}`);
  }
  if (hour >= 8 && hour < 16) return "เช้า";
  if (hour >= 16) return "บ่าย";
  return "ดึก";
}
