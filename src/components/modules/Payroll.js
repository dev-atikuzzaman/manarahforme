import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportExcel } from "../../lib/exportUtils";

const EMPTY_STAFF = { name: "", designation: "", phone: "", monthly_salary: "", joined_date: "" };

export default function Payroll({ institutionId, canEdit, onToast }) {
  const [tab, setTab] = useState("payroll"); // staff | payroll
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_STAFF);
  const [editingId, setEditingId] = useState(null);

  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [payments, setPayments] = useState({});
  const [year, month] = monthKey.split("-").map(Number);

  async function loadStaff() {
    setLoading(true);
    const { data } = await supabase.from("staff").select("*").eq("institution_id", institutionId).order("created_at", { ascending: false });
    setStaff(data || []);
    setLoading(false);
  }

  async function loadPayments() {
    const { data } = await supabase
      .from("salary_payments")
      .select("*")
      .eq("institution_id", institutionId)
      .eq("year", year)
      .eq("month", month);
    const map = {};
    (data || []).forEach((p) => { map[p.staff_id] = p; });
    setPayments(map);
  }

  useEffect(() => {
    loadStaff();
    const channel = supabase
      .channel("staff-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff", filter: `institution_id=eq.${institutionId}` }, loadStaff)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  useEffect(() => {
    loadPayments();
    const channel = supabase
      .channel("salary-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "salary_payments", filter: `institution_id=eq.${institutionId}` }, loadPayments)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, monthKey]);

  async function handleSubmitStaff(e) {
    e.preventDefault();
    const payload = { ...form, institution_id: institutionId, monthly_salary: form.monthly_salary ? Number(form.monthly_salary) : null, joined_date: form.joined_date || null };
    const { error } = editingId
      ? await supabase.from("staff").update(payload).eq("id", editingId)
      : await supabase.from("staff").insert(payload);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: editingId ? "তথ্য হালনাগাদ হয়েছে" : "নতুন স্টাফ যোগ হয়েছে" });
    setForm(EMPTY_STAFF);
    setEditingId(null);
  }

  async function handleDeleteStaff(id) {
    if (!window.confirm("এই স্টাফ মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("staff").delete().eq("id", id);
    if (error) onToast({ type: "error", message: error.message });
  }

  async function markPaid(member) {
    if (!canEdit) return;
    const { error } = await supabase.from("salary_payments").insert({
      institution_id: institutionId,
      staff_id: member.id,
      year, month,
      amount: member.monthly_salary,
    });
    if (error) return onToast({ type: "error", message: error.message });

    await supabase.from("ledger_entries").insert({
      institution_id: institutionId,
      entry_type: "expense",
      category: "শিক্ষক/স্টাফ বেতন",
      amount: member.monthly_salary,
      note: `${member.name} — ${monthKey}`,
      entry_date: new Date().toISOString().slice(0, 10),
    });
    onToast({ message: `${member.name}-এর বেতন পরিশোধ হিসেবে চিহ্নিত হয়েছে` });
  }

  async function markUnpaid(member) {
    if (!canEdit) return;
    const existing = payments[member.id];
    if (!existing) return;
    const { error } = await supabase.from("salary_payments").delete().eq("id", existing.id);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: "বাতিল করা হয়েছে — একাউন্টিং-এ যোগ হওয়া এন্ট্রিটা আলাদাভাবে মুছতে হবে যদি প্রয়োজন হয়" });
  }

  function exportPayrollSheet() {
    exportExcel({
      filename: `payroll-${monthKey}.xlsx`,
      sheetName: "বেতন শীট",
      headers: ["নাম", "পদবি", "মাসিক বেতন", "অবস্থা"],
      rows: staffWithSalary.map((s) => [s.name, s.designation || "-", s.monthly_salary, payments[s.id] ? "পরিশোধিত" : "বাকি"]),
    });
  }

  const staffWithSalary = useMemo(() => staff.filter((s) => s.monthly_salary), [staff]);
  const paidCount = staffWithSalary.filter((s) => payments[s.id]).length;
  const totalPaid = staffWithSalary.filter((s) => payments[s.id]).reduce((s, m) => s + Number(m.monthly_salary || 0), 0);
  const totalDue = staffWithSalary.filter((s) => !payments[s.id]).reduce((s, m) => s + Number(m.monthly_salary || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button onClick={() => setTab("payroll")} className={`px-4 py-2 rounded-xl text-sm ${tab === "payroll" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>বেতন প্রদান</button>
        <button onClick={() => setTab("staff")} className={`px-4 py-2 rounded-xl text-sm ${tab === "staff" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>স্টাফ তালিকা</button>
      </div>

      {tab === "payroll" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" />
            <button onClick={exportPayrollSheet} disabled={staffWithSalary.length === 0} className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 px-4 py-2 rounded-xl text-sm disabled:opacity-40">
              Excel ডাউনলোড
            </button>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <div className="glass-card rounded-2xl p-5">
              <div className="text-cream/40 text-xs mb-1">পরিশোধিত</div>
              <div className="text-xl font-display text-emerald-400">{paidCount}/{staffWithSalary.length}</div>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <div className="text-cream/40 text-xs mb-1">এই মাসে প্রদত্ত</div>
              <div className="text-xl font-display text-gold-400">৳{totalPaid.toLocaleString("bn-BD")}</div>
            </div>
            <div className="glass-card rounded-2xl p-5">
              <div className="text-cream/40 text-xs mb-1">বাকি</div>
              <div className="text-xl font-display text-red-400">৳{totalDue.toLocaleString("bn-BD")}</div>
            </div>
          </div>

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-cream/40 border-b border-gold-500/10">
                    <th className="px-4 py-3 font-medium">নাম</th>
                    <th className="px-4 py-3 font-medium">পদবি</th>
                    <th className="px-4 py-3 font-medium">মাসিক বেতন</th>
                    <th className="px-4 py-3 font-medium">অবস্থা</th>
                    {canEdit && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={5} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
                  {!loading && staffWithSalary.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-cream/40">মাসিক বেতন নির্ধারিত কোনো স্টাফ নেই — "স্টাফ তালিকা" ট্যাব থেকে যোগ করুন।</td></tr>}
                  {staffWithSalary.map((s) => {
                    const paid = !!payments[s.id];
                    return (
                      <tr key={s.id} className="border-b border-gold-500/5 hover:bg-white/5">
                        <td className="px-4 py-3">{s.name}</td>
                        <td className="px-4 py-3 text-cream/60">{s.designation}</td>
                        <td className="px-4 py-3 text-cream/60">৳{s.monthly_salary}</td>
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
        </>
      )}

      {tab === "staff" && (
        <>
          {canEdit && (
            <form onSubmit={handleSubmitStaff} className="glass-card rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <input required placeholder="নাম" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <input placeholder="পদবি (যেমন: শিক্ষক)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} />
              <input placeholder="ফোন নম্বর" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <input placeholder="মাসিক বেতন" type="number" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={form.monthly_salary} onChange={(e) => setForm({ ...form, monthly_salary: e.target.value })} />
              <div className="flex gap-2">
                <input type="date" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm flex-1" value={form.joined_date} onChange={(e) => setForm({ ...form, joined_date: e.target.value })} />
                <button className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 rounded-xl text-sm shrink-0">
                  {editingId ? "আপডেট" : "যোগ করুন"}
                </button>
              </div>
            </form>
          )}

          <div className="glass-card rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-cream/40 border-b border-gold-500/10">
                    <th className="px-4 py-3 font-medium">নাম</th>
                    <th className="px-4 py-3 font-medium">পদবি</th>
                    <th className="px-4 py-3 font-medium">ফোন</th>
                    <th className="px-4 py-3 font-medium">মাসিক বেতন</th>
                    <th className="px-4 py-3 font-medium">যোগদান</th>
                    {canEdit && <th className="px-4 py-3"></th>}
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={6} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
                  {!loading && staff.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center text-cream/40">কোনো স্টাফ যোগ করা হয়নি।</td></tr>}
                  {staff.map((s) => (
                    <tr key={s.id} className="border-b border-gold-500/5 hover:bg-white/5">
                      <td className="px-4 py-3">{s.name}</td>
                      <td className="px-4 py-3 text-cream/60">{s.designation}</td>
                      <td className="px-4 py-3 text-cream/60">{s.phone}</td>
                      <td className="px-4 py-3 text-cream/60">{s.monthly_salary ? `৳${s.monthly_salary}` : "-"}</td>
                      <td className="px-4 py-3 text-cream/60">{s.joined_date || "-"}</td>
                      {canEdit && (
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <button onClick={() => { setForm(s); setEditingId(s.id); setTab("staff"); }} className="text-gold-400 hover:text-gold-300 text-xs mr-3">এডিট</button>
                          <button onClick={() => handleDeleteStaff(s.id)} className="text-red-400 hover:text-red-300 text-xs">মুছুন</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
