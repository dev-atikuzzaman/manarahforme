import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function FeeCollection({ institutionId, canEdit, onToast }) {
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState({});
  const [loading, setLoading] = useState(true);
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [query, setQuery] = useState("");

  const [year, month] = monthKey.split("-").map(Number);

  async function load() {
    setLoading(true);
    const { data: st } = await supabase
      .from("students")
      .select("id, name, class_name, phone, monthly_fee")
      .eq("institution_id", institutionId)
      .not("monthly_fee", "is", null)
      .order("name");
    setStudents(st || []);

    const { data: pay } = await supabase
      .from("fee_payments")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("year", year)
      .eq("month", month);
    const map = {};
    (pay || []).forEach((p) => { map[p.student_id] = p; });
    setPayments(map);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("fee-payments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "fee_payments", filter: `institution_id=eq.${institutionId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, monthKey]);

  async function markPaid(student) {
    if (!canEdit) return;
    const { error } = await supabase.from("fee_payments").insert({
      institution_id: institutionId,
      student_id: student.id,
      year, month,
      amount: student.monthly_fee,
    });
    if (error) return onToast({ type: "error", message: error.message });

    await supabase.from("ledger_entries").insert({
      institution_id: institutionId,
      entry_type: "income",
      category: "মাসিক ফি",
      amount: student.monthly_fee,
      note: `${student.name} — ${monthKey}`,
      entry_date: new Date().toISOString().slice(0, 10),
    });
    onToast({ message: `${student.name}-এর ফি জমা হিসেবে চিহ্নিত হয়েছে` });
  }

  async function markUnpaid(student) {
    if (!canEdit) return;
    const existing = payments[student.id];
    if (!existing) return;
    const { error } = await supabase.from("fee_payments").delete().eq("id", existing.id);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "বাতিল করা হয়েছে — মনে রাখবেন, একাউন্টিং-এ যোগ হওয়া এন্ট্রিটা আলাদাভাবে মুছতে হবে যদি প্রয়োজন হয়" });
  }

  const filtered = students.filter((s) => (s.name + (s.class_name || "")).toLowerCase().includes(query.toLowerCase()));
  const paidCount = filtered.filter((s) => payments[s.id]).length;
  const unpaidStudents = useMemo(() => filtered.filter((s) => !payments[s.id]), [filtered, payments]);
  const unpaidTotal = unpaidStudents.reduce((s, st) => s + Number(st.monthly_fee || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" />
        <div className="text-sm text-cream/50">
          পরিশোধিত: <span className="text-emerald-400 font-semibold">{paidCount}</span> / {filtered.length}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-5">
          <div className="text-cream/40 text-xs mb-1">বাকি শিক্ষার্থী</div>
          <div className="text-xl font-display text-red-400">{unpaidStudents.length}</div>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <div className="text-cream/40 text-xs mb-1">মোট বকেয়া</div>
          <div className="text-xl font-display text-red-400">৳{unpaidTotal.toLocaleString("bn-BD")}</div>
        </div>
      </div>

      <input
        placeholder="নাম বা ক্লাস দিয়ে খুঁজুন..."
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
                <th className="px-4 py-3 font-medium">ক্লাস</th>
                <th className="px-4 py-3 font-medium">মাসিক ফি</th>
                <th className="px-4 py-3 font-medium">অবস্থা</th>
                {canEdit && <th className="px-4 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-cream/40">মাসিক ফি নির্ধারিত কোনো শিক্ষার্থী নেই — "শিক্ষার্থী" ট্যাবে ফি বসান।</td></tr>}
              {filtered.map((s) => {
                const paid = !!payments[s.id];
                return (
                  <tr key={s.id} className="border-b border-gold-500/5 hover:bg-white/5">
                    <td className="px-4 py-3">{s.name}</td>
                    <td className="px-4 py-3 text-cream/60">{s.class_name}</td>
                    <td className="px-4 py-3 text-cream/60">৳{s.monthly_fee}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${paid ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                        {paid ? "পরিশোধিত" : "বাকি"}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        {paid ? (
                          <button onClick={() => markUnpaid(s)} className="text-xs text-cream/40 hover:text-red-300">বাতিল করুন</button>
                        ) : (
                          <button onClick={() => markPaid(s)} className="text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-lg hover:bg-emerald-600/30">পরিশোধিত চিহ্নিত করুন</button>
                        )}
                      </td>
                    )}
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
