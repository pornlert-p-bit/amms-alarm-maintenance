/** กล่องแสดงว่าหน้านี้กำลังพัฒนา — ใช้ชั่วคราวระหว่างทำทีละ Module แล้วจะลบออกเมื่อหน้าเสร็จ */
export function ComingSoon({ title, due }: { title: string; due: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">อยู่ระหว่างพัฒนา — กำหนดเสร็จ {due}</p>
    </div>
  );
}
