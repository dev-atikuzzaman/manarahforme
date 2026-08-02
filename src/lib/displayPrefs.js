export const FONT_OPTIONS = [
  { key: "siyam", label: "সিয়াম রুপালি", stack: "'Siyam Rupali', 'NikoshBAN', 'Times New Roman', 'Hind Siliguri', system-ui, sans-serif" },
  { key: "nikoshban", label: "নিকোশ বাংলা", stack: "'NikoshBAN', 'Siyam Rupali', 'Times New Roman', 'Hind Siliguri', system-ui, sans-serif" },
  { key: "nikosh", label: "নিকোশ", stack: "'Nikosh', 'Siyam Rupali', 'Times New Roman', 'Hind Siliguri', system-ui, sans-serif" },
  { key: "kalpurush", label: "কালপুরুষ", stack: "'Kalpurush', 'Siyam Rupali', 'Times New Roman', 'Hind Siliguri', system-ui, sans-serif" },
  { key: "times", label: "Times New Roman (ফোনে থাকলে)", stack: "'Times New Roman', 'Siyam Rupali', 'NikoshBAN', 'Hind Siliguri', system-ui, serif" },
  { key: "hind", label: "Hind Siliguri (ডিফল্ট)", stack: "'Hind Siliguri', 'Siyam Rupali', system-ui, sans-serif" },
];

// সর্বনিম্ন ১৬px রুট সাইজ রাখা হয়েছে যাতে text-xs (0.75rem) কখনো ১২px-এর নিচে না নামে —
// এটাই আমাদের নিজেদের ১২px মিনিমাম নীতির সাথে সামঞ্জস্যপূর্ণ। তাই শুধু "স্বাভাবিক ও তার বড়" অপশন আছে।
export const SIZE_OPTIONS = [
  { key: "normal", label: "স্বাভাবিক", px: 16 },
  { key: "large", label: "বড়", px: 18 },
  { key: "xlarge", label: "অতিরিক্ত বড়", px: 20 },
];

const STORAGE_KEY_FONT = "manarah-font";
const STORAGE_KEY_SIZE = "manarah-font-size";

export function getSavedFont() {
  return localStorage.getItem(STORAGE_KEY_FONT) || "siyam";
}

export function getSavedSize() {
  return localStorage.getItem(STORAGE_KEY_SIZE) || "normal";
}

export function applyDisplayPrefs(fontKey, sizeKey) {
  const font = FONT_OPTIONS.find((f) => f.key === fontKey) || FONT_OPTIONS[0];
  const size = SIZE_OPTIONS.find((s) => s.key === sizeKey) || SIZE_OPTIONS[0];
  document.documentElement.style.setProperty("--app-font", font.stack);
  document.documentElement.style.setProperty("--app-font-scale", `${size.px}px`);
}

export function saveDisplayPrefs(fontKey, sizeKey) {
  localStorage.setItem(STORAGE_KEY_FONT, fontKey);
  localStorage.setItem(STORAGE_KEY_SIZE, sizeKey);
  applyDisplayPrefs(fontKey, sizeKey);
}

// অ্যাপ শুরু হওয়ার সাথে সাথেই (index.js থেকে) আগে সংরক্ষিত পছন্দ প্রয়োগ করার জন্য
export function initDisplayPrefs() {
  applyDisplayPrefs(getSavedFont(), getSavedSize());
}
