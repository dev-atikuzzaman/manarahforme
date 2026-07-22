import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportExcel, exportPDF } from "../../lib/exportUtils";

function gradeOf(percentage) {
  if (percentage >= 80) return { grade: "A+", gpa: 5.0 };
  if (percentage >= 70) return { grade: "A", gpa: 4.0 };
  if (percentage >= 60) return { grade: "A-", gpa: 3.5 };
  if (percentage >= 50) return { grade: "B", gpa: 3.0 };
  if (percentage >= 40) return { grade: "C", gpa: 2.0 };
  if (percentage >= 33) return { grade: "D", gpa: 1.0 };
  return { grade: "F", gpa: 0.0 };
}

export default function Results({ institutionId, institutionName, canEdit, onToast }) {
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState("");
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [marks, setMarks] = useState({}); // { studentId: { subjectId: marks } }
  const [tab, setTab] = useState("marks"); // subjects | marks | results
  const [loading, setLoading] = useState(true);

  // নতুন পরীক্ষা ফর্ম
  const [newExamName, setNewExamName] = useState("");
  const [newExamClass, setNewExamClass] = useState("");
  const [newExamDate, setNewExamDate] = useState("");

  // নতুন বিষয় ফর্ম
  const [subjectName, setSubjectName] = useState("");
  const [subjectMax, setSubjectMax] = useState(100);

  async function loadExams() {
    const { data } = await supabase.from("exams").select("*").eq("institution_id", institutionId).order("exam_date", { ascending: false });
    setExams(data || []);
    if (data && data.length > 0 && !selectedExamId) setSelectedExamId(data[0].id);
  }

  useEffect(() => {
    loadExams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  const selectedExam = exams.find((e) => e.id === selectedExamId);

  async function loadExamDetails() {
    if (!selectedExamId || !selectedExam) return;
    setLoading(true);
    const [{ data: subs }, { data: st }, { data: mk }] = await Promise.all([
      supabase.from("exam_subjects").select("*").eq("exam_id", selectedExamId).order("created_at"),
      supabase.from("students").select("id, name, class_name").eq("institution_id", institutionId).eq("class_name", selectedExam.class_name).order("name"),
      supabase.from("exam_marks").select("*").eq("exam_id", selectedExamId),
    ]);
    setSubjects(subs || []);
    setStudents(st || []);
    const map = {};
    (mk || []).forEach((m) => {
      map[m.student_id] = map[m.student_id] || {};
      map[m.student_id][m.exam_subject_id] = m.marks_obtained;
    });
    setMarks(map);
    setLoading(false);
  }

  useEffect(() => {
    loadExamDetails();
    if (!selectedExamId) return;
    const channel = supabase
      .channel("exam-marks-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_marks", filter: `exam_id=eq.${selectedExamId}` }, loadExamDetails)
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_subjects", filter: `exam_id=eq.${selectedExamId}` }, loadExamDetails)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExamId]);

  async function createExam(e) {
    e.preventDefault();
    const { data, error } = await supabase.from("exams").insert({
      institution_id: institutionId,
      name: newExamName,
      class_name: newExamClass,
      exam_date: newExamDate || null,
    }).select().single();
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "পরীক্ষা তৈরি হয়েছে" });
    setNewExamName(""); setNewExamClass(""); setNewExamDate("");
    await loadExams();
    setSelectedExamId(data.id);
  }

  async function addSubject(e) {
    e.preventDefault();
    const { error } = await supabase.from("exam_subjects").insert({
      exam_id: selectedExamId,
      institution_id: institutionId,
      subject_name: subjectName,
      max_marks: Number(subjectMax),
    });
    if (error) return onToast({ type: "error", message: error.message });
    setSubjectName(""); setSubjectMax(100);
  }

  async function deleteSubject(id) {
    if (!window.confirm("এই বিষয় ও এর সব নম্বর মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("exam_subjects").delete().eq("id", id);
    if (error) onToast({ type: "error", message: error.message });
  }

  async function saveMark(studentId, subjectId, value) {
    if (!canEdit) return;
    const marks_obtained = value === "" ? null : Number(value);
    const { error } = await supabase.from("exam_marks").upsert(
      { exam_id: selectedExamId, exam_subject_id: subjectId, student_id: studentId, institution_id: institutionId, marks_obtained },
      { onConflict: "exam_subject_id,student_id" }
    );
    if (error) onToast({ type: "error", message: error.message });
  }

  const results = useMemo(() => {
    if (subjects.length === 0) return [];
    const totalMax = subjects.reduce((s, sub) => s + Number(sub.max_marks), 0);
    const rows = students.map((s) => {
      const totalObtained = subjects.reduce((sum, sub) => sum + (Number(marks[s.id]?.[sub.id]) || 0), 0);
      const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
      const failed = subjects.some((sub) => (Number(marks[s.id]?.[sub.id]) || 0) < Number(sub.max_marks) * 0.33);
      const { grade, gpa } = failed ? { grade: "F", gpa: 0 } : gradeOf(percentage);
      return { student: s, totalObtained, totalMax, percentage, grade, gpa };
    });
    rows.sort((a, b) => b.totalObtained - a.totalObtained);
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  }, [students, subjects, marks]);

  function exportReportCard(row) {
    exportPDF({
      filename: `report-card-${row.student.name}-${selectedExam?.name}.pdf`,
      title: `রেজাল্ট কার্ড — ${row.student.name}`,
      subtitle: `${institutionName || ""} | ${selectedExam?.name} | ক্লাস: ${selectedExam?.class_name} | মেধাক্রম: ${row.rank}`,
      headers: ["বিষয়", "পূর্ণমান", "প্রাপ্ত নম্বর"],
      rows: subjects.map((sub) => [sub.subject_name, sub.max_marks, marks[row.student.id]?.[sub.id] ?? "-"])
        .concat([["সর্বমোট", row.totalMax, row.totalObtained], ["শতকরা", "-", `${row.percentage.toFixed(1)}%`], ["গ্রেড", "-", row.grade]]),
    });
  }

  function exportAllResults() {
    exportExcel({
      filename: `results-${selectedExam?.name}.xlsx`,
      sheetName: "ফলাফল",
      headers: ["মেধাক্রম", "নাম", "মোট প্রাপ্ত", "মোট পূর্ণমান", "শতকরা", "গ্রেড"],
      rows: results.map((r) => [r.rank, r.student.name, r.totalObtained, r.totalMax, `${r.percentage.toFixed(1)}%`, r.grade]),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <select value={selectedExamId} onChange={(e) => setSelectedExamId(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm min-w-[220px]">
          {exams.length === 0 && <option value="">কোনো পরীক্ষা নেই</option>}
          {exams.map((e) => <option key={e.id} value={e.id}>{e.name} — {e.class_name}</option>)}
        </select>
        {selectedExam && (
          <div className="flex gap-2">
            <button onClick={() => setTab("subjects")} className={`px-4 py-2 rounded-xl text-sm ${tab === "subjects" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>বিষয়</button>
            <button onClick={() => setTab("marks")} className={`px-4 py-2 rounded-xl text-sm ${tab === "marks" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>নম্বর এন্ট্রি</button>
            <button onClick={() => setTab("results")} className={`px-4 py-2 rounded-xl text-sm ${tab === "results" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>ফলাফল</button>
          </div>
        )}
      </div>

      {canEdit && (
        <form onSubmit={createExam} className="glass-card rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input required placeholder="পরীক্ষার নাম (যেমন: প্রথম সাময়িক)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={newExamName} onChange={(e) => setNewExamName(e.target.value)} />
          <input required placeholder="ক্লাস/জামাত" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={newExamClass} onChange={(e) => setNewExamClass(e.target.value)} />
          <input type="date" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={newExamDate} onChange={(e) => setNewExamDate(e.target.value)} />
          <button className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 rounded-xl text-sm">নতুন পরীক্ষা তৈরি করুন</button>
        </form>
      )}

      {!selectedExam && <div className="glass-card rounded-2xl p-8 text-center text-cream/40">উপরের ফর্ম দিয়ে একটা পরীক্ষা তৈরি করুন শুরু করতে।</div>}

      {selectedExam && tab === "subjects" && (
        <div className="space-y-4">
          {canEdit && (
            <form onSubmit={addSubject} className="glass-card rounded-2xl p-5 flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <div className="text-xs text-cream/50 mb-1">বিষয়ের নাম</div>
                <input required className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={subjectName} onChange={(e) => setSubjectName(e.target.value)} />
              </div>
              <div className="w-28">
                <div className="text-xs text-cream/50 mb-1">পূর্ণমান</div>
                <input required type="number" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={subjectMax} onChange={(e) => setSubjectMax(e.target.value)} />
              </div>
              <button className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2 rounded-xl text-sm">যোগ করুন</button>
            </form>
          )}
          <div className="glass-card rounded-2xl overflow-hidden">
            {subjects.length === 0 && <div className="px-5 py-6 text-center text-cream/40 text-sm">এখনো কোনো বিষয় যোগ করা হয়নি।</div>}
            {subjects.map((s) => (
              <div key={s.id} className="px-5 py-3 border-b border-gold-500/5 flex items-center justify-between text-sm">
                <span>{s.subject_name}</span>
                <div className="flex items-center gap-4">
                  <span className="text-cream/50">পূর্ণমান: {s.max_marks}</span>
                  {canEdit && <button onClick={() => deleteSubject(s.id)} className="text-red-400 hover:text-red-300 text-xs">মুছুন</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedExam && tab === "marks" && (
        subjects.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-cream/40">প্রথমে "বিষয়" ট্যাব থেকে বিষয় যোগ করুন।</div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-cream/40 border-b border-gold-500/10">
                    <th className="px-4 py-3 font-medium sticky left-0 bg-ink-900">নাম</th>
                    {subjects.map((sub) => <th key={sub.id} className="px-4 py-3 font-medium whitespace-nowrap">{sub.subject_name} <span className="text-cream/30">/{sub.max_marks}</span></th>)}
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={subjects.length + 1} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
                  {!loading && students.length === 0 && <tr><td colSpan={subjects.length + 1} className="px-4 py-6 text-center text-cream/40">এই ক্লাসে কোনো শিক্ষার্থী নেই।</td></tr>}
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-gold-500/5 hover:bg-white/5">
                      <td className="px-4 py-2.5 sticky left-0 bg-ink-900/95">{s.name}</td>
                      {subjects.map((sub) => (
                        <td key={sub.id} className="px-4 py-2.5">
                          <input
                            disabled={!canEdit}
                            type="number"
                            defaultValue={marks[s.id]?.[sub.id] ?? ""}
                            onBlur={(e) => saveMark(s.id, sub.id, e.target.value)}
                            className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1 text-xs w-20"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {selectedExam && tab === "results" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button onClick={exportAllResults} disabled={results.length === 0} className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 px-4 py-2 rounded-xl text-sm disabled:opacity-40">
              সম্পূর্ণ ফলাফল Excel ডাউনলোড
            </button>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-cream/40 border-b border-gold-500/10">
                    <th className="px-4 py-3 font-medium">মেধাক্রম</th>
                    <th className="px-4 py-3 font-medium">নাম</th>
                    <th className="px-4 py-3 font-medium">মোট প্রাপ্ত</th>
                    <th className="px-4 py-3 font-medium">শতকরা</th>
                    <th className="px-4 py-3 font-medium">গ্রেড</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {results.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-cream/40">এখনো নম্বর দেওয়া হয়নি।</td></tr>}
                  {results.map((r) => (
                    <tr key={r.student.id} className="border-b border-gold-500/5 hover:bg-white/5">
                      <td className="px-4 py-2.5 text-gold-400 font-semibold">{r.rank}</td>
                      <td className="px-4 py-2.5">{r.student.name}</td>
                      <td className="px-4 py-2.5 text-cream/60">{r.totalObtained}/{r.totalMax}</td>
                      <td className="px-4 py-2.5 text-cream/60">{r.percentage.toFixed(1)}%</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${r.grade === "F" ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>{r.grade}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => exportReportCard(r)} className="text-xs text-gold-400 hover:text-gold-300">রেজাল্ট কার্ড PDF</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
