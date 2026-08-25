"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { MonthlyTotal } from "@/lib/plays";

// Mirrors the tokens in globals.css — recharts renders these as raw SVG
// attributes, so CSS custom properties aren't reliably resolved here.
const COLOR_ACCENT = "#1db954";
const COLOR_BORDER = "#2c2c33";
const COLOR_TEXT_TERTIARY = "#75757f";
const COLOR_SURFACE = "#17171b";
const COLOR_TEXT_PRIMARY = "#f5f5f7";

export default function MonthlyChart({ data }: { data: MonthlyTotal[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-text-tertiary">
        No listening data yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={COLOR_BORDER} vertical={false} />
        <XAxis dataKey="month" stroke={COLOR_TEXT_TERTIARY} fontSize={12} tickLine={false} />
        <YAxis stroke={COLOR_TEXT_TERTIARY} fontSize={12} width={40} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={{
            background: COLOR_SURFACE,
            border: `1px solid ${COLOR_BORDER}`,
            borderRadius: 10,
            fontSize: 12,
            color: COLOR_TEXT_PRIMARY,
          }}
          labelStyle={{ color: COLOR_TEXT_PRIMARY, fontWeight: 600, marginBottom: 4 }}
          formatter={(value, name) => [
            name === "minutes" ? `${Number(value).toLocaleString()} min` : value,
            name === "minutes" ? "Listened" : "Plays",
          ]}
        />
        <Bar dataKey="minutes" fill={COLOR_ACCENT} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
