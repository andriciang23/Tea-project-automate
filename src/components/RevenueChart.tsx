"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DayPoint } from "@/lib/analytics";

export function RevenueChart({ data }: { data: DayPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eef2f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickFormatter={(d: string) => d.slice(5)}
          />
          <YAxis tick={{ fontSize: 11 }} width={48} />
          <Tooltip />
          <Legend />
          <Area
            type="monotone"
            dataKey="shopify"
            stackId="1"
            stroke="#95bf47"
            fill="#95bf47"
            fillOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="shopee"
            stackId="1"
            stroke="#ee4d2d"
            fill="#ee4d2d"
            fillOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="lazada"
            stackId="1"
            stroke="#0f146d"
            fill="#0f146d"
            fillOpacity={0.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
