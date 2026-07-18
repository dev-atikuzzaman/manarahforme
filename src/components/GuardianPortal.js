import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function GuardianPortal({ onLogout }) {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [err, setErr] = useState("");

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
        return { ...s, attendanceRate: total ? Math.round((present / total) * 100) : null, totalRecorded: total, latestHifz };
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

                <div className="text-xs text-cream/50">
                  <span className="text-cream/35">সর্বশেষ হিফজ অগ্রগতি: </span>
                  {c.latestHifz || "এখনো লেখা হয়নি"}
                </div>
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
