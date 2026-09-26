import { redirect } from "next/navigation";

// หน้าแรก "/" ไม่มีเนื้อหาของตัวเอง — ส่งต่อไปแดชบอร์ด (proxy จะพาไป Login ก่อนถ้ายังไม่ได้ Login)
export default function Home() {
  redirect("/dashboard");
}
