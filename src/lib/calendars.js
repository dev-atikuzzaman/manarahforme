const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
export function toBnDigits(n) {
  return String(n).replace(/[0-9]/g, (d) => BN_DIGITS[d]);
}

const BN_MONTHS = ["বৈশাখ", "জ্যৈষ্ঠ", "আষাঢ়", "শ্রাবণ", "ভাদ্র", "আশ্বিন", "কার্তিক", "অগ্রহায়ণ", "পৌষ", "মাঘ", "ফাল্গুন", "চৈত্র"];
const MONTH_LEN_FIXED = [31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 30]; // প্রথম ১১ মাস, চৈত্র বাদে (২০১৯ সংস্কার অনুযায়ী)

/**
 * বাংলা সৌর পঞ্জিকা (বাংলাদেশ সরকারের ২০১৯ সংস্কার অনুযায়ী) — পহেলা বৈশাখ সবসময় ১৪ এপ্রিল।
 * চৈত্র মাসের দৈর্ঘ্য স্বয়ংক্রিয়ভাবে গণনা করা হয় (৩০ বা ৩১) যাতে গ্রেগরিয়ান লিপ ইয়ারের সাথে ঠিক মেলে।
 */
export function getBengaliDate(date) {
  const y = date.getFullYear();
  const april14ThisYear = new Date(y, 3, 14);
  const startOfBengaliYear = date >= april14ThisYear ? april14ThisYear : new Date(y - 1, 3, 14);
  const nextApril14 = new Date(startOfBengaliYear.getFullYear() + 1, 3, 14);

  const daysInBengaliYear = Math.round((nextApril14 - startOfBengaliYear) / 86400000);
  const chaitraLen = daysInBengaliYear - MONTH_LEN_FIXED.reduce((a, b) => a + b, 0);
  const monthLengths = [...MONTH_LEN_FIXED, chaitraLen];

  const dayOfBengaliYear = Math.floor((date - startOfBengaliYear) / 86400000); // 0-indexed
  let remaining = dayOfBengaliYear;
  let monthIndex = 0;
  while (remaining >= monthLengths[monthIndex]) {
    remaining -= monthLengths[monthIndex];
    monthIndex += 1;
  }
  const dayOfMonth = remaining + 1;
  const bengaliYear = startOfBengaliYear.getFullYear() - 593;

  return { day: dayOfMonth, month: BN_MONTHS[monthIndex], year: bengaliYear };
}

const HIJRI_MONTHS = [
  "মুহাররম", "সফর", "রবিউল আউয়াল", "রবিউস সানি",
  "জমাদিউল আউয়াল", "জমাদিউস সানি", "রজব", "শাবান",
  "রমজান", "শাওয়াল", "জিলক্বদ", "জিলহজ",
];

/**
 * হিজরি তারিখ — ব্রাউজারের Intl.DateTimeFormat (Umm al-Qura ক্যালেন্ডার) ব্যবহার করে।
 * এটা একটা গাণিতিক আনুমানিক হিসাব — স্থানীয় চাঁদ দেখা সাপেক্ষে বাস্তব তারিখ ১ দিন আগে-পরে হতে পারে,
 * তাই রোজা/ঈদের মতো গুরুত্বপূর্ণ বিষয়ে স্থানীয় ঘোষণা অনুসরণ করা উচিত।
 */
export function getHijriDate(date) {
  try {
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura", { day: "numeric", month: "numeric", year: "numeric" });
    const parts = formatter.formatToParts(date);
    const day = Number(parts.find((p) => p.type === "day")?.value);
    const month = Number(parts.find((p) => p.type === "month")?.value);
    const year = Number(parts.find((p) => p.type === "year")?.value);
    if (!day || !month || !year) return null;
    return { day, month: HIJRI_MONTHS[month - 1], year };
  } catch (_) {
    return null;
  }
}

export function getBengaliWeekday(date) {
  try {
    return new Intl.DateTimeFormat("bn-BD", { weekday: "long" }).format(date);
  } catch (_) {
    const days = ["রবিবার", "সোমবার", "মঙ্গলবার", "বুধবার", "বৃহস্পতিবার", "শুক্রবার", "শনিবার"];
    return days[date.getDay()];
  }
}

const EN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function getEnglishDate(date) {
  return { day: date.getDate(), month: EN_MONTHS[date.getMonth()], year: date.getFullYear() };
}
