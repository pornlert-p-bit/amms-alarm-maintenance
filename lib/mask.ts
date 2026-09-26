/**
 * ปิดบังข้อมูลส่วนบุคคลก่อนเขียนลง log
 * เช่น "somchai@factory.com" → "so***@factory.com"
 * ทำให้ยังพอรู้ว่าเป็นบัญชีไหน แต่คนที่เห็น log ไม่ได้อีเมลเต็ม
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  if (at <= 0) return "***";
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const visible = local.slice(0, Math.min(2, local.length - 1));
  return `${visible}***@${domain}`;
}
