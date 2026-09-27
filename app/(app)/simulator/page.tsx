import type { Metadata } from "next";

import { GroupBox } from "@/components/station/group-box";
import { MachineStatusBadge } from "@/components/station/machine-status-badge";
import { PageTitle } from "@/components/station/page-title";
import { Notice, tableClass } from "@/components/station/ui";
import { SimPanel } from "@/features/simulator/components/sim-panel";
import { faultsFor } from "@/features/simulator/faults";
import { getSimulatorData } from "@/features/simulator/queries";
import { requireAdmin } from "@/lib/auth/dal";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "จำลอง PLC" };

/**
 * หน้า PLC Simulator — Admin เท่านั้น (ADR-004, REQ-BON-09)
 * ใช้แทนสัญญาณจาก PLC จริงในการสาธิตและทดสอบ workflow ครบวงจรโดยไม่มีอุปกรณ์
 */
export default async function SimulatorPage() {
  await requireAdmin();
  const { machines, events } = await getSimulatorData();

  return (
    <>
      <PageTitle title="จำลองสัญญาณ PLC" sub="PLC Simulator" />

      <Notice tone="info">
        <b>โหมดจำลอง — ยังไม่ได้เชื่อมต่อ PLC จริง</b> · สัญญาณจากหน้านี้วิ่งผ่านฟังก์ชันในฐานข้อมูล ซึ่งเป็นเส้นทางเดียวกับที่ PLC Gateway จะใช้เมื่อเชื่อมต่อจริง
        ทุกเหตุการณ์ถูกบันทึกว่ามาจาก <span className="font-mono">simulator</span> และ Alarm ที่เกิดจากหน้านี้มีป้าย &quot;จำลอง&quot;
      </Notice>

      <div className="space-y-6">
        <GroupBox title="เครื่องจักร" aside={`${machines.length} เครื่อง`}>
          {machines.length === 0 ? (
            <p className="py-6 text-center text-muted">ยังไม่มีเครื่องจักรในระบบ</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {machines.map((m) => (
                <SimPanel key={m.id} machine={m} faults={faultsFor(m.machine_type)} />
              ))}
            </ul>
          )}
        </GroupBox>

        <GroupBox title="สัญญาณจำลองล่าสุด" aside="10 รายการล่าสุด">
          {events.length === 0 ? (
            <p className="py-6 text-center text-muted">ยังไม่มีสัญญาณจำลอง</p>
          ) : (
            <div className={tableClass.wrap}>
              <table className={tableClass.table}>
                <thead>
                  <tr>
                    <th className={tableClass.th}>เวลา</th>
                    <th className={tableClass.th}>เครื่อง</th>
                    <th className={tableClass.th}>จาก</th>
                    <th className={tableClass.th}>เป็น</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e, i) => (
                    <tr key={`${e.changed_at}-${i}`}>
                      <td className={`${tableClass.td} ${tableClass.mono} whitespace-nowrap`}>{formatDateTime(e.changed_at)}</td>
                      <td className={`${tableClass.td} ${tableClass.mono} font-semibold`}>{e.machine?.machine_id ?? "—"}</td>
                      <td className={tableClass.td}>{e.from_status ? <MachineStatusBadge status={e.from_status} /> : "—"}</td>
                      <td className={tableClass.td}><MachineStatusBadge status={e.to_status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GroupBox>
      </div>
    </>
  );
}
