
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { MarksChart, type Mark } from "@/components/marks-chart";

type Profile = {
  id: string;
  full_name: string | null;
  role: string;
};

type Paper = {
  id: number;
  paper_name: string;
  paper_date: string;
  paper_type: string;
  total_marks: number;
};

type Part = {
  id: number;
  paper_id: number;
  part_name: string;
  total_marks: number;
  sort_order: number;
};

type PartMark = {
  student_id: string;
  part_id: number;
  obtained_marks: number;
};

type OldMark = {
  student_id: string;
  paper_id: number;
  obtained_marks: number;
};

type ClassAverage = {
  paper_id: number;
  class_average: number;
  student_count: number;
};

function getGrade(mark: number) {
  if (mark < 30) return { grade: "F", group: "Fail" };
  if (mark < 55) return { grade: "S", group: "Satisfactory" };
  if (mark < 65) return { grade: "C", group: "Credit" };
  if (mark < 75) return { grade: "B", group: "Good" };
  return { grade: "A", group: "Excellent" };
}

export default function Dashboard() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const [students, setStudents] = useState<Profile[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [partMarks, setPartMarks] = useState<PartMark[]>([]);
  const [oldMarks, setOldMarks] = useState<OldMark[]>([]);
  const [classAverages, setClassAverages] = useState<ClassAverage[]>([]);

  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedPaper, setSelectedPaper] = useState("");

  const [paperName, setPaperName] = useState("");
  const [paperDate, setPaperDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paperType, setPaperType] = useState("Monthly Test");

  const [newParts, setNewParts] = useState(["Part 01", "Part 02"]);

  // Edit Paper states
  const [editingPaperId, setEditingPaperId] = useState<number | null>(null);
  const [editPaperName, setEditPaperName] = useState("");
  const [editPaperDate, setEditPaperDate] = useState("");
  const [editPaperType, setEditPaperType] = useState("");
  const [editPartNames, setEditPartNames] = useState<Record<number, string>>({});

  const [enteredMarks, setEnteredMarks] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData(currentUserId?: string) {
    if (!supabase) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      router.replace("/login");
      return;
    }

    const currentId = currentUserId || authData.user.id;
    setUserId(currentId);

    const { data: myProfile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("id", currentId)
      .single();

    if (profileError || !myProfile) {
      setError("Could not load your profile.");
      setLoading(false);
      return;
    }

    const myRole = myProfile.role as string;

    setProfile(myProfile as Profile);
    setRole(myRole);

    const [
      paperRes,
      partRes,
      partMarkRes,
      oldMarkRes,
      classAverageRes,
    ] = await Promise.all([
      supabase
        .from("papers")
        .select("id, paper_name, paper_date, paper_type, total_marks")
        .order("paper_date", { ascending: false }),

      supabase
        .from("paper_parts")
        .select("id, paper_id, part_name, total_marks, sort_order")
        .order("sort_order"),

      supabase
        .from("part_marks")
        .select("student_id, part_id, obtained_marks"),

      supabase
        .from("marks")
        .select("student_id, paper_id, obtained_marks"),

      supabase.rpc("get_class_paper_averages"),
    ]);

    if (
      paperRes.error ||
      partRes.error ||
      partMarkRes.error ||
      oldMarkRes.error
    ) {
      console.error(
        paperRes.error ||
        partRes.error ||
        partMarkRes.error ||
        oldMarkRes.error
      );

      setError("Could not load results. Please refresh.");
      setLoading(false);
      return;
    }

    setPapers((paperRes.data || []) as Paper[]);
    setParts((partRes.data || []) as Part[]);
    setPartMarks((partMarkRes.data || []) as PartMark[]);
    setOldMarks((oldMarkRes.data || []) as OldMark[]);

    if (classAverageRes.error) {
      console.error("Class average error:", classAverageRes.error);
      setClassAverages([]);
    } else {
      setClassAverages((classAverageRes.data || []) as ClassAverage[]);
    }

    if (myRole === "admin") {
      const { data: studentData, error: studentError } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .eq("role", "student")
        .order("full_name");

      if (studentError) {
        console.error(studentError);
        setError("Could not load students.");
      } else {
        setStudents((studentData || []) as Profile[]);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const paperParts = useMemo(
    () => parts.filter((part) => part.paper_id === Number(selectedPaper)),
    [parts, selectedPaper]
  );

  // Automatically load previously saved marks when student and paper are selected.
  useEffect(() => {
    if (!selectedStudent || !selectedPaper) {
      setEnteredMarks({});
      return;
    }

    const existingMarks: Record<number, string> = {};

    parts
      .filter((part) => part.paper_id === Number(selectedPaper))
      .forEach((part) => {
        const existing = partMarks.find(
          (mark) =>
            mark.student_id === selectedStudent &&
            mark.part_id === part.id
        );

        if (existing) {
          existingMarks[part.id] = String(existing.obtained_marks);
        }
      });

    setEnteredMarks(existingMarks);
  }, [selectedStudent, selectedPaper, parts, partMarks]);

  function addPart() {
    setNewParts((previous) => [
      ...previous,
      `Part ${String(previous.length + 1).padStart(2, "0")}`,
    ]);
  }

  function removePart(index: number) {
    if (newParts.length <= 1) return;

    setNewParts((previous) => previous.filter((_, i) => i !== index));
  }

  function updatePartName(index: number, value: string) {
    setNewParts((previous) =>
      previous.map((part, i) => (i === index ? value : part))
    );
  }

  async function createPaper() {
    if (!supabase || saving) return;

    setError("");
    setMessage("");

    if (!paperName.trim()) {
      setError("Please enter a paper name.");
      return;
    }

    if (newParts.some((part) => !part.trim()) || !newParts.length) {
      setError("Please enter all Part names.");
      return;
    }

    setSaving(true);

    const { data: paper, error: paperError } = await supabase
      .from("papers")
      .insert({
        paper_name: paperName.trim(),
        paper_date: paperDate,
        paper_type: paperType,
        total_marks: 100,
        created_by: userId,
      })
      .select("id")
      .single();

    if (paperError || !paper) {
      setError(paperError?.message || "Could not create paper.");
      setSaving(false);
      return;
    }

    const partRows = newParts.map((name, index) => ({
      paper_id: paper.id,
      part_name: name.trim(),
      total_marks: 100,
      sort_order: index + 1,
    }));

    const { error: partsError } = await supabase
      .from("paper_parts")
      .insert(partRows);

    if (partsError) {
      console.error(partsError);
      setError(
        "Paper was created, but Parts could not be saved. Please contact support before creating it again."
      );
      setSaving(false);
      return;
    }

    setPaperName("");
    setNewParts(["Part 01", "Part 02"]);
    setMessage("Paper and Parts created successfully!");

    await loadData(userId);
    setSaving(false);
  }

  // Start editing a paper.
  function startEditPaper(paper: Paper) {
    setEditingPaperId(paper.id);
    setEditPaperName(paper.paper_name);
    setEditPaperDate(paper.paper_date);
    setEditPaperType(paper.paper_type);

    const names: Record<number, string> = {};

    parts
      .filter((part) => part.paper_id === paper.id)
      .forEach((part) => {
        names[part.id] = part.part_name;
      });

    setEditPartNames(names);
    setError("");
    setMessage("");
  }

  function cancelEditPaper() {
    setEditingPaperId(null);
    setEditPaperName("");
    setEditPaperDate("");
    setEditPaperType("");
    setEditPartNames({});
  }

  // Save paper changes.
  async function updatePaper(paperId: number) {
    if (!supabase || saving) return;

    if (!editPaperName.trim()) {
      setError("Please enter a paper name.");
      return;
    }

    if (!editPaperDate || !editPaperType) {
      setError("Please complete all paper details.");
      return;
    }

    if (Object.values(editPartNames).some((name) => !name.trim())) {
      setError("Part names cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: paperError } = await supabase
      .from("papers")
      .update({
        paper_name: editPaperName.trim(),
        paper_date: editPaperDate,
        paper_type: editPaperType,
      })
      .eq("id", paperId);

    if (paperError) {
      setError(paperError.message);
      setSaving(false);
      return;
    }

    for (const [partId, partName] of Object.entries(editPartNames)) {
      const { error: partError } = await supabase
        .from("paper_parts")
        .update({ part_name: partName.trim() })
        .eq("id", Number(partId));

      if (partError) {
        setError(
          `Paper details were updated, but a Part name could not be updated: ${partError.message}`
        );
        setSaving(false);
        await loadData(userId);
        return;
      }
    }

    cancelEditPaper();
    setMessage("Paper updated successfully!");

    await loadData(userId);
    setSaving(false);
  }

  // Delete a paper and its related marks and Parts.
  async function deletePaper(paper: Paper) {
    if (!supabase || saving) return;

    const confirmed = window.confirm(
      `Delete "${paper.paper_name}" and ALL its student marks? This cannot be undone.`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    const paperPartIds = parts
      .filter((part) => part.paper_id === paper.id)
      .map((part) => part.id);

    if (paperPartIds.length > 0) {
      const { error: partMarksError } = await supabase
        .from("part_marks")
        .delete()
        .in("part_id", paperPartIds);

      if (partMarksError) {
        setError(partMarksError.message);
        setSaving(false);
        return;
      }
    }

    const { error: oldMarksError } = await supabase
      .from("marks")
      .delete()
      .eq("paper_id", paper.id);

    if (oldMarksError) {
      setError(oldMarksError.message);
      setSaving(false);
      return;
    }

    const { error: partsDeleteError } = await supabase
      .from("paper_parts")
      .delete()
      .eq("paper_id", paper.id);

    if (partsDeleteError) {
      setError(partsDeleteError.message);
      setSaving(false);
      return;
    }

    const { error: paperDeleteError } = await supabase
      .from("papers")
      .delete()
      .eq("id", paper.id);

    if (paperDeleteError) {
      setError(paperDeleteError.message);
      setSaving(false);
      return;
    }

    if (editingPaperId === paper.id) {
      cancelEditPaper();
    }

    if (selectedPaper === String(paper.id)) {
      setSelectedPaper("");
      setEnteredMarks({});
    }

    setMessage("Paper and its marks deleted successfully!");

    await loadData(userId);
    setSaving(false);
  }

  // Delete one Part mark.
  async function deletePartMark(
    studentId: string,
    partId: number,
    partName: string
  ) {
    if (!supabase || saving) return;

    const confirmed = window.confirm(
      `Delete ${partName} mark for this student?`
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("part_marks")
      .delete()
      .eq("student_id", studentId)
      .eq("part_id", partId);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }

    setMessage(`${partName} mark deleted.`);

    await loadData(userId);
    setSaving(false);
  }

  // Delete an old-style paper mark.
  async function deleteOldMark(studentId: string, paperId: number) {
    if (!supabase || saving) return;

    const confirmed = window.confirm(
      "Delete this student's marks for this paper?"
    );

    if (!confirmed) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("marks")
      .delete()
      .eq("student_id", studentId)
      .eq("paper_id", paperId);

    if (deleteError) {
      setError(deleteError.message);
      setSaving(false);
      return;
    }

    setMessage("Student marks deleted.");

    await loadData(userId);
    setSaving(false);
  }

  async function saveMarks() {
    if (!supabase || saving) return;

    setError("");
    setMessage("");

    if (!selectedStudent || !selectedPaper) {
      setError("Please select a student and a paper.");
      return;
    }

    if (!paperParts.length) {
      setError("This paper has no Parts.");
      return;
    }

    const rows: {
      student_id: string;
      part_id: number;
      obtained_marks: number;
      created_by: string;
    }[] = [];

    for (const part of paperParts) {
      const rawValue = enteredMarks[part.id];

      if (rawValue === undefined || rawValue.trim() === "") {
        setError(`Please enter marks for ${part.part_name}.`);
        return;
      }

      const value = Number(rawValue);

      if (!Number.isFinite(value) || value < 0 || value > 100) {
        setError(`${part.part_name}: marks must be between 0 and 100.`);
        return;
      }

      rows.push({
        student_id: selectedStudent,
        part_id: part.id,
        obtained_marks: value,
        created_by: userId,
      });
    }

    setSaving(true);

    const { error: saveError } = await supabase
      .from("part_marks")
      .upsert(rows, {
        onConflict: "student_id,part_id",
      });

    if (saveError) {
      console.error(saveError);
      setError(saveError.message);
      setSaving(false);
      return;
    }

    setMessage("All Part marks saved successfully!");

    await loadData(userId);
    setSaving(false);
  }

  async function logout() {
    if (!supabase) return;

    await supabase.auth.signOut();
    router.replace("/login");
  }

  function getPaperResult(studentId: string, paper: Paper) {
    const paperPartsList = parts.filter(
      (part) => part.paper_id === paper.id
    );

    if (paperPartsList.length > 0) {
      const results = paperPartsList.map((part) => {
        const mark = partMarks.find(
          (item) =>
            item.student_id === studentId &&
            item.part_id === part.id
        );

        return {
          part,
          obtained: mark ? Number(mark.obtained_marks) : null,
        };
      });

      const completed = results.filter(
        (item) => item.obtained !== null
      );

      const total = completed.reduce(
        (sum, item) => sum + (item.obtained || 0),
        0
      );

      const average = completed.length
        ? total / completed.length
        : null;

      return {
        results,
        completed: completed.length,
        totalParts: paperPartsList.length,
        average,
        isComplete: completed.length === paperPartsList.length,
        legacy: false,
      };
    }

    const oldMark = oldMarks.find(
      (item) =>
        item.student_id === studentId &&
        item.paper_id === paper.id
    );

    return {
      results: [],
      completed: oldMark ? 1 : 0,
      totalParts: 1,
      average: oldMark
        ? (Number(oldMark.obtained_marks) /
            Number(paper.total_marks)) *
          100
        : null,
      isComplete: Boolean(oldMark),
      legacy: true,
    };
  }

  const visibleResults =
    role === "admin" ? students : profile ? [profile] : [];

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-5 sm:p-8">
        <p className="muted">Loading dashboard...</p>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl p-5 sm:p-8">
        <p className="text-red-400">
          {error || "Could not load dashboard."}
        </p>

        <Link href="/login" className="mt-4 inline-block text-cyan-400">
          Go to Login
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl overflow-x-hidden px-3 py-5 sm:px-5 sm:py-8 md:px-8">
      {/* HEADER */}
      <header className="mb-6 flex flex-col gap-5 border-b border-slate-800 pb-5 sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:pb-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-widest text-cyan-300 sm:text-sm">
            O/L MATHEMATICS
          </p>

          <h1 className="mt-2 break-words text-2xl font-bold sm:text-3xl">
            {role === "admin" ? "Admin Dashboard" : "Student Dashboard"}
          </h1>

          <p className="muted mt-2 break-words text-sm">
            Welcome, {profile.full_name || "User"}
          </p>
        </div>

        <nav className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
          <Link
            href="/"
            className="flex min-h-11 items-center justify-center rounded-xl border border-slate-600 px-2 py-2 text-center text-sm transition hover:bg-slate-800 sm:px-4"
          >
            Home
          </Link>

          <Link
            href="/leaderboard"
            className="flex min-h-11 items-center justify-center rounded-xl border border-slate-600 px-2 py-2 text-center text-sm transition hover:bg-slate-800 sm:px-4"
          >
            Leaderboard
          </Link>

          <button
            onClick={logout}
            className="min-h-11 rounded-xl bg-red-500 px-2 py-2 text-sm font-semibold text-white transition hover:bg-red-600 sm:px-4"
          >
            Logout
          </button>
        </nav>
      </header>

      {error && (
        <div className="mb-5 break-words rounded-xl border border-red-700 bg-red-950/30 p-3 text-sm text-red-200 sm:p-4">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 break-words rounded-xl border border-green-700 bg-green-950/30 p-3 text-sm text-green-200 sm:p-4">
          {message}
        </div>
      )}

      {/* ADMIN AREA */}
      {role === "admin" && (
        <>
          {/* STUDENTS */}
          <section className="panel mb-6 p-3 sm:mb-8 sm:p-5">
            <h2 className="mb-4 text-lg font-bold sm:text-xl">
              Registered Students ({students.length})
            </h2>

            {students.length === 0 ? (
              <p className="muted">No students registered yet.</p>
            ) : (
              <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                  <div
                    key={student.id}
                    className="min-w-0 rounded-xl border border-slate-700 p-3"
                  >
                    <p className="break-words font-semibold">
                      {student.full_name || "Student"}
                    </p>
                    <p className="muted mt-1 text-xs">Student account</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* CREATE PAPER */}
          <section className="panel mb-6 p-3 sm:mb-8 sm:p-5">
            <h2 className="mb-4 text-lg font-bold sm:text-xl">
              Create New Paper
            </h2>

            <div className="grid min-w-0 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="min-w-0">
                <label className="mb-2 block text-sm">Paper Name</label>
                <input
                  value={paperName}
                  onChange={(e) => setPaperName(e.target.value)}
                  placeholder="Example: Monthly Test 01"
                  className="w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 p-3"
                />
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-sm">Paper Date</label>
                <input
                  type="date"
                  value={paperDate}
                  onChange={(e) => setPaperDate(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 p-3"
                />
              </div>

              <div className="min-w-0 md:col-span-2 lg:col-span-1">
                <label className="mb-2 block text-sm">Paper Type</label>
                <select
                  value={paperType}
                  onChange={(e) => setPaperType(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 p-3"
                >
                  <option>Monthly Test</option>
                  <option>Term Test</option>
                  <option>Model Paper</option>
                  <option>Past Paper</option>
                  <option>Other</option>
                </select>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">Paper Parts</h3>

                <button
                  type="button"
                  onClick={addPart}
                  className="min-h-10 rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950"
                >
                  + Add Part
                </button>
              </div>

              <div className="space-y-3">
                {newParts.map((part, index) => (
                  <div
                    key={index}
                    className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3"
                  >
                    <span className="muted w-6 shrink-0">{index + 1}.</span>

                    <input
                      value={part}
                      onChange={(e) =>
                        updatePartName(index, e.target.value)
                      }
                      className="min-w-0 flex-1 rounded-xl border border-slate-600 bg-slate-900 p-3"
                    />

                    <span className="muted whitespace-nowrap text-xs sm:text-sm">
                      100 marks
                    </span>

                    <button
                      type="button"
                      onClick={() => removePart(index)}
                      disabled={newParts.length <= 1}
                      className="min-h-10 rounded-lg border border-red-700 px-3 py-2 text-sm text-red-300 disabled:opacity-30"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <p className="muted mt-4 text-xs sm:text-sm">
                Each Part is marked out of 100. Final paper result is
                the average of all Parts, also out of 100.
              </p>

              <button
                onClick={createPaper}
                disabled={saving}
                className="mt-5 min-h-11 w-full rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 disabled:opacity-50 sm:w-auto"
              >
                {saving ? "Saving..." : "Create Paper"}
              </button>
            </div>
          </section>

          {/* MANAGE PAPERS */}
          <section className="panel mb-6 p-3 sm:mb-8 sm:p-5">
            <h2 className="mb-4 text-lg font-bold sm:text-xl">
              Manage Papers
            </h2>

            {papers.length === 0 ? (
              <p className="muted">No papers available.</p>
            ) : (
              <div className="space-y-4">
                {papers.map((paper) => (
                  <div
                    key={paper.id}
                    className="rounded-xl border border-slate-700 p-3 sm:p-4"
                  >
                    {editingPaperId === paper.id ? (
                      <div className="space-y-3">
                        <label className="block text-sm">
                          Paper Name
                          <input
                            value={editPaperName}
                            onChange={(e) =>
                              setEditPaperName(e.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 p-3"
                          />
                        </label>

                        <label className="block text-sm">
                          Paper Date
                          <input
                            type="date"
                            value={editPaperDate}
                            onChange={(e) =>
                              setEditPaperDate(e.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 p-3"
                          />
                        </label>

                        <label className="block text-sm">
                          Paper Type
                          <select
                            value={editPaperType}
                            onChange={(e) =>
                              setEditPaperType(e.target.value)
                            }
                            className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 p-3"
                          >
                            <option>Monthly Test</option>
                            <option>Term Test</option>
                            <option>Model Paper</option>
                            <option>Past Paper</option>
                            <option>Other</option>
                          </select>
                        </label>

                        {parts
                          .filter((part) => part.paper_id === paper.id)
                          .map((part) => (
                            <label key={part.id} className="block text-sm">
                              {`Part name (${part.part_name})`}
                              <input
                                value={editPartNames[part.id] ?? ""}
                                onChange={(e) =>
                                  setEditPartNames((previous) => ({
                                    ...previous,
                                    [part.id]: e.target.value,
                                  }))
                                }
                                className="mt-2 w-full rounded-xl border border-slate-600 bg-slate-900 p-3"
                              />
                            </label>
                          ))}

                        <div className="flex flex-wrap gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => updatePaper(paper.id)}
                            disabled={saving}
                            className="min-h-10 rounded-xl bg-green-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                          >
                            {saving ? "Saving..." : "Save Changes"}
                          </button>

                          <button
                            type="button"
                            onClick={cancelEditPaper}
                            disabled={saving}
                            className="min-h-10 rounded-xl border border-slate-600 px-4 py-2 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                        <div className="min-w-0">
                          <p className="break-words font-semibold">
                            {paper.paper_name}
                          </p>
                          <p className="muted mt-1 text-xs">
                            {paper.paper_date} · {paper.paper_type}
                          </p>
                          <p className="muted mt-1 text-xs">
                            {parts.filter((part) => part.paper_id === paper.id).length} Parts
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => startEditPaper(paper)}
                            disabled={saving}
                            className="min-h-10 rounded-xl border border-cyan-500 px-4 py-2 text-sm text-cyan-300 disabled:opacity-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deletePaper(paper)}
                            disabled={saving}
                            className="min-h-10 rounded-xl border border-red-600 px-4 py-2 text-sm text-red-300 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ENTER MARKS */}
          <section className="panel mb-6 p-3 sm:mb-8 sm:p-5">
            <h2 className="mb-4 text-lg font-bold sm:text-xl">
              Enter Student Marks
            </h2>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <div className="min-w-0">
                <label className="mb-2 block text-sm">Select Student</label>

                <select
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 p-3"
                >
                  <option value="">Choose Student</option>

                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.full_name || "Student"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="min-w-0">
                <label className="mb-2 block text-sm">Select Paper</label>

                <select
                  value={selectedPaper}
                  onChange={(e) => setSelectedPaper(e.target.value)}
                  className="w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 p-3"
                >
                  <option value="">Choose Paper</option>

                  {papers.map((paper) => (
                    <option key={paper.id} value={paper.id}>
                      {paper.paper_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedPaper && (
              <div className="mt-5 space-y-3">
                {paperParts.length > 0 ? (
                  paperParts.map((part) => (
                    <div
                      key={part.id}
                      className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700 p-3"
                    >
                      <div className="min-w-0">
                        <p className="break-words font-semibold">
                          {part.part_name}
                        </p>
                        <p className="muted text-xs">Marks out of 100</p>
                      </div>

                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={enteredMarks[part.id] ?? ""}
                        onChange={(e) =>
                          setEnteredMarks((previous) => ({
                            ...previous,
                            [part.id]: e.target.value,
                          }))
                        }
                        placeholder="Enter marks"
                        className="w-full min-w-0 rounded-xl border border-slate-600 bg-slate-900 p-3 sm:w-36"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-amber-300">
                    This is an older paper without Parts. Its old marks
                    remain available in the results below.
                  </p>
                )}

                {paperParts.length > 0 && (
                  <button
                    onClick={saveMarks}
                    disabled={saving || !selectedStudent}
                    className="min-h-11 w-full rounded-xl bg-green-500 px-6 py-3 font-bold text-white disabled:opacity-50 sm:w-auto"
                  >
                    {saving ? "Saving..." : "Save / Update All Part Marks"}
                  </button>
                )}
              </div>
            )}
          </section>
        </>
      )}

      {/* RESULTS */}
      <section className="space-y-5 sm:space-y-6">
        <h2 className="text-xl font-bold sm:text-2xl">
          {role === "admin" ? "Student Results" : "My Results"}
        </h2>

        {role === "admin" && students.length > 0 && (
          <div className="panel p-3 sm:p-4">
            <label className="mb-2 block text-sm">
              Select student to view results
            </label>

            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full rounded-xl border border-slate-600 bg-slate-900 p-3"
            >
              <option value="">Choose Student</option>

              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name || "Student"}
                </option>
              ))}
            </select>
          </div>
        )}

        {visibleResults
          .filter(
            (student) =>
              role !== "admin" || student.id === selectedStudent
          )
          .map((student) => {
            const studentResults = papers
              .map((paper) => ({
                paper,
                result: getPaperResult(student.id, paper),
              }))
              .filter((item) => item.result.completed > 0);

            const chartMarks: Mark[] = papers
              .map((paper) => {
                const paperPartsList = parts
                  .filter((part) => part.paper_id === paper.id)
                  .sort((a, b) => a.sort_order - b.sort_order);

                if (paperPartsList.length > 0) {
                  const partValues = paperPartsList.map((part) => {
                    const mark = partMarks.find(
                      (item) =>
                        item.student_id === student.id &&
                        item.part_id === part.id
                    );

                    return mark ? Number(mark.obtained_marks) : null;
                  });

                  const allPartsCompleted = partValues.every(
                    (value) => value !== null
                  );

                  const fullMarks = allPartsCompleted
                    ? partValues.reduce(
                        (sum, value) => sum + (value ?? 0),
                        0
                      ) / paperPartsList.length
                    : null;

                  return {
                    paper_name: paper.paper_name,
                    exam_date: paper.paper_date,
                    part01: partValues[0] ?? null,
                    part02: partValues[1] ?? null,
                    full_marks: fullMarks,
                  };
                }

                const oldMark = oldMarks.find(
                  (item) =>
                    item.student_id === student.id &&
                    item.paper_id === paper.id
                );

                return {
                  paper_name: paper.paper_name,
                  exam_date: paper.paper_date,
                  part01: null,
                  part02: null,
                  full_marks: oldMark
                    ? (Number(oldMark.obtained_marks) /
                        Number(paper.total_marks)) *
                      100
                    : null,
                };
              })
              .filter(
                (mark) =>
                  mark.part01 !== null ||
                  mark.part02 !== null ||
                  mark.full_marks !== null
              );

            const completeResults = studentResults.filter(
              (item) => item.result.isComplete
            );

            const totalAverage = completeResults.length
              ? completeResults.reduce(
                  (sum, item) => sum + (item.result.average || 0),
                  0
                ) / completeResults.length
              : 0;

            return (
              <div key={student.id} className="min-w-0 space-y-4">
                {/* SUMMARY CARDS */}
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 sm:gap-4">
                  <div className="panel min-w-0 p-4">
                    <p className="muted text-sm">Papers completed</p>
                    <p className="mt-2 text-2xl font-bold">
                      {completeResults.length}
                    </p>
                  </div>

                  <div className="panel min-w-0 p-4">
                    <p className="muted text-sm">Average result</p>
                    <p className="mt-2 text-2xl font-bold">
                      {completeResults.length
                        ? `${totalAverage.toFixed(2)}%`
                        : "—"}
                    </p>
                  </div>

                  <div className="panel min-w-0 p-4 sm:col-span-2 lg:col-span-1">
                    <p className="muted text-sm">Student</p>
                    <p className="mt-2 break-words text-lg font-bold">
                      {student.full_name || "Student"}
                    </p>
                  </div>
                </div>

                {/* CHART */}
                <div className="panel min-w-0 overflow-hidden p-3 sm:p-5">
                  <h3 className="mb-2 text-lg font-bold sm:text-xl">
                    Marks Progress Curve
                  </h3>

                  <p className="muted mb-4 text-xs sm:text-sm">
                    Turn each curve on or off to compare your progress.
                  </p>

                  <div className="w-full min-w-0 overflow-hidden">
                    <MarksChart marks={chartMarks} />
                  </div>
                </div>

                {studentResults.length === 0 ? (
                  <div className="panel p-5 sm:p-6">
                    <p className="muted">No results available yet.</p>
                  </div>
                ) : (
                  studentResults.map(({ paper, result }) => {
                    const grade = result.isComplete
                      ? getGrade(Number(result.average || 0))
                      : null;

                    const classAverage = classAverages.find(
                      (item) => item.paper_id === paper.id
                    );

                    return (
                      <div
                        key={paper.id}
                        className="panel min-w-0 overflow-hidden p-3 sm:p-5"
                      >
                        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="min-w-0">
                            <h3 className="break-words text-lg font-bold">
                              {paper.paper_name}
                            </h3>

                            <p className="muted mt-1 text-xs sm:text-sm">
                              {paper.paper_date} · {paper.paper_type}
                            </p>
                          </div>

                          {/* FINAL RESULT + CLASS AVERAGE */}
                          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:min-w-[340px]">
                            <div className="min-w-0 rounded-xl border border-cyan-500/20 bg-cyan-950/10 p-3 sm:text-right">
                              <p className="text-xs text-slate-400">
                                Final Paper Result
                              </p>

                              <p className="mt-1 break-words text-xl font-bold text-cyan-300 sm:text-2xl">
                                {result.isComplete
                                  ? `${(result.average || 0).toFixed(2)} / 100`
                                  : `${result.completed}/${result.totalParts} Parts`}
                              </p>

                              <p className="muted text-xs">
                                {result.isComplete
                                  ? "Final result"
                                  : "Marks not complete"}
                              </p>
                            </div>

                            <div className="min-w-0 rounded-xl border border-emerald-500/20 bg-emerald-950/10 p-3 sm:text-right">
                              <p className="text-xs text-slate-400">
                                Class Average
                              </p>

                              <p className="mt-1 break-words text-xl font-bold text-emerald-400 sm:text-2xl">
                                {classAverage
                                  ? `${Number(classAverage.class_average).toFixed(2)} / 100`
                                  : "—"}
                              </p>

                              <p className="muted text-xs">
                                {classAverage
                                  ? `${classAverage.student_count} students completed`
                                  : "No completed results"}
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* GRADE */}
                        {grade && (
                          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-3 sm:p-4">
                            <div>
                              <p className="text-sm text-slate-400">
                                Final Grade
                              </p>

                              <p className="mt-1 font-semibold text-cyan-300">
                                {grade.group}
                              </p>
                            </div>

                            <span className="text-3xl font-bold text-cyan-400 sm:text-4xl">
                              {grade.grade}
                            </span>
                          </div>
                        )}

                        {/* PART RESULTS */}
                        {!result.legacy && (
                          <div className="mt-5 space-y-3">
                            {result.results.map(({ part, obtained }) => (
                              <div
                                key={part.id}
                                className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-700 pt-3"
                              >
                                <span className="min-w-0 break-words text-sm sm:text-base">
                                  {part.part_name}
                                </span>

                                <div className="flex shrink-0 items-center gap-2">
                                  <strong className="text-sm sm:text-base">
                                    {obtained === null
                                      ? "Not entered"
                                      : `${obtained} / 100`}
                                  </strong>

                                  {role === "admin" && obtained !== null && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        deletePartMark(
                                          student.id,
                                          part.id,
                                          part.part_name
                                        )
                                      }
                                      disabled={saving}
                                      className="rounded-lg border border-red-700 px-2 py-1 text-xs text-red-300 disabled:opacity-50"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* OLD PAPER RESULTS */}
                        {result.legacy && (
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <p className="muted text-sm">
                              Older paper result: {result.average?.toFixed(2)}%
                            </p>

                            {role === "admin" && (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteOldMark(student.id, paper.id)
                                }
                                disabled={saving}
                                className="rounded-lg border border-red-700 px-3 py-2 text-xs text-red-300 disabled:opacity-50"
                              >
                                Delete Marks
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
      </section>

      <footer className="muted mt-8 border-t border-slate-800 pt-5 text-xs sm:mt-10">
        O/L Maths Progress
      </footer>
    </main>
  );
}
