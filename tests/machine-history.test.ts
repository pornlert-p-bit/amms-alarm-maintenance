import { describe, expect, it } from "vitest";

import { buildTimeline, machineSummary, type HistoryAlarm, type HistoryJob } from "@/features/machine/timeline";

const alarm = (over: Partial<HistoryAlarm>): HistoryAlarm => ({
  id: "a1",
  alarm_code: "E-101",
  description: "Spindle vibration",
  occurred_at: "2026-09-20T03:00:00Z",
  status: "Open",
  cause: null,
  closed_at: null,
  closed_by: null,
  created_by: "u1",
  ...over,
});

const job = (over: Partial<HistoryJob>): HistoryJob => ({
  id: "j1",
  problem: "เปลี่ยนลูกปืน",
  status: "In Progress",
  maintained_at: "2026-09-20T04:00:00Z",
  action_taken: null,
  technician_id: "u2",
  updated_at: "2026-09-20T04:00:00Z",
  ...over,
});

describe("buildTimeline (REQ-BON-03)", () => {
  it("Alarm ที่ปิดแล้วมี 2 เหตุการณ์: เกิด และ ปิด พร้อมสาเหตุ", () => {
    const t = buildTimeline([alarm({ status: "Closed", cause: "ถ่วงสมดุล", closed_at: "2026-09-20T05:00:00Z", closed_by: "u2" })], [], []);
    expect(t.map((e) => e.kind)).toEqual(["alarm_closed", "alarm"]);
    expect(t[0]).toMatchObject({ detail: "ถ่วงสมดุล", actorId: "u2", tone: "neutral" });
  });

  it("Alarm ที่ยังค้างเป็นสีแดง และมีเหตุการณ์เดียว", () => {
    const t = buildTimeline([alarm({})], [], []);
    expect(t).toHaveLength(1);
    expect(t[0].tone).toBe("bad");
  });

  it("ใบงานที่ยังไม่เสร็จเป็นสีส้ม, ใบงานที่ Done มีเหตุการณ์ 'ซ่อมเสร็จ' ด้วย", () => {
    expect(buildTimeline([], [job({})], [])[0]).toMatchObject({ tone: "warn", title: "เข้าซ่อม (In Progress)" });
    const done = buildTimeline([], [job({ status: "Done", action_taken: "เปลี่ยนแล้ว", updated_at: "2026-09-20T06:00:00Z" })], []);
    expect(done.map((e) => e.title)).toEqual(["ซ่อมเสร็จ", "เข้าซ่อม"]);
  });

  it("รวมทุกแหล่งและเรียงใหม่สุดก่อน", () => {
    const t = buildTimeline(
      [alarm({ occurred_at: "2026-09-20T01:00:00Z" })],
      [job({ maintained_at: "2026-09-20T03:00:00Z" })],
      [{ from_status: "Running", to_status: "Maintenance", source: "manual", changed_by: "u1", changed_at: "2026-09-20T02:00:00Z" }],
    );
    expect(t.map((e) => e.kind)).toEqual(["job", "status", "alarm"]);
    expect(t[1].title).toBe("สถานะ Running → Maintenance");
  });

  it("การเปลี่ยนสถานะจาก PLC/Simulator ระบุแหล่งที่มา", () => {
    const t = buildTimeline([], [], [{ from_status: null, to_status: "Alarm", source: "plc", changed_by: null, changed_at: "2026-09-20T02:00:00Z" }]);
    expect(t[0]).toMatchObject({ title: "สถานะ — → Alarm", detail: "จาก PLC" });
  });

  it("ไม่มีข้อมูล → ไทม์ไลน์ว่าง", () => {
    expect(buildTimeline([], [], [])).toEqual([]);
  });
});

describe("machineSummary", () => {
  it("นับ Alarm, ค้าง, MTTR, งานซ่อม และรหัสที่เกิดบ่อยสุด", () => {
    const s = machineSummary(
      [
        alarm({ id: "1", status: "Closed", occurred_at: "2026-09-20T01:00:00Z", closed_at: "2026-09-20T01:30:00Z" }),
        alarm({ id: "2", status: "Closed", occurred_at: "2026-09-21T01:00:00Z", closed_at: "2026-09-21T02:30:00Z" }),
        alarm({ id: "3", alarm_code: "E-105" }),
      ],
      [job({}), job({ id: "j2", status: "Done" })],
    );
    expect(s).toEqual({
      alarms: 3,
      openAlarms: 1,
      mttrMinutes: 60, // (30 + 90) / 2
      jobs: 2,
      activeJobs: 1,
      topCode: { code: "E-101", count: 2 },
    });
  });

  it("ยังไม่มี Alarm ที่ปิด → MTTR = null, ไม่มี Alarm → topCode = null", () => {
    expect(machineSummary([], [])).toMatchObject({ mttrMinutes: null, topCode: null, alarms: 0 });
  });
});
