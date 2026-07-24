import React, { Suspense, lazy, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

const QRCodeModal = lazy(() => import("../QRCodeModal"));

const EMPTY = { name: "", guardian_name: "", phone: "", class_name: "", monthly_fee: "" };

export default function Students({ institutionId, canEdit, onToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [qrStudent, setQrStudent] = useState(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    if (!error) setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("students-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "students", filter: `institution_id=eq.${institutionId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { ...form, institution_id: institutionId, monthly_fee: form.monthly_fee ? Number(form.monthly_fee) : null };
    const { error } = editingId
      ? await supabase.from("students").update(payload).eq("id", editingId)
      : await supabase.from("students").insert(payload);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: editingId ? "তথ্য হালনাগাদ হয়েছে" : "নতুন শিক্ষার্থী যোগ হয়েছে" });
    setForm(EMPTY);
    setEditingId(null);
  }

  async function handleDelete(id) {
    if (!window.confirm("মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) onToast({ type: "error", message: error.message });
    else onToast({ message: "মুছে ফেলা হয়েছে" });
  }

  const filtered = rows.filter((r) =>
    (r.name + r.class_name + (r.phone || "")).toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {canEdit && (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input required placeholder="নাম" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input placeholder="অভিভাবকের নাম" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.guardian_name} onChange={(e) => setForm({ ...form, guardian_name: e.target.value })} />
          <input placeholder="ফোন নম্বর" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input placeholder="ক্লাস/জামাত" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} />
          <div className="flex gap-2">
            <input placeholder="মাসিক ফি" type="number" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm flex-1" value={form.monthly_fee} onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })} />
            <button className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 rounded-xl text-sm shrink-0">
              {editingId ? "আপডেট" : "যোগ করুন"}
            </button>
          </div>
        </form>
      )}

      <input
        placeholder="নাম, ক্লাস বা ফোন দিয়ে খুঁজুন..."
        className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cream/40 border-b border-gold-500/10">
                <th className="px-4 py-3 font-medium">নাম</th>
                <th className="px-4 py-3 font-medium">অভিভাবক</th>
                <th className="px-4 py-3 font-medium">ফোন</th>
                <th className="px-4 py-3 font-medium">ক্লাস</th>
                <th className="px-4 py-3 font-medium">ফি</th>
                <th className="px-4 py-3 font-medium">পোর্টাল কোড</th>
                <th className="px-4 py-3 font-medium">QR</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={8} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center text-cream/40">কোনো তথ্য নেই — উপরের ফর্ম দিয়ে যোগ করুন।</td></tr>}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-gold-500/5 hover:bg-white/5">
                  <td className="px-4 py-3">{r.name}</td>
                  <td className="px-4 py-3 text-cream/60">{r.guardian_name}</td>
                  <td className="px-4 py-3 text-cream/60">{r.phone}</td>
                  <td className="px-4 py-3 text-cream/60">{r.class_name}</td>
                  <td className="px-4 py-3 text-cream/60">{r.monthly_fee ? `৳${r.monthly_fee}` : "-"}</td>
                  <td className="px-4 py-3">
                    {r.portal_code && (
                      <button onClick={() => navigator.clipboard.writeText(r.portal_code)} className="text-xs bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1 text-gold-300 hover:border-gold-400/40" title="কপি করতে ক্লিক করুন">
                        {r.portal_code}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setQrStudent(r)} className="text-xs text-gold-400 hover:text-gold-300 border border-gold-500/20 rounded-lg px-2 py-1">দেখুন</button>
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button onClick={() => { setForm(r); setEditingId(r.id); }} className="text-gold-400 hover:text-gold-300 text-xs mr-3">এডিট</button>
                      <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300 text-xs">মুছুন</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {qrStudent && (
        <Suspense fallback={null}>
          <QRCodeModal student={qrStudent} onClose={() => setQrStudent(null)} />
        </Suspense>
      )}
    </div>
  );
}
