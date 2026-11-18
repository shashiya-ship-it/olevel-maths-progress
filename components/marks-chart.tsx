
"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export type Mark = {
  paper_name: string;
  exam_date: string;
  part01: number | null;
  part02: number | null;
  full_marks: number | null;
};

export function MarksChart({ marks }: { marks: Mark[] }) {
  const [showPart01, setShowPart01] = useState(true);
  const [showPart02, setShowPart02] = useState(true);
  const [showFull, setShowFull] = useState(true);

  const data = [...marks]
    .sort(
      (a, b) =>
        new Date(a.exam_date).getTime() -
        new Date(b.exam_date).getTime()
    )
    .map((mark) => ({
      paper: mark.paper_name,
      part01: mark.part01,
      part02: mark.part02,
      full_marks: mark.full_marks,
    }));

  return (
    <div className="w-full">
      <div className="mb-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowPart01((value) => !value)}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
            showPart01
              ? "border-blue-400 bg-blue-500/20 text-blue-300"
              : "border-slate-600 text-slate-400"
          }`}
        >
          {showPart01 ? "✓" : "+"} Part 01
        </button>

        <button
          type="button"
          onClick={() => setShowPart02((value) => !value)}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
            showPart02
              ? "border-amber-400 bg-amber-500/20 text-amber-300"
              : "border-slate-600 text-slate-400"
          }`}
        >
          {showPart02 ? "✓" : "+"} Part 02
        </button>

        <button
          type="button"
          onClick={() => setShowFull((value) => !value)}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
            showFull
              ? "border-green-400 bg-green-500/20 text-green-300"
              : "border-slate-600 text-slate-400"
          }`}
        >
          {showFull ? "✓" : "+"} Full Marks
        </button>
      </div>

      {data.length === 0 ? (
        <p className="muted py-10 text-center">
          No exam results available for the chart yet.
        </p>
      ) : (
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 12, left: 0, bottom: 8 }}
            >
              <CartesianGrid
                stroke="#26364c"
                strokeDasharray="4 4"
              />

              <XAxis
                dataKey="paper"
                stroke="#9aabc2"
                tick={{ fontSize: 11 }}
              />

              <YAxis
                domain={[0, 100]}
                stroke="#9aabc2"
                tick={{ fontSize: 11 }}
              />

              <Tooltip
                contentStyle={{
                  background: "#101d30",
                  border: "1px solid #34465e",
                  borderRadius: 12,
                }}
                formatter={(value) => [
                  value === null || value === undefined
                    ? "No marks"
                    : `${value}%`,
                  "Score",
                ]}
              />

              {showPart01 && (
                <Line
                  type="monotone"
                  dataKey="part01"
                  name="Part 01"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  connectNulls={false}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}

              {showPart02 && (
                <Line
                  type="monotone"
                  dataKey="part02"
                  name="Part 02"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  connectNulls={false}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}

              {showFull && (
                <Line
                  type="monotone"
                  dataKey="full_marks"
                  name="Full Marks"
                  stroke="#22c55e"
                  strokeWidth={3}
                  connectNulls={false}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
