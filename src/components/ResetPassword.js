import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import Logo from "./Logo";
import PasswordInput from "./PasswordInput";

export default function ResetPassword({ onDone }) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) return setErr("পাসওয়ার্ড কমপক্ষে ৬ ক্যারেক্টার হতে হবে।");
    if (password !== confirmPassword) return setErr("দুটো পাসওয়ার্ড মিলছে না — আবার লিখুন।");
    setErr(""); setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setErr(error.message || "পাসওয়ার্ড পরিবর্তন করা যায়নি।");
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-ink-950 bg-radial-fade relative overflow-hidden flex items-center justify-center px-4">
      <div className="blob w-96 h-96 bg-gold-500 -top-20 -left-20" />
      <div className="blob w-[28rem] h-[28rem] bg-ink-600 top-1/3 -right-32" />

      <div className="relative z-10 w-full max-w-md glass-card rounded-3xl p-8 anim-in">
        <div className="text-center mb-6">
          <Logo size={44} className="mx-auto mb-2" />
          <div className="text-3xl font-display text-gold-400 mb-1">মিনার</div>
          <div className="text-cream/50 text-sm">নতুন পাসওয়ার্ড সেট করুন</div>
        </div>

        {done ? (
          <div className="space-y-4 text-center">
            <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">
              পাসওয়ার্ড পরিবর্তন হয়েছে। এখন চালিয়ে যেতে পারেন।
            </div>
            <button onClick={onDone} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5">
              চালিয়ে যান
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            {err && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{err}</div>}
            <PasswordInput
              className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30"
              placeholder="নতুন পাসওয়ার্ড (৬+ ক্যারেক্টার)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <PasswordInput
              className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-4 py-2.5 text-cream placeholder:text-cream/30"
              placeholder="পাসওয়ার্ড আবার লিখুন (কনফার্ম)"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            <button disabled={busy} className="w-full bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold rounded-xl py-2.5 disabled:opacity-50">
              {busy ? "..." : "পাসওয়ার্ড সেট করুন"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
