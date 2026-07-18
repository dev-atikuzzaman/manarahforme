import React, { useState } from "react";
import { supabase } from "../lib/supabase";

export default function Login({ onLoggedIn }) {
  const [mode, setMode] = useState("login"); // login | create | join
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setErr(error.message);
    onLoggedIn(data.session);
  }

  async function handleCreateInstitution(e) {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setBusy(false); return setErr(error.message); }

    const code = Math.random().toString(36).slice(2, 8).toUpperCase();
    const { data: inst, error: instErr } = await supabase
      .from("institutions")
      .insert({ name: institutionName, invite_code: code })
      .select()
      .single();
    if (instErr) { setBusy(false); return setErr(instErr.message); }

    const { error: profErr } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      institution_id: inst.id,
      role: "super_admin",
      status: "approved",
    });
    setBusy(false);
    if (profErr) return setErr(profErr.message);
    setInfo(`প্রতিষ্ঠান তৈরি হয়েছে। ইনভাইট কোড: ${code} — এটা সংরক্ষণ করুন, নতুন সদস্যরা এই কোড দিয়ে যোগ দেবে। ইমেইল ভেরিফাই করে লগইন করুন।`);
    setMode("login");
  }

  async function handleJoin(e) {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    const { data: inst, error: instErr } = await supabase
      .from("institutions")
      .select("id, name")
      .eq("invite_code", joinCode.trim().toUpperCase())
      .maybeSingle();
    if (instErr || !inst) { setBusy(false); return setErr("এই কোডে কোনো প্রতিষ্ঠান পাওয়া যায়নি।"); }

    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setBusy(false); return setErr(error.message); }

    const { error: profErr } = await supabase.from("profiles").insert({
      id: data.user.id,
      full_name: fullName,
      institution_id: inst.id,
      role: "viewer",
      status: "pending",
    });
    setBusy(false);
    if (profErr) return setErr(profErr.message);
    setInfo(`"${inst.name}"-এ যোগদানের অনুরোধ পাঠানো হয়েছে। এডমিন অনুমোদন করলে প্রবেশ করতে পারবেন।`);
    setMode("login");
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-hidden flex items-center justify-center px-4">
      <div className="blob w-96 h-96 bg-gold-500 -top-20 -left-20" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />

      <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 anim-in">
        <div className="text-center mb-6">
          <div className="text-3xl font-display text-gold-400 mb-1">মানারাহ</div>
          <div className="text-cream/50 text-sm">মসজিদ ও মাদ্রাসা ম্যানেজমেন্ট</div>
        </div>

        <div className="motif-divider text-xs mb-6">
          <span>
            {mode === "login" ? "প্রবেশ করুন" : mode === "create" ? "নতুন প্রতিষ্ঠান" : "প্রতিষ্ঠানে যোগ দিন"}
          </span>
        </div>

        {err && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {err}
          </div>
        )}
        {info && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-gold-500/10 border border-gold-500/30 text-gold-300 text-sm">
            {info}
          </div>
        )}

        {mode === "login" && (
          <form onSubmit={handleLogin} className="space-y-3">
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="ইমেইল" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="পাসওয়ার্ড" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={busy} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5 transition shadow-glow disabled:opacity-50">
              {busy ? "..." : "লগইন করুন"}
            </button>
            <div className="flex justify-between text-xs text-cream/50 pt-2">
              <button type="button" onClick={() => setMode("create")} className="hover:text-gold-400">নতুন প্রতিষ্ঠান খুলুন</button>
              <button type="button" onClick={() => setMode("join")} className="hover:text-gold-400">কোড দিয়ে যোগ দিন</button>
            </div>
          </form>
        )}

        {mode === "create" && (
          <form onSubmit={handleCreateInstitution} className="space-y-3">
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="আপনার নাম" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="মসজিদ/মাদ্রাসার নাম" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} required />
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="ইমেইল" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="পাসওয়ার্ড (৬+ ক্যারেক্টার)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={busy} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5 transition shadow-glow disabled:opacity-50">
              {busy ? "..." : "প্রতিষ্ঠান তৈরি করুন"}
            </button>
            <button type="button" onClick={() => setMode("login")} className="w-full text-xs text-cream/50 hover:text-gold-400 pt-1">← লগইনে ফিরুন</button>
          </form>
        )}

        {mode === "join" && (
          <form onSubmit={handleJoin} className="space-y-3">
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="আপনার নাম" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30 uppercase" placeholder="ইনভাইট কোড" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} required />
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="ইমেইল" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="পাসওয়ার্ড (৬+ ক্যারেক্টার)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={busy} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5 transition shadow-glow disabled:opacity-50">
              {busy ? "..." : "যোগদানের অনুরোধ পাঠান"}
            </button>
            <button type="button" onClick={() => setMode("login")} className="w-full text-xs text-cream/50 hover:text-gold-400 pt-1">← লগইনে ফিরুন</button>
          </form>
        )}
      </div>
    </div>
  );
}
