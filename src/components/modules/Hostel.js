import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import { exportExcel } from "../../lib/exportUtils";

export default function Hostel({ institutionId, canEdit, onToast }) {
  const [tab, setTab] = useState("residents"); // rooms | residents | meals
  const [rooms, setRooms] = useState([]);
  const [students, setStudents] = useState([]);
  const [mealCost, setMealCost] = useState(0);
  const [loading, setLoading] = useState(true);

  async function loadAll() {
    setLoading(true);
    const [{ data: rm }, { data: st }, { data: inst }] = await Promise.all([
      supabase.from("hostel_rooms").select("*").eq("institution_id", institutionId).order("room_number"),
      supabase.from("students").select("*").eq("institution_id", institutionId).order("name"),
      supabase.from("institutions").select("meal_cost").eq("id", institutionId).maybeSingle(),
    ]);
    setRooms(rm || []);
    setStudents(st || []);
    setMealCost(inst?.meal_cost || 0);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel("hostel-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "hostel_rooms", filter: `institution_id=eq.${institutionId}` }, loadAll)
      .on("postgres_changes", { event: "*", schema: "public", table: "students", filter: `institution_id=eq.${institutionId}` }, loadAll)
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId]);

  const residents = useMemo(() => students.filter((s) => s.is_resident), [students]);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setTab("residents")} className={`px-4 py-2 rounded-xl text-sm ${tab === "residents" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>আবাসিক শিক্ষার্থী</button>
        <button onClick={() => setTab("rooms")} className={`px-4 py-2 rounded-xl text-sm ${tab === "rooms" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>রুম ব্যবস্থাপনা</button>
        <button onClick={() => setTab("meals")} className={`px-4 py-2 rounded-xl text-sm ${tab === "meals" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>মিল হিসাব</button>
      </div>

      {loading && <div className="text-center text-cream/40 py-10">লোড হচ্ছে...</div>}

      {!loading && tab === "rooms" && (
        <RoomsTab institutionId={institutionId} rooms={rooms} students={students} canEdit={canEdit} onToast={onToast} onChanged={loadAll} />
      )}
      {!loading && tab === "residents" && (
        <ResidentsTab institutionId={institutionId} students={students} rooms={rooms} canEdit={canEdit} onToast={onToast} />
      )}
      {!loading && tab === "meals" && (
        <MealsTab institutionId={institutionId} residents={residents} mealCost={mealCost} canEdit={canEdit} onToast={onToast} onMealCostChanged={setMealCost} />
      )}
    </div>
  );
}

function RoomsTab({ institutionId, rooms, students, canEdit, onToast, onChanged }) {
  const [roomNumber, setRoomNumber] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState(null);

  const occupancy = (roomId) => students.filter((s) => s.is_resident && s.room_id === roomId).length;

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = { institution_id: institutionId, room_number: roomNumber, capacity: Number(capacity), notes };
    const { error } = editingId
      ? await supabase.from("hostel_rooms").update(payload).eq("id", editingId)
      : await supabase.from("hostel_rooms").insert(payload);
    if (error) return onToast({ type: "error", message: error.message });
    onToast({ message: editingId ? "রুম হালনাগাদ হয়েছে" : "নতুন রুম যোগ হয়েছে" });
    setRoomNumber(""); setCapacity(4); setNotes(""); setEditingId(null);
    onChanged();
  }

  async function handleDelete(id) {
    if (!window.confirm("এই রুম মুছে ফেলবেন?")) return;
    const { error } = await supabase.from("hostel_rooms").delete().eq("id", id);
    if (error) onToast({ type: "error", message: error.message });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input required placeholder="রুম নম্বর (যেমন: ১০১)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
          <input required type="number" placeholder="ধারণক্ষমতা" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          <input placeholder="মন্তব্য (ঐচ্ছিক)" className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 rounded-xl text-sm">{editingId ? "আপডেট" : "রুম যোগ করুন"}</button>
        </form>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.length === 0 && <div className="glass-card rounded-2xl p-8 text-center text-cream/40 sm:col-span-2 lg:col-span-3">এখনো কোনো রুম যোগ করা হয়নি।</div>}
        {rooms.map((r) => {
          const occ = occupancy(r.id);
          const full = occ >= r.capacity;
          return (
            <div key={r.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-gold-400">রুম {r.room_number}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${full ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>{occ}/{r.capacity}</span>
              </div>
              {r.notes && <div className="text-xs text-cream/40 mb-3">{r.notes}</div>}
              {canEdit && (
                <div className="flex gap-3 text-xs">
                  <button onClick={() => { setRoomNumber(r.room_number); setCapacity(r.capacity); setNotes(r.notes || ""); setEditingId(r.id); }} className="text-gold-400 hover:text-gold-300">এডিট</button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-300">মুছুন</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ResidentsTab({ institutionId, students, rooms, canEdit, onToast }) {
  const [query, setQuery] = useState("");

  async function toggleResident(student) {
    if (!canEdit) return;
    const { error } = await supabase.from("students").update({ is_resident: !student.is_resident, room_id: student.is_resident ? null : student.room_id }).eq("id", student.id);
    if (error) onToast({ type: "error", message: error.message });
  }

  async function assignRoom(student, roomId) {
    if (!canEdit) return;
    const { error } = await supabase.from("students").update({ room_id: roomId || null }).eq("id", student.id);
    if (error) onToast({ type: "error", message: error.message });
  }

  async function setHostelFee(student, value) {
    if (!canEdit) return;
    const { error } = await supabase.from("students").update({ hostel_monthly_fee: value === "" ? null : Number(value) }).eq("id", student.id);
    if (error) onToast({ type: "error", message: error.message });
  }

  const filtered = students.filter((s) => (s.name + (s.class_name || "")).toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-4">
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
                <th className="px-4 py-3 font-medium">আবাসিক?</th>
                <th className="px-4 py-3 font-medium">রুম</th>
                <th className="px-4 py-3 font-medium">হোস্টেল ফি</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-cream/40">কোনো শিক্ষার্থী নেই।</td></tr>}
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-gold-500/5 hover:bg-white/5">
                  <td className="px-4 py-2.5">{s.name}</td>
                  <td className="px-4 py-2.5 text-cream/60">{s.class_name}</td>
                  <td className="px-4 py-2.5">
                    <button disabled={!canEdit} onClick={() => toggleResident(s)} className={`text-xs px-2.5 py-1 rounded-lg border ${s.is_resident ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "border-white/10 text-cream/40"}`}>
                      {s.is_resident ? "আবাসিক" : "অনাবাসিক"}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">
                    {s.is_resident && (
                      <select disabled={!canEdit} value={s.room_id || ""} onChange={(e) => assignRoom(s, e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1 text-xs">
                        <option value="">— বাছাই করুন —</option>
                        {rooms.map((r) => <option key={r.id} value={r.id}>রুম {r.room_number}</option>)}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {s.is_resident && (
                      <input disabled={!canEdit} type="number" defaultValue={s.hostel_monthly_fee ?? ""} onBlur={(e) => setHostelFee(s, e.target.value)} placeholder="৳" className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1 text-xs w-24" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MealsTab({ institutionId, residents, mealCost, canEdit, onToast, onMealCostChanged }) {
  const [view, setView] = useState("daily"); // daily | monthly
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthKey, setMonthKey] = useState(() => new Date().toISOString().slice(0, 7));
  const [dailyRecords, setDailyRecords] = useState({});
  const [monthlyTotals, setMonthlyTotals] = useState({});
  const [costInput, setCostInput] = useState(mealCost);
  const [savingCost, setSavingCost] = useState(false);

  useEffect(() => { setCostInput(mealCost); }, [mealCost]);

  async function loadDaily() {
    const { data } = await supabase.from("meal_records").select("*").eq("institution_id", institutionId).eq("date", date);
    const map = {};
    (data || []).forEach((r) => { map[r.student_id] = r; });
    setDailyRecords(map);
  }

  async function loadMonthly() {
    const start = `${monthKey}-01`;
    const endDate = new Date(monthKey + "-01");
    endDate.setMonth(endDate.getMonth() + 1);
    const end = endDate.toISOString().slice(0, 10);
    const { data } = await supabase.from("meal_records").select("student_id, meals").eq("institution_id", institutionId).gte("date", start).lt("date", end);
    const totals = {};
    (data || []).forEach((r) => { totals[r.student_id] = (totals[r.student_id] || 0) + Number(r.meals); });
    setMonthlyTotals(totals);
  }

  useEffect(() => {
    if (view === "daily") loadDaily(); else loadMonthly();
    const channel = supabase
      .channel("meal-records-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "meal_records", filter: `institution_id=eq.${institutionId}` }, () => {
        if (view === "daily") loadDaily(); else loadMonthly();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [institutionId, date, monthKey, view]);

  async function saveMeal(studentId, value) {
    if (!canEdit) return;
    const meals = value === "" ? 0 : Number(value);
    const { error } = await supabase.from("meal_records").upsert(
      { institution_id: institutionId, student_id: studentId, date, meals },
      { onConflict: "student_id,date" }
    );
    if (error) onToast({ type: "error", message: error.message });
  }

  async function saveMealCost(e) {
    e.preventDefault();
    setSavingCost(true);
    const { error } = await supabase.from("institutions").update({ meal_cost: Number(costInput) }).eq("id", institutionId);
    setSavingCost(false);
    if (error) return onToast({ type: "error", message: error.message });
    onMealCostChanged(Number(costInput));
    onToast({ message: "প্রতি মিলের খরচ হালনাগাদ হয়েছে" });
  }

  function exportMonthlyBill() {
    exportExcel({
      filename: `meal-bill-${monthKey}.xlsx`,
      sheetName: "মিল হিসাব",
      headers: ["নাম", "মোট মিল", "প্রতি মিল", "সর্বমোট বিল"],
      rows: residents.map((s) => [s.name, monthlyTotals[s.id] || 0, mealCost, (monthlyTotals[s.id] || 0) * mealCost]),
    });
  }

  return (
    <div className="space-y-4">
      {canEdit && (
        <form onSubmit={saveMealCost} className="glass-card rounded-2xl p-5 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[160px]">
            <div className="text-xs text-cream/50 mb-1">প্রতি মিলের খরচ (৳)</div>
            <input type="number" className="w-full bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" value={costInput} onChange={(e) => setCostInput(e.target.value)} />
          </div>
          <button disabled={savingCost} className="bg-gold-500 hover:bg-gold-400 text-ink-950 font-semibold px-4 py-2 rounded-xl text-sm disabled:opacity-50">
            {savingCost ? "..." : "সংরক্ষণ করুন"}
          </button>
        </form>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button onClick={() => setView("daily")} className={`px-3 py-1.5 rounded-lg text-xs ${view === "daily" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>দৈনিক এন্ট্রি</button>
          <button onClick={() => setView("monthly")} className={`px-3 py-1.5 rounded-lg text-xs ${view === "monthly" ? "bg-gold-500/15 text-gold-300 border border-gold-500/30" : "text-cream/50 border border-white/10"}`}>মাসিক বিল</button>
        </div>
        {view === "daily" ? (
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" />
        ) : (
          <div className="flex gap-2">
            <input type="month" value={monthKey} onChange={(e) => setMonthKey(e.target.value)} className="bg-ink-900/60 border border-gold-500/20 rounded-xl px-3 py-2 text-sm" />
            <button onClick={exportMonthlyBill} disabled={residents.length === 0} className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 px-4 py-2 rounded-xl text-sm disabled:opacity-40">Excel</button>
          </div>
        )}
      </div>

      {residents.length === 0 && <div className="glass-card rounded-2xl p-8 text-center text-cream/40">কোনো আবাসিক শিক্ষার্থী নেই — "আবাসিক শিক্ষার্থী" ট্যাব থেকে যোগ করুন।</div>}

      {residents.length > 0 && view === "daily" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-cream/40 border-b border-gold-500/10">
                  <th className="px-4 py-3 font-medium">নাম</th>
                  <th className="px-4 py-3 font-medium">আজকের মিল সংখ্যা</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((s) => (
                  <tr key={s.id} className="border-b border-gold-500/5 hover:bg-white/5">
                    <td className="px-4 py-2.5">{s.name}</td>
                    <td className="px-4 py-2.5">
                      <input
                        disabled={!canEdit}
                        type="number"
                        step="0.5"
                        min="0"
                        max="3"
                        defaultValue={dailyRecords[s.id]?.meals ?? ""}
                        onBlur={(e) => saveMeal(s.id, e.target.value)}
                        placeholder="0-3"
                        className="bg-ink-900/60 border border-gold-500/20 rounded-lg px-2 py-1 text-xs w-20"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {residents.length > 0 && view === "monthly" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-cream/40 border-b border-gold-500/10">
                  <th className="px-4 py-3 font-medium">নাম</th>
                  <th className="px-4 py-3 font-medium">মোট মিল</th>
                  <th className="px-4 py-3 font-medium">সর্বমোট বিল</th>
                </tr>
              </thead>
              <tbody>
                {residents.map((s) => (
                  <tr key={s.id} className="border-b border-gold-500/5 hover:bg-white/5">
                    <td className="px-4 py-2.5">{s.name}</td>
                    <td className="px-4 py-2.5 text-cream/60">{monthlyTotals[s.id] || 0}</td>
                    <td className="px-4 py-2.5 text-gold-300">৳{((monthlyTotals[s.id] || 0) * mealCost).toLocaleString("bn-BD")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
