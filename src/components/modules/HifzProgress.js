import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function HifzProgress({ institutionId }) {
  const [students, setStudents] = useState([]);
  const [selected, setSelected] = useState("");
  const [history, setHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: st } = await supabase.from("students").select("id, name, class_name").eq("institution_id", institutionId).order("name");
      setStudents(st || []);
      if (st && st.length > 0) setSelected((prev) => prev || st[0].id);

      const { data: all } = await supabase
        .from("attendance")
        .select("student_id, date, hifz_pages")
        .eq("institution_id", institutionId)
        .not("hifz_pages", "is", null)
        .order("date");

      const byStudent = {};
      (all || []).forEach((r) => {
        byStudent[r.student_id] = byStudent[r.student_id] || [];
        byStudent[r.student_id].push(r);
      });

      const board = (st || [])
        .map((s) => {
          const rows = byStudent[s.id] || [];
          const latest = rows[rows.length - 1];
          const first = rows[0];
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          const recentStart = rows.find((r) => new Date(r.date) >= monthAgo) || first;
          const pace = latest && recentStart ? Number(latest.hifz_pages) - Number(recentStart.hifz_pages) : 0;
          return { id: s.id, name: s.name, className: s.class_name, total: latest?.hifz_pages ?? 0, pace };
        })
        .filter((s) => s.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      setLeaderboard(board);
      setLoading(false);
    })();
  }, [institutionId]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      const { data } = await supabase
        .from("attendance")
        .select("date, hifz_pages, hifz_progress")
        .eq("institution_id", institutionId)
        .eq("student_id", selected)
        .not("hifz_pages", "is", null)
        .order("date");
      setHistory(data || []);
    })();
  }, [selected, institutionId]);

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const latest = history[history.length - 1];
    const first = history[0];
    const totalDays = Math.max(1, (new Date(latest.date) - new Date(first.date)) / 86400000);
    const totalPages = Number(latest.hifz_pages) - Number(first.hifz_pages);
    const perWeek = totalDays > 0 ? (totalPages / totalDays) * 7 : 0;
    return { latestTotal: latest.hifz_pages, perWeek: perWeek.toFixed(1), latestNote: latest.hifz_progress };
  }, [history]);

  return (
    <div className="space-y-6">
      <div>
        <select value={selected} onChange={(e) => setSelected(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm">
          {students.map((s) => <option key={s.id} value={s.id}>{s.name} {s.class_name ? `(${s.class_name})` : ""}</option>)}
        </select>
      </div>

      {stats && (
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="glass-card rounded-2xl p-5">
            <div className="text-cream/40 text-xs mb-1">সর্বমোট পৃষ্ঠা</div>
            <div className="text-xl font-display text-gold-400">{stats.latestTotal}</div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="text-cream/40 text-xs mb-1">সাপ্তাহিক গতি (গড়)</div>
            <div className="text-xl font-display text-emerald-400">{stats.perWeek} পৃষ্ঠা/সপ্তাহ</div>
          </div>
          <div className="glass-card rounded-2xl p-5">
            <div className="text-cream/40 text-xs mb-1">সর্বশেষ নোট</div>
            <div className="text-sm text-cream/70 truncate">{stats.latestNote || "-"}</div>
          </div>
        </div>
      )}

      <div className="glass-card rounded-2xl p-5">
        <div className="text-xs text-cream/40 mb-3">অগ্রগতির গ্রাফ (সময়ের সাথে সর্বমোট পৃষ্ঠা)</div>
        {history.length < 2 ? (
          <div className="text-center text-cream/40 py-10 text-sm">
            চার্ট দেখতে অন্তত ২টা এন্ট্রি দরকার — "উপস্থিতি ও হিফজ" ট্যাবে "মোট পৃষ্ঠা" কলামে নিয়মিত আপডেট দিন।
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={history}>
              <CartesianGrid stroke="rgba(245,180,0,0.08)" />
              <XAxis dataKey="date" tick={{ fill: "#f4ead9aa", fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fill: "#f4ead9aa", fontSize: 11 }} />
              <Tooltip contentStyle={{ background: "#0c2b1e", border: "1px solid rgba(245,180,0,0.2)", borderRadius: 8 }} />
              <Line type="monotone" dataKey="hifz_pages" stroke="#f5b400" strokeWidth={2.5} dot={{ r: 3 }} name="মোট পৃষ্ঠা" />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gold-500/10 text-sm text-cream/60">প্রতিষ্ঠানের টপ ৫ (সর্বমোট পৃষ্ঠা অনুযায়ী)</div>
        {loading && <div className="px-5 py-6 text-center text-cream/40 text-sm">লোড হচ্ছে...</div>}
        {!loading && leaderboard.length === 0 && <div className="px-5 py-6 text-center text-cream/40 text-sm">এখনো কোনো হিফজ ডাটা নেই।</div>}
        {leaderboard.map((s, i) => (
          <div key={s.id} className="px-5 py-3 border-b border-gold-500/5 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="text-gold-400 font-display w-5">{i + 1}</span>
              <span>{s.name}</span>
              <span className="text-cream/35 text-xs">{s.className}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-cream/50 text-xs">{s.pace >= 0 ? "+" : ""}{s.pace} (৩০ দিনে)</span>
              <span className="text-gold-300 font-semibold">{s.total} পৃ.</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
