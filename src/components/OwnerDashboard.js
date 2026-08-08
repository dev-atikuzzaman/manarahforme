import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import Logo from "./Logo";

const STATUS_LABEL = { trial: "ট্রায়াল", active: "সক্রিয়", suspended: "স্থগিত" };
const STATUS_COLOR = {
  trial: "bg-gold-500/15 text-gold-300 border-gold-500/30",
  active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  suspended: "bg-red-500/15 text-red-300 border-red-500/30",
};

export default function OwnerDashboard({ onSwitchToInstitution, hasOwnInstitution, onLogout }) {
  const [ownerTab, setOwnerTab] = useState("institutions"); // institutions | payments
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [details, setDetails] = useState({});
  const [query, setQuery] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [addingOwner, setAddingOwner] = useState(false);
  const [ownerMsg, setOwnerMsg] = useState(null);
  const [payments, setPayments] = useState([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data?.user?.id || null));
  }, []);

  async function loadPayments() {
    setPaymentsLoading(true);
    const { data } = await supabase
      .from("platform_payments")
      .select("*, institutions(name)")
      .order("created_at", { ascending: false });
    setPayments(data || []);
    setPaymentsLoading(false);
  }

  useEffect(() => {
    loadPayments();
    const channel = supabase
      .channel("owner-payments-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_payments" }, loadPayments)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  const pendingCount = payments.filter((p) => p.status === "pending").length;

  async function verifyPayment(p) {
    const { error: payErr } = await supabase.from("platform_payments").update({
      status: "verified",
      verified_by: myUserId,
      verified_at: new Date().toISOString(),
    }).eq("id", p.id);
    if (payErr) return alert(payErr.message);

    const inst = institutions.find((i) => i.id === p.institution_id);
    const base = inst?.trial_ends_at && new Date(inst.trial_ends_at) > new Date() ? new Date(inst.trial_ends_at) : new Date();
    base.setDate(base.getDate() + Number(p.months_covered) * 30);
    const { error: instErr } = await supabase.from("institutions").update({
      plan_status: "active",
      trial_ends_at: base.toISOString(),
    }).eq("id", p.institution_id);
    if (instErr) return alert(instErr.message);
  }

  async function rejectPayment(p) {
    const note = prompt("প্রত্যাখ্যানের কারণ (ঐচ্ছিক):") || "";
    const { error } = await supabase.from("platform_payments").update({ status: "rejected", note, verified_by: myUserId, verified_at: new Date().toISOString() }).eq("id", p.id);
    if (error) alert(error.message);
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("institutions").select("*").order("created_at", { ascending: false });
    setInstitutions(data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    const channel = supabase
      .channel("owner-institutions-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "institutions" }, load)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, []);

  async function loadDetails(inst) {
    if (details[inst.id]) return;
    const [{ count: students }, { count: members }, { data: donations }] = await Promise.all([
      supabase.from("students").select("id", { count: "exact", head: true }).eq("institution_id", inst.id),
      supabase.from("profiles").select("id", { count: "exact", head: true }).eq("institution_id", inst.id),
      supabase.from("donations").select("amount").eq("institution_id", inst.id),
    ]);
    const donationsTotal = (donations || []).reduce((s, d) => s + Number(d.amount || 0), 0);
    setDetails((prev) => ({ ...prev, [inst.id]: { students: students || 0, members: members || 0, donationsTotal } }));
  }

  function toggleExpand(inst) {
    const next = expanded === inst.id ? null : inst.id;
    setExpanded(next);
    if (next) loadDetails(inst);
  }

  async function updateStatus(inst, plan_status) {
    const patch = { plan_status };
    if (plan_status === "trial") patch.trial_ends_at = new Date(Date.now() + 30 * 86400000).toISOString();
    const { error } = await supabase.from("institutions").update(patch).eq("id", inst.id);
    if (error) alert(error.message);
  }

  async function extendTrial(inst) {
    const base = inst.trial_ends_at && new Date(inst.trial_ends_at) > new Date() ? new Date(inst.trial_ends_at) : new Date();
    base.setDate(base.getDate() + 30);
    const { error } = await supabase.from("institutions").update({ trial_ends_at: base.toISOString(), plan_status: "trial" }).eq("id", inst.id);
    if (error) alert(error.message);
  }

  async function handleDelete(inst) {
    if (prompt(`নিশ্চিত করতে প্রতিষ্ঠানের নাম হুবহু লিখুন:\n${inst.name}`) !== inst.name) return;
    const { error } = await supabase.from("institutions").delete().eq("id", inst.id);
    if (error) alert(error.message);
  }

  async function handleAddOwner(e) {
    e.preventDefault();
    setAddingOwner(true);
    setOwnerMsg(null);
    const { error } = await supabase.rpc("add_platform_admin", { p_email: ownerEmail });
    setAddingOwner(false);
    if (error) return setOwnerMsg({ ok: false, text: error.message });
    setOwnerMsg({ ok: true, text: `${ownerEmail} এখন প্ল্যাটফর্ম ওনার।` });
    setOwnerEmail("");
  }

  const filtered = institutions.filter((i) => i.name.toLowerCase().includes(query.toLowerCase()));

  const summary = useMemo(() => {
    const total = institutions.length;
    const active = institutions.filter((i) => i.plan_status === "active").length;
    const trial = institutions.filter((i) => i.plan_status === "trial" || !i.plan_status).length;
    const suspended = institutions.filter((i) => i.plan_status === "suspended").length;
    return { total, active, trial, suspended };
  }, [institutions]);

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-hidden">
      <div className="blob w-96 h-96 bg-gold-500 -top-24 -left-24" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <div>
              <div className="font-display text-2xl text-gold-400">মানারাহ</div>
              <div className="text-xs text-cream/40">প্ল্যাটফর্ম ওনার প্যানেল</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasOwnInstitution && (
              <button onClick={onSwitchToInstitution} className="text-xs border border-gold-500/30 text-gold-400 hover:bg-white/5 px-3 py-2 rounded-xl">
                আমার প্রতিষ্ঠান ড্যাশবোর্ড →
              </button>
            )}
            <button onClick={onLogout} className="text-xs text-cream/50 hover:text-red-300">লগআউট</button>
          </div>
        </div>

        <div className="grid sm:grid-cols-4 gap-4 mb-6">
          <div className="glass-card rounded-2xl p-5"><div className="text-cream/40 text-xs mb-1">মোট প্রতিষ্ঠান</div><div className="text-2xl font-display text-gold-400">{summary.total}</div></div>
          <div className="glass-card rounded-2xl p-5"><div className="text-cream/40 text-xs mb-1">সক্রিয়</div><div className="text-2xl font-display text-emerald-400">{summary.active}</div></div>
          <div className="glass-card rounded-2xl p-5"><div className="text-cream/40 text-xs mb-1">ট্রায়ালে</div><div className="text-2xl font-display text-gold-300">{summary.trial}</div></div>
          <div className="glass-card rounded-2xl p-5"><div className="text-cream/40 text-xs mb-1">স্থগিত</div><div className="text-2xl font-display text-red-400">{summary.suspended}</div></div>
        </div>

        <div className="flex gap-2 mb-6">
          <button onClick={() => setOwnerTab("institutions")} className={`px-4 py-2 rounded-xl text-sm ${ownerTab === "institutions" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>প্রতিষ্ঠান</button>
          <button onClick={() => setOwnerTab("payments")} className={`px-4 py-2 rounded-xl text-sm relative ${ownerTab === "payments" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>
            পেমেন্ট ভেরিফিকেশন
            {pendingCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{pendingCount}</span>}
          </button>
        </div>

        {ownerTab === "payments" && (
          <PaymentsPanel payments={payments} loading={paymentsLoading} onVerify={verifyPayment} onReject={rejectPayment} />
        )}

        {ownerTab === "institutions" && (
        <>
        <form onSubmit={handleAddOwner} className="glass-card rounded-2xl p-5 mb-6 flex flex-wrap gap-3 items-start">
          <div className="flex-1 min-w-[200px]">
            <div className="text-sm text-cream/60 mb-2">আরেকজনকে প্ল্যাটফর্ম ওনার বানান</div>
            <input
              placeholder="ইমেইল (আগে থেকেই অ্যাকাউন্ট থাকতে হবে)"
              type="email"
              className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              required
            />
            {ownerMsg && (
              <p className={`text-xs mt-2 ${ownerMsg.ok ? "text-emerald-400" : "text-red-400"}`}>{ownerMsg.text}</p>
            )}
          </div>
          <button disabled={addingOwner} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2 rounded-xl text-sm self-end disabled:opacity-50">
            {addingOwner ? "..." : "ওনার বানান"}
          </button>
        </form>

        <input
          placeholder="প্রতিষ্ঠানের নাম দিয়ে খুঁজুন..."
          className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-sm mb-4"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {loading && <div className="text-center text-cream/40 py-10">লোড হচ্ছে...</div>}
        {!loading && filtered.length === 0 && <div className="glass-card rounded-2xl p-8 text-center text-cream/40">কোনো প্রতিষ্ঠান পাওয়া যায়নি।</div>}

        <div className="space-y-3">
          {filtered.map((inst) => {
            const trialExpired = inst.trial_ends_at && new Date(inst.trial_ends_at) < new Date() && (inst.plan_status === "trial" || !inst.plan_status);
            return (
              <div key={inst.id} className="glass-card rounded-2xl overflow-hidden">
                <button onClick={() => toggleExpand(inst)} className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-white/5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-ink-900/60 border border-gold-500/20 flex items-center justify-center overflow-hidden shrink-0">
                      {inst.logo_url ? <img src={inst.logo_url} alt="" className="w-full h-full object-cover" /> : <span className="text-gold-400/40">✦</span>}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-cream/90 truncate">{inst.name}</div>
                      <div className="text-xs text-cream/40">কোড: {inst.invite_code} · {new Date(inst.created_at).toLocaleDateString("bn-BD")}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {trialExpired && <span className="text-xs px-2 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">ট্রায়াল শেষ</span>}
                    <span className={`text-xs px-2.5 py-1 rounded-full border ${STATUS_COLOR[inst.plan_status || "trial"]}`}>
                      {STATUS_LABEL[inst.plan_status || "trial"]}
                    </span>
                  </div>
                </button>

                {expanded === inst.id && (
                  <div className="px-5 pb-5 border-t border-gold-500/10 pt-4 space-y-4">
                    <div className="grid sm:grid-cols-3 gap-3">
                      <div className="bg-ink-900/40 rounded-xl p-3"><div className="text-xs text-cream/40">শিক্ষার্থী/সদস্য</div><div className="text-gold-400 font-semibold">{details[inst.id]?.students ?? "..."}</div></div>
                      <div className="bg-ink-900/40 rounded-xl p-3"><div className="text-xs text-cream/40">স্টাফ সদস্য</div><div className="text-gold-400 font-semibold">{details[inst.id]?.members ?? "..."}</div></div>
                      <div className="bg-ink-900/40 rounded-xl p-3"><div className="text-xs text-cream/40">মোট দান</div><div className="text-gold-400 font-semibold">৳{(details[inst.id]?.donationsTotal ?? 0).toLocaleString("bn-BD")}</div></div>
                    </div>

                    {inst.trial_ends_at && (
                      <div className="text-xs text-cream/40">ট্রায়াল শেষ হবে: {new Date(inst.trial_ends_at).toLocaleDateString("bn-BD")}</div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => updateStatus(inst, "active")} className="text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-600/30">সক্রিয় করুন</button>
                      <button onClick={() => extendTrial(inst)} className="text-xs bg-gold-500/15 border border-gold-500/30 text-gold-300 px-3 py-1.5 rounded-lg hover:bg-gold-500/25">ট্রায়াল +৩০ দিন</button>
                      <button onClick={() => updateStatus(inst, "suspended")} className="text-xs bg-red-500/15 border border-red-500/30 text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/25">স্থগিত করুন</button>
                      <button onClick={() => handleDelete(inst)} className="text-xs bg-red-700/20 border border-red-600/40 text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-700/30 ml-auto">স্থায়ীভাবে মুছুন</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
        )}
      </div>
    </div>
  );
}

const METHOD_LABEL = { bkash: "বিকাশ", nagad: "নগদ", rocket: "রকেট", upay: "উপায়", bank: "ব্যাংক", other: "অন্যান্য" };

function PaymentsPanel({ payments, loading, onVerify, onReject }) {
  const [filter, setFilter] = useState("pending");
  const filtered = payments.filter((p) => filter === "all" || p.status === filter);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {["pending", "verified", "rejected", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-xs ${filter === f ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>
            {f === "pending" ? "অপেক্ষমাণ" : f === "verified" ? "যাচাইকৃত" : f === "rejected" ? "প্রত্যাখ্যাত" : "সব"}
          </button>
        ))}
      </div>

      {loading && <div className="text-center text-cream/40 py-10">লোড হচ্ছে...</div>}
      {!loading && filtered.length === 0 && <div className="glass-card rounded-2xl p-8 text-center text-cream/40">কোনো পেমেন্ট নেই।</div>}

      <div className="space-y-3">
        {filtered.map((p) => (
          <div key={p.id} className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm text-cream/90 font-medium">{p.institutions?.name || "অজানা প্রতিষ্ঠান"}</div>
              <div className="text-xs text-cream/50 mt-1">
                {METHOD_LABEL[p.method]} · ৳{Number(p.amount).toLocaleString("bn-BD")} · {p.months_covered} মাস · প্রেরক: {p.sender_number}
              </div>
              <div className="text-xs text-cream/40">TrxID: {p.transaction_id} · {new Date(p.created_at).toLocaleString("bn-BD")}</div>
              {p.note && <div className="text-xs text-red-300/70 mt-1">{p.note}</div>}
            </div>
            {p.status === "pending" ? (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => onVerify(p)} className="text-xs bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-600/30">যাচাই করুন</button>
                <button onClick={() => onReject(p)} className="text-xs bg-red-500/15 border border-red-500/30 text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/25">প্রত্যাখ্যান</button>
              </div>
            ) : (
              <span className={`text-xs px-2.5 py-1 rounded-full shrink-0 ${p.status === "verified" ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"}`}>
                {p.status === "verified" ? "যাচাইকৃত" : "প্রত্যাখ্যাত"}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
