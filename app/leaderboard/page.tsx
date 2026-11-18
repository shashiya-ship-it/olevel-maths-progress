
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type LeaderboardRow = {
  ranking_type: "paper" | "all_time";
  paper_id: number | null;
  paper_name: string;
  student_id: string;
  full_name: string;
  score: number;
  paper_count: number;
};

type PaperOption = {
  id: number;
  name: string;
};

type Mode = "all_time" | "paper";

export default function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [papers, setPapers] = useState<PaperOption[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("all_time");
  const [selectedPaper, setSelectedPaper] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadLeaderboard() {
      if (!supabase) {
        setError("Supabase connection is not configured.");
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();

      const { data, error: rpcError } = await supabase.rpc(
        "get_paper_leaderboard"
      );

      if (!active) return;

      setUserId(userData.user?.id ?? null);

      if (rpcError) {
        setError(rpcError.message);
        setLoading(false);
        return;
      }

      const result = (data ?? []) as LeaderboardRow[];

      setRows(result);

      const paperMap = new Map<number, string>();

      result
        .filter((row) => row.ranking_type === "paper" && row.paper_id !== null)
        .forEach((row) => {
          paperMap.set(Number(row.paper_id), row.paper_name);
        });

      const paperList = Array.from(paperMap.entries())
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => b.id - a.id);

      setPapers(paperList);

      if (paperList.length > 0) {
        setSelectedPaper(String(paperList[0].id));
      }

      setLoading(false);
    }

    loadLeaderboard();

    return () => {
      active = false;
    };
  }, []);

  const currentRows = rows
    .filter((row) => {
      if (mode === "all_time") {
        return row.ranking_type === "all_time";
      }

      return (
        row.ranking_type === "paper" &&
        String(row.paper_id) === selectedPaper
      );
    })
    .sort((a, b) => Number(b.score) - Number(a.score));

  const myRank = currentRows.findIndex(
    (row) => row.student_id === userId
  );

  const topThree = currentRows.slice(0, 3);

  function medal(index: number) {
    if (index === 0) return "🥇";
    if (index === 1) return "🥈";
    if (index === 2) return "🥉";
    return `#${index + 1}`;
  }

  function studentName(row: LeaderboardRow) {
    return row.full_name || "Student";
  }

  const selectedPaperName =
    papers.find((paper) => String(paper.id) === selectedPaper)?.name ??
    "Selected Paper";

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">

        {/* Navigation */}
        <Link
          href="/"
          className="text-sm font-medium text-cyan-400 hover:text-cyan-300"
        >
          ← Home
        </Link>

        {/* Heading */}
        <div className="mt-8 text-center">
          <div className="text-5xl">🏆</div>

          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Leaderboard
          </h1>

          <p className="mt-3 text-slate-400">
            See how students are performing.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-10 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-slate-300">
              Loading leaderboard...
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-8 rounded-xl border border-red-800 bg-red-950/40 p-5 text-red-300">
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Ranking Mode */}
            <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-5">

              <h2 className="text-lg font-bold">
                Select Leaderboard
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">

                <button
                  onClick={() => setMode("all_time")}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === "all_time"
                      ? "border-cyan-400 bg-cyan-950/40"
                      : "border-slate-700 bg-slate-800 hover:border-slate-500"
                  }`}
                >
                  <span className="text-2xl">🏆</span>

                  <p className="mt-2 font-bold">
                    All Time Best
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Average of all completed papers
                  </p>
                </button>

                <button
                  onClick={() => {
                    setMode("paper");

                    if (!selectedPaper && papers.length > 0) {
                      setSelectedPaper(String(papers[0].id));
                    }
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    mode === "paper"
                      ? "border-cyan-400 bg-cyan-950/40"
                      : "border-slate-700 bg-slate-800 hover:border-slate-500"
                  }`}
                >
                  <span className="text-2xl">📘</span>

                  <p className="mt-2 font-bold">
                    Paper Wise Ranking
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Select a paper to view rankings
                  </p>
                </button>
              </div>

              {/* Paper Selection */}
              {mode === "paper" && (
                <div className="mt-5">
                  <label
                    htmlFor="paper-select"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Select Paper
                  </label>

                  <select
                    id="paper-select"
                    value={selectedPaper}
                    onChange={(e) => setSelectedPaper(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white outline-none focus:border-cyan-400"
                  >
                    {papers.length === 0 && (
                      <option value="">
                        No papers with results
                      </option>
                    )}

                    {papers.map((paper) => (
                      <option key={paper.id} value={String(paper.id)}>
                        {paper.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Current Rank */}
            {myRank !== -1 && (
              <div className="mt-6 rounded-2xl border border-cyan-700 bg-cyan-950/30 p-6">
                <p className="text-sm text-cyan-300">
                  Your Current Rank
                </p>

                <div className="mt-2 flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-bold">
                      #{myRank + 1}
                    </h2>

                    <p className="mt-1 text-sm text-slate-300">
                      {Number(currentRows[myRank].score).toFixed(1)}%
                      {" "}
                      {mode === "all_time" ? "Overall Average" : "Paper Score"}
                    </p>
                  </div>

                  <div className="text-4xl">🎯</div>
                </div>
              </div>
            )}

            {/* Ranking Title */}
            <div className="mt-8">
              <h2 className="text-2xl font-bold">
                {mode === "all_time"
                  ? "🏆 All Time Best"
                  : `📘 ${selectedPaperName} Rankings`}
              </h2>

              <p className="mt-2 text-sm text-slate-400">
                {mode === "all_time"
                  ? "Students ranked by average percentage across completed papers."
                  : "Students ranked by their marks in this paper."}
              </p>
            </div>

            {/* Top 3 */}
            {topThree.length > 0 && (
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {topThree.map((row, index) => (
                  <div
                    key={row.student_id}
                    className={`rounded-2xl border p-5 text-center ${
                      index === 0
                        ? "border-yellow-600 bg-yellow-950/20"
                        : "border-slate-800 bg-slate-900"
                    }`}
                  >
                    <div className="text-4xl">
                      {medal(index)}
                    </div>

                    <h3 className="mt-3 break-words text-lg font-bold">
                      {studentName(row)}
                    </h3>

                    <p className="mt-2 text-3xl font-bold text-cyan-400">
                      {Number(row.score).toFixed(1)}%
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      {mode === "all_time"
                        ? `${row.paper_count} papers completed`
                        : "Paper score"}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Full Rankings */}
            <div className="mt-8 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900">

              <div className="border-b border-slate-800 p-5">
                <h2 className="text-xl font-bold">
                  Student Rankings
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {currentRows.length} students ranked
                </p>
              </div>

              {currentRows.length === 0 ? (
                <p className="p-8 text-center text-slate-400">
                  No student results available for this selection yet.
                </p>
              ) : (
                <div>
                  {currentRows.map((row, index) => {
                    const isMe = row.student_id === userId;

                    return (
                      <div
                        key={row.student_id}
                        className={`flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-4 last:border-0 sm:px-6 ${
                          isMe ? "bg-cyan-950/30" : ""
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 font-bold">
                            {medal(index)}
                          </div>

                          <div className="min-w-0">
                            <p className="break-words font-semibold">
                              {studentName(row)}

                              {isMe && (
                                <span className="ml-2 text-xs text-cyan-400">
                                  You
                                </span>
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {mode === "all_time"
                                ? `${row.paper_count} papers completed`
                                : "Paper result"}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold text-cyan-400">
                            {Number(row.score).toFixed(1)}%
                          </p>

                          <p className="text-xs text-slate-500">
                            {mode === "all_time"
                              ? "Average"
                              : "Paper Marks"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              Rankings are calculated from completed results entered by the administrator.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
