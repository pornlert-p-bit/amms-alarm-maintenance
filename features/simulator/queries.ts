import "server-only";

import type { MachineStatus } from "@/features/machine/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** การอ่านข้อมูลหน้า PLC Simulator — เรียกหลัง requireAdmin() เท่านั้น */

export type SimMachine = {
  id: string;
  machine_id: string;
  machine_name: string;
  machine_type: string;
  location: string;
  status: MachineStatus;
};

export type SimEvent = {
  changed_at: string;
  from_status: MachineStatus | null;
  to_status: MachineStatus;
  machine: { machine_id: string } | null;
};

export async function getSimulatorData(): Promise<{ machines: SimMachine[]; events: SimEvent[] }> {
  const supabase = await createSupabaseServerClient();
  const [machines, events] = await Promise.all([
    supabase
      .from("machines")
      .select("id, machine_id, machine_name, machine_type, location, status")
      .is("deleted_at", null)
      .order("location")
      .order("machine_id"),
    // สัญญาณจำลองล่าสุด — ประวัติที่ trigger บันทึกว่ามาจาก simulator (migration 009)
    supabase
      .from("machine_status_history")
      .select("changed_at, from_status, to_status, machine:machines(machine_id)")
      .eq("source", "simulator")
      .order("changed_at", { ascending: false })
      .limit(10),
  ]);
  if (machines.error) {
    console.error(`getSimulatorData failed: code=${machines.error.code ?? "unknown"}`);
    throw new Error("โหลดข้อมูลเครื่องจักรไม่สำเร็จ");
  }
  return {
    machines: (machines.data ?? []) as SimMachine[],
    events: events.error ? [] : ((events.data ?? []) as unknown as SimEvent[]),
  };
}
