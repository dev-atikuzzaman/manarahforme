import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function MemberApprovals({ institutionId, onToast }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("institution_id", institutionId)
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("profiles-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `institution_id=eq.${institutionId}` }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  async function updateStatus(id, status) {
    const { error } = await supabase.from("profiles").update({ status }).eq("id", id);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: status === "approved" ? "সদস্য অনুমোদন করা হয়েছে" : "প্রত্যাখ্যান করা হয়েছে" });
  }

  async function updateRole(id, role) {
    const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
    if (error) onToast({ type: "error", message: error.message });
  }

  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-cream/40 border-b border-gold-500/10">
              <th className="px-4 py-3 font-medium">নাম</th>
              <th className="px-4 py-3 font-medium">ভূমিকা</th>
              <th className="px-4 py-3 font-medium">অবস্থা</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4} className="px-4 py-6 text-center text-cream/40">লোড হচ্ছে...</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gold-500/5">
                <td className="px-4 py-3">{r.full_name}</td>
                <td className="px-4 py-3">
                  <select value={r.role} onChange={(e) => updateRole(r.id, e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1 text-xs" disabled={r.role === "super_admin"}>
                    <option value="viewer">ভিউয়ার</option>
                    <option value="branch_admin">শাখা এডমিন</option>
                    <option value="super_admin">সুপার এডমিন</option>
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${r.status === "approved" ? "bg-emerald-500/15 text-emerald-300" : "bg-gold-500/15 text-gold-300"}`}>
                    {r.status === "approved" ? "অনুমোদিত" : "অপেক্ষমাণ"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  {r.status !== "approved" && (
                    <>
                      <button onClick={() => updateStatus(r.id, "approved")} className="text-emerald-400 hover:text-emerald-300 text-xs mr-3">অনুমোদন</button>
                      <button onClick={() => updateStatus(r.id, "rejected")} className="text-red-400 hover:text-red-300 text-xs">প্রত্যাখ্যান</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
