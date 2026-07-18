import React from "react";

export default function Toast({ toast }) {
  if (!toast) return null;
  const isError = toast.type === "error";
  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 toast-in px-4 py-2.5 rounded-xl text-sm font-medium shadow-card border ${
        isError
          ? "bg-red-500/15 border-red-500/30 text-red-200"
          : "bg-gold-500/15 border-gold-500/30 text-gold-300"
      }`}
    >
      {toast.message}
    </div>
  );
}
