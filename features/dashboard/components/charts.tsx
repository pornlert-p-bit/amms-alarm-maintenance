"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/**
 * กราฟของหน้าภาพรวม (recharts ต้องวาดในเบราว์เซอร์ จึงเป็น Client Component)
 * สีตามหลัก ISA-101: แท่งเป็นสีเทา ใช้สีน้ำเงินเฉพาะเส้น % สะสมที่ต้องการให้อ่าน
 * ค่าสีคัดลอกจาก token ใน app/globals.css (SVG ของ recharts รับค่าสีตรง ๆ ได้แน่นอนกว่า CSS variable)
 */
const C = {
  bar: "#8b93a1", // เทากลาง — ข้อมูลปกติ
  grid: "#dde1e7", // --color-line
  tick: "#5b6270", // --color-muted
  accent: "#1a41c4", // --color-accent
  warn: "#e08a1e", // --color-warn — เส้นอ้างอิง 80%
};

const AXIS = { fontSize: 11, fill: C.tick };
const TOOLTIP_STYLE = { fontSize: 12, borderRadius: 3, borderColor: "#c9ced6" };

/** Alarm ต่อวัน (REQ-DSH-04) */
export function DailyAlarmChart({ data }: { data: { label: string; total: number }[] }) {
  const total = data.reduce((sum, d) => sum + d.total, 0);
  return (
    <div role="img" aria-label={`กราฟจำนวน Alarm ต่อวัน ${data.length} วัน รวม ${total} ครั้ง`} className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: C.grid }} interval="preserveStartEnd" minTickGap={8} />
          <YAxis allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <Tooltip cursor={{ fill: "#eef0f3" }} contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v} ครั้ง`, "Alarm"]} />
          <Bar dataKey="total" fill={C.bar} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Pareto ของรหัส Alarm (REQ-BON-02): แท่ง = จำนวนครั้ง, เส้น = % สะสม, เส้นประ = 80% */
export function ParetoChart({ data }: { data: { code: string; total: number; cumPct: number }[] }) {
  return (
    <div role="img" aria-label={`กราฟ Pareto รหัส Alarm: ${data.map((d) => `${d.code} ${d.total} ครั้ง`).join(", ")}`} className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: -16 }}>
          <CartesianGrid vertical={false} stroke={C.grid} />
          <XAxis dataKey="code" tick={{ ...AXIS, fontFamily: "ui-monospace, monospace" }} tickLine={false} axisLine={{ stroke: C.grid }} interval={0} />
          <YAxis yAxisId="n" allowDecimals={false} tick={AXIS} tickLine={false} axisLine={false} width={40} />
          <YAxis yAxisId="pct" orientation="right" domain={[0, 100]} ticks={[0, 50, 80, 100]} unit="%" tick={AXIS} tickLine={false} axisLine={false} width={44} />
          <Tooltip
            cursor={{ fill: "#eef0f3" }}
            contentStyle={TOOLTIP_STYLE}
            formatter={(v, name) => (name === "cumPct" ? [`${v}%`, "สะสม"] : [`${v} ครั้ง`, "จำนวน"])}
          />
          <ReferenceLine yAxisId="pct" y={80} stroke={C.warn} strokeDasharray="4 3" />
          <Bar yAxisId="n" dataKey="total" fill={C.bar} maxBarSize={36} isAnimationActive={false} />
          <Line yAxisId="pct" dataKey="cumPct" stroke={C.accent} strokeWidth={2} dot={{ r: 3, fill: C.accent }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
