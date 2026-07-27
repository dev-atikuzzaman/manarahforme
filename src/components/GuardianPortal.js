import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { gradeOf } from "../lib/grading";

export default function GuardianPortal({ onLogout }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [err, setErr] = useState("");
  const [expandedChild, setExpandedChild] = useState(null);
  const [expandedExam, setExpandedExam] = useState(null);

  async function load() {
    setLoading(true);
    const { data: links } = await supabase.from("guardian_links").select("student_id");
    const ids = (links || []).map((l) => l.student_id);
    if (ids.length === 0) { setChildren([]); setLoading(false); return; }

    const { data: students } = await supabase.from("students").select("*").in("id", ids);
    const enriched = await Promise.all(
      (students || []).map(async (s) => {
        const since = new Date();
        since.setDate(since.getDate() - 30);
        const { data: att } = await supabase
          .from("attendance")
          .select("status, hifz_progress, date")
          .eq("student_id", s.id)
          .gte("date", since.toISOString().slice(0, 10))
          .order("date", { ascending: false });
        const present = (att || []).filter((a) => a.status === "present").length;
        const total = (att || []).length;
        const latestHifz = (att || []).find((a) => a.hifz_progress)?.hifz_progress;

        const { data: exams } = await supabase
          .from("exams")
          .select("*")
          .eq("institution_id", s.institution_id)
          .eq("class_name", s.class_name)
          .order("exam_date", { ascending: false })
          .limit(5);

        const examResults = await Promise.all(
          (exams || []).map(async (exam) => {
            const [{ data: subjects }, { data: myMarks }] = await Promise.all([
              supabase.from("exam_subjects").select("*").eq("exam_id", exam.id),
              supabase.from("exam_marks").select("*").eq("exam_id", exam.id).eq("student_id", s.id),
            ]);
            const marksBySubject = {};
            (myMarks || []).forEach((m) => { marksBySubject[m.exam_subject_id] = m.marks_obtained; });
            const totalMax = (subjects || []).reduce((sum, sub) => sum + Number(sub.max_marks), 0);
            const totalObtained = (subjects || []).reduce((sum, sub) => sum + (Number(marksBySubject[sub.id]) || 0), 0);
            const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
            const hasAnyMarks = (subjects || []).some((sub) => marksBySubject[sub.id] != null);
            const { grade } = gradeOf(percentage);
            return { exam, subjects: subjects || [], marksBySubject, totalObtained, totalMax, percentage, grade, hasAnyMarks };
          })
        );

        const now = new Date();
        const { data: feeRows } = await supabase
          .from("fee_payments")
          .select("*")
          .eq("student_id", s.id)
          .eq("year", now.getFullYear())
          .eq("month", now.getMonth() + 1);
        const feeStatus = feeRows?.find((f) => f.verification_status === "verified")
          ? "verified"
          : feeRows?.find((f) => f.verification_status === "pending")
          ? "pending"
          : "unpaid";

        return { ...s, attendanceRate: total ? Math.round((present / total) * 100) : null, totalRecorded: total, latestHifz, examResults: examResults.filter((r) => r.hasAnyMarks), feeStatus };
      })
    );
    setChildren(enriched);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleLink(e) {
    e.preventDefault();
    setErr(""); setLinking(true);
    const { error } = await supabase.rpc("link_guardian_to_student", { p_code: code });
    setLinking(false);
    if (error) return setErr(error.message);
    setCode("");
    load();
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-hidden">
      <div className="blob w-96 h-96 bg-gold-500 -top-24 -left-24" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="font-display text-2xl text-gold-400">মানারাহ</div>
            <div className="text-xs text-cream/40">অভিভাবক পোর্টাল</div>
          </div>
          <button onClick={onLogout} className="text-xs text-cream/50 hover:text-red-300">লগআউট</button>
        </div>

        {loading && <div className="text-center text-cream/40 py-10">লোড হচ্ছে...</div>}

        {!loading && children.length === 0 && (
          <div className="glass-card rounded-3xl p-10 text-center max-w-md mx-auto">
            <div className="font-display text-lg text-gold-400 mb-2">কোনো সন্তান লিংক করা নেই</div>
            <p className="text-sm text-cream/50 mb-5">প্রতিষ্ঠান থেকে পাওয়া পোর্টাল কোড দিয়ে সন্তানকে লিংক করুন।</p>
          </div>
        )}

        {!loading && children.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-5 mb-8">
            {children.map((c) => (
              <div key={c.id} className="glass-card rounded-2xl p-6 anim-in">
                <div className="font-display text-lg text-gold-400 mb-1">{c.name}</div>
                <div className="text-xs text-cream/40 mb-4">{c.class_name || "ক্লাস উল্লেখ নেই"}</div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-ink-900/40 rounded-xl p-3">
                    <div className="text-[11px] text-cream/40">গত ৩০ দিনের উপস্থিতি</div>
                    <div className="text-lg font-display text-emerald-400">
                      {c.attendanceRate !== null ? `${c.attendanceRate}%` : "তথ্য নেই"}
                    </div>
                  </div>
                  <div className="bg-ink-900/40 rounded-xl p-3">
                    <div className="text-[11px] text-cream/40">মাসিক ফি</div>
                    <div className="text-lg font-display text-gold-400">{c.monthly_fee ? `৳${c.monthly_fee}` : "-"}</div>
                  </div>
                </div>

                {c.monthly_fee > 0 && (
                  <FeeStatusBox student={c} onUpdated={load} />
                )}

                <div className="text-xs text-cream/50 mb-4">
                  <span className="text-cream/35">সর্বশেষ হিফজ অগ্রগতি: </span>
                  {c.latestHifz || "এখনো লেখা হয়নি"}
                </div>

                <button
                  onClick={() => setExpandedChild(expandedChild === c.id ? null : c.id)}
                  className="w-full text-left text-xs text-gold-400 hover:text-gold-300 border-t border-gold-500/10 pt-3 flex items-center justify-between"
                >
                  <span>রেজাল্ট দেখুন ({c.examResults.length})</span>
                  <span>{expandedChild === c.id ? "▲" : "▼"}</span>
                </button>

                {expandedChild === c.id && (
                  <div className="mt-3 space-y-2">
                    {c.examResults.length === 0 && <div className="text-xs text-cream/35 py-2">এখনো কোনো রেজাল্ট প্রকাশিত হয়নি।</div>}
                    {c.examResults.map((r) => (
                      <div key={r.exam.id} className="bg-ink-900/40 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedExam(expandedExam === r.exam.id ? null : r.exam.id)}
                          className="w-full flex items-center justify-between px-3 py-2.5 text-xs"
                        >
                          <span className="text-cream/80">{r.exam.name}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-cream/40">{r.percentage.toFixed(1)}%</span>
                            <span className={`px-2 py-0.5 rounded-full ${r.grade === "F" ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>{r.grade}</span>
                          </span>
                        </button>
                        {expandedExam === r.exam.id && (
                          <div className="px-3 pb-3 space-y-1 border-t border-gold-500/10 pt-2">
                            {r.subjects.map((sub) => (
                              <div key={sub.id} className="flex justify-between text-[11px] text-cream/50">
                                <span>{sub.subject_name}</span>
                                <span>{r.marksBySubject[sub.id] ?? "-"} / {sub.max_marks}</span>
                              </div>
                            ))}
                            <div className="flex justify-between text-[11px] text-gold-300 pt-1 border-t border-gold-500/10 mt-1">
                              <span>সর্বমোট</span>
                              <span>{r.totalObtained} / {r.totalMax}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleLink} className="glass-card rounded-2xl p-6 max-w-md space-y-3">
          <div className="text-sm text-cream/60">আরেকটি সন্তান যোগ করুন</div>
          {err && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">{err}</div>}
          <div className="flex gap-2">
            <input placeholder="পোর্টাল কোড" className="flex-1 bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm uppercase" value={code} onChange={(e) => setCode(e.target.value)} required />
            <button disabled={linking} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 rounded-xl text-sm disabled:opacity-50">
              {linking ? "..." : "যোগ করুন"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const METHOD_LABEL = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", upay: "উপায়", bank: "ব্যাংক", other: "অন্যান্য" };

function FeeStatusBox({ student, onUpdated }) {
  const [showForm, setShowForm] = useState(false);
  const [method, setMethod] = useState("bkash");
  const [senderNumber, setSenderNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState("");

  if (student.feeStatus === "verified") {
    return <div className="mb-4 text-xs px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">✓ এই মাসের ফি পরিশোধিত</div>;
  }
  if (student.feeStatus === "pending") {
    return <div className="mb-4 text-xs px-3 py-2 rounded-lg bg-gold-500/10 text-gold-300 border border-gold-500/20">যাচাইয়ের অপেক্ষায় — প্রতিষ্ঠান শীঘ্রই নিশ্চিত করবে</div>;
  }

  const now = new Date();

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(""); setSubmitting(true);
    const { error } = await supabase.from("fee_payments").upsert(
      {
        institution_id: student.institution_id,
        student_id: student.id,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        amount: student.monthly_fee,
        payment_method: method,
        transaction_id: transactionId,
        verification_status: "pending",
      },
      { onConflict: "student_id,year,month" }
    );
    setSubmitting(false);
    if (error) return setErr(error.message);
    setShowForm(false);
    onUpdated();
  }

  return (
    <div className="mb-4">
      <div className="text-xs px-3 py-2 rounded-lg bg-red-500/10 text-red-300 border border-red-500/20 flex items-center justify-between">
        <span>এই মাসের ফি বাকি</span>
        <button onClick={() => setShowForm((v) => !v)} className="underline hover:no-underline">পেমেন্ট জমা দিন</button>
      </div>
      {showForm && (
        <form onSubmit={handleSubmit} className="mt-2 bg-ink-900/40 rounded-xl p-3 space-y-2">
          {err && <div className="text-[11px] text-red-400">{err}</div>}
          <div className="grid grid-cols-2 gap-2">
            <select className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1.5 text-xs" value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(METHOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input required placeholder="প্রেরক নম্বর" className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1.5 text-xs" value={senderNumber} onChange={(e) => setSenderNumber(e.target.value)} />
          </div>
          <input required placeholder="ট্রানজেকশন আইডি (TrxID)" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1.5 text-xs" value={transactionId} onChange={(e) => setTransactionId(e.target.value)} />
          <button disabled={submitting} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-lg py-1.5 text-xs disabled:opacity-50">
            {submitting ? "জমা হচ্ছে..." : `৳${student.monthly_fee} পরিশোধ জমা দিন`}
          </button>
        </form>
      )}
    </div>
  );
}
