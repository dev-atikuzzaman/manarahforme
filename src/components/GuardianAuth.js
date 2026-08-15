import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import Logo from "./Logo";
import PasswordInput from "./PasswordInput";

function safeMessage(error, fallback) {
  if (!error) return fallback;
  if (typeof error === "string" && error.trim()) return error;
  const msg = error.message || error.error_description || error.msg;
  if (typeof msg === "string" && msg.trim() && msg.trim() !== "{}") return msg;
  try {
    const raw = JSON.stringify(error);
    if (raw && raw !== "{}" && raw !== "null") return `${fallback} [${raw.slice(0, 120)}]`;
  } catch (_) {}
  return fallback;
}

export default function GuardianAuth({ onLoggedIn, onSetupChange, onBack }) {
  const [mode, setMode] = useState("login"); // login | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");

  async function handleLogin(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setErr(safeMessage(error, "লগইন ব্যর্থ হয়েছে। ইমেইল/পাসওয়ার্ড চেক করুন।"));
      onLoggedIn(data.session);
    } catch (ex) {
      setErr(safeMessage(ex, "লগইন করা যায়নি, নেটওয়ার্ক সমস্যা হতে পারে।"));
    } finally {
      setBusy(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setErr(""); setInfo(""); setBusy(true);
    onSetupChange?.(true);
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return setErr(safeMessage(error, "সাইন আপ ব্যর্থ হয়েছে, আবার চেষ্টা করুন।"));
      if (!data?.user) return setErr("অ্যাকাউন্ট তৈরি করা যায়নি। ইমেইলটা আগে ব্যবহৃত হয়ে থাকতে পারে।");
      if (data.user.identities && data.user.identities.length === 0) {
        return setErr("এই ইমেইল দিয়ে ইতিমধ্যে একটা অ্যাকাউন্ট আছে। নিচে লগইন করুন।");
      }

      if (!data.session) {
        setInfo("অ্যাকাউন্ট তৈরি হয়েছে। ইমেইল ভেরিফাই করে লগইন করুন, এরপর সন্তানের কোড দিয়ে লিংক করুন।");
        setMode("login");
        return;
      }

      const { error: linkErr } = await supabase.rpc("link_guardian_to_student", { p_code: code });
      if (linkErr) return setErr(safeMessage(linkErr, "কোড দিয়ে লিংক করা যায়নি।"));
      onLoggedIn(data.session);
    } catch (ex) {
      setErr(safeMessage(ex, "সাইন আপ করা যায়নি, নেটওয়ার্ক সমস্যা হতে পারে।"));
    } finally {
      setBusy(false);
      onSetupChange?.(false);
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-hidden flex items-center justify-center px-4">
      <div className="blob w-96 h-96 bg-gold-500 -top-20 -left-20" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />

      <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 anim-in">
        <div className="text-center mb-6">
          <Logo size={44} className="mx-auto mb-2" />
          <div className="text-3xl font-display text-gold-400 mb-1">মিনার</div>
          <div className="text-cream/50 text-sm">অভিভাবক পোর্টাল</div>
        </div>

        {err && <div className="mb-4 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{err}</div>}
        {info && <div className="mb-4 px-3 py-2 rounded-lg bg-gold-500/10 border border-gold-500/30 text-gold-300 text-sm">{info}</div>}

        {mode === "login" ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="ইমেইল" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <PasswordInput className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="পাসওয়ার্ড" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <button disabled={busy} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5 transition shadow-glow disabled:opacity-50">
              {busy ? "..." : "লগইন করুন"}
            </button>
            <button type="button" onClick={() => setMode("signup")} className="w-full text-xs text-cream/50 hover:text-gold-400 pt-1">নতুন অভিভাবক অ্যাকাউন্ট খুলুন</button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-3">
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="ইমেইল" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <PasswordInput className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30" placeholder="পাসওয়ার্ড (৬+ ক্যারেক্টার)" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30 uppercase" placeholder="সন্তানের পোর্টাল কোড" value={code} onChange={(e) => setCode(e.target.value)} required />
            <p className="text-xs text-cream/35">এই কোডটা প্রতিষ্ঠানের অফিস/শিক্ষক থেকে সংগ্রহ করুন।</p>
            <button disabled={busy} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5 transition shadow-glow disabled:opacity-50">
              {busy ? "..." : "অ্যাকাউন্ট খুলে লিংক করুন"}
            </button>
            <button type="button" onClick={() => setMode("login")} className="w-full text-xs text-cream/50 hover:text-gold-400 pt-1">← লগইনে ফিরুন</button>
          </form>
        )}

        <button onClick={onBack} className="w-full text-center text-xs text-cream/30 hover:text-cream/50 pt-5">← হোমপেজে ফিরুন</button>
      </div>
    </div>
  );
}
