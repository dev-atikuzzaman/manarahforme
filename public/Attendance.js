import React, { Suspense, lazy, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const QRScanner = lazy(() => import("../QRScanner"));

export default function Attendance({ institutionId, canEdit, onToast }) {
  const [students, setStudents] = useState([]);
  const [records, setRecords] = useState({});
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [scannerOpen, setScannerOpen] = useState(false);

  async function load() {
    setLoading(true);
    const { data: st } = await supabase.from("students").select("id, name, class_name, attendance_code").eq("institution_id", institutionId).order("name");
    setStudents(st || []);
    const { data: att } = await supabase.from("attendance").select("*").eq("institution_id", institutionId).eq("date", date);
    const map = {};
    (att || []).forEach((a) => { map[a.student_id] = a; });
    setRecords(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("attendance-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance", filter: `institution_id=eq.${institutionId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, date]);

  async function mark(studentId, status) {
    if (!canEdit) return;
    const existing = records[studentId];
    const payload = { institution_id: institutionId, student_id: studentId, date, status };
    const { error } = existing
      ? await supabase.from("attendance").update(payload).eq("id", existing.id)
      : await supabase.from("attendance").insert(payload);
    if (error) onToast({ type: "error", message: error.message });
  }

  async function updateHifz(studentId, hifz_progress) {
    if (!canEdit) return;
    const existing = records[studentId];
    const payload = { institution_id: institutionId, student_id: studentId, date, hifz_progress, status: existing?.status || "present" };
    const { error } = existing
      ? await supabase.from("attendance").update(payload).eq("id", existing.id)
      : await supabase.from("attendance").insert(payload);
    if (error) onToast({ type: "error", message: error.message });
  }

  async function updateHifzPages(studentId, value) {
    if (!canEdit) return;
    const hifz_pages = value === "" ? null : Number(value);
    const existing = records[studentId];
    const payload = { institution_id: institutionId, student_id: studentId, date, hifz_pages, status: existing?.status || "present" };
    const { error } = existing
      ? await supabase.from("attendance").update(payload).eq("id", existing.id)
      : await supabase.from("attendance").insert(payload);
    if (error) onToast({ type: "error", message: error.message });
  }

  const presentCount = Object.values(records).filter((r) => r.status === "present").length;

  function handleScan(code) {
    const student = students.find((s) => s.attendance_code === code.trim().toUpperCase() || s.attendance_code === code.trim());
    if (!student) {
      onToast({ type: "error", message: "এই কোডের কোনো শিক্ষার্থী পাওয়া যায়নি।" });
      return;
    }
    mark(student.id, "present");
    onToast({ message: `${student.name} — উপস্থিত হিসেবে চিহ্নিত হয়েছে` });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-4 justify-between">
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" />
          {canEdit && (
            <button onClick={() => setScannerOpen(true)} className="bg-gold-500/15 border border-gold-500/30 text-gold-300 hover:bg-gold-500/25 px-3 py-2 rounded-xl text-sm">
              📷 QR দিয়ে হাজিরা নিন
            </button>
          )}
        </div>
        <div className="text-sm text-cream/50">
          আজ উপস্থিত: <span className="text-gold-400 font-semibold">{presentCount}</span> / {students.length}
        </div>
      </div>

      {scannerOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center text-cream/50 text-sm">লোড হচ্ছে...</div>}>
          <QRScanner onScan={handleScan} onClose={() => setScannerOpen(false)} />
        </Suspense>
      )}

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cream/40 border-b border-gold-500/10">
                <th className="px-4 py-3 font-medium">নাম</th>
                <th className="px-4 py-3 font-medium">ক্লাস</th>
                <th className="px-4 py-3 font-medium">উপস্থিতি</th>
                <th className="px-4 py-3 font-medium">হিফজ অগ্রগতি (নোট)</th>
                <th className="px-4 py-3 font-medium">মোট পৃষ্ঠা (চার্টের জন্য)</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
              {!loading && students.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-cream/40">প্রথমে "শিক্ষার্থী/সদস্য" ট্যাব থেকে শিক্ষার্থী যোগ করুন।</td></tr>}
              {students.map((s) => {
                const rec = records[s.id];
                return (
                  <tr key={s.id} className="border-b border-gold-500/5 hover:bg-white/5">
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3 text-cream/60">{s.class_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {["present", "absent", "leave"].map((st) => (
                          <button
                            key={st}
                            disabled={!canEdit}
                            onClick={() => mark(s.id, st)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition ${
                              rec?.status === st
                                ? st === "present" ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                                : st === "absent" ? "bg-red-500/20 border-red-500/40 text-red-300"
                                : "bg-gold-500/20 border-gold-500/40 text-gold-300"
                                : "border-white/10 text-cream/40 hover:border-white/20"
                            }`}
                          >
                            {st === "present" ? "উপস্থিত" : st === "absent" ? "অনুপস্থিত" : "ছুটি"}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        disabled={!canEdit}
                        defaultValue={rec?.hifz_progress || ""}
                        onBlur={(e) => updateHifz(s.id, e.target.value)}
                        placeholder="যেমন: সূরা বাকারা, পৃ. ১২"
                        className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1.5 text-xs w-full max-w-[200px]"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        disabled={!canEdit}
                        type="number"
                        defaultValue={rec?.hifz_pages ?? ""}
                        onBlur={(e) => updateHifzPages(s.id, e.target.value)}
                        placeholder="সর্বমোট পৃষ্ঠা"
                        className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1.5 text-xs w-24"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
