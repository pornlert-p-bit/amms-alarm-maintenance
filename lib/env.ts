/**
 * อ่านค่า Environment ที่จำเป็นต่อการเชื่อม Supabase
 * ถ้าขาดค่า ให้ "พังเร็วพร้อมข้อความชัด" แทนที่จะไปพังแบบงง ๆ ตอน Login (Failure Mode FM-09)
 *
 * หมายเหตุ: ต้องอ้าง process.env.NEXT_PUBLIC_... แบบเขียนชื่อตรง ๆ
 * เพราะ Next.js จะแทนค่าตัวแปร NEXT_PUBLIC_ ลงในโค้ดตอน build ด้วยการค้นหาชื่อแบบตรงตัว
 */
export function getSupabasePublicEnv(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!publishableKey) missing.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (missing.length > 0) {
    throw new Error(
      `ขาดค่า Environment: ${missing.join(", ")} — ` +
        `ตั้งค่าใน .env.local (เครื่องตัวเอง) หรือ Vercel → Settings → Environment Variables ` +
        `ดูขั้นตอนใน docs/RUNBOOK.md`,
    );
  }

  return { url: url as string, publishableKey: publishableKey as string };
}
