"use client";

import React from "react";

interface StatusBannerProps {
    message: string;
    type: "info" | "success" | "error" | "loading";
    className?: string;
}

const colorMap: Record<StatusBannerProps["type"], string> = {
    success:
        "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20",
    error:
        "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20",
    loading:
        "text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-500/10 dark:border-teal-500/20",
    info:
        "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-white/5 dark:border-white/10",
};

export default function StatusBanner({ message, type, className = "" }: StatusBannerProps) {
    if (!message) return null;

    return (
        <div
            role="status"
            aria-live="polite"
            className={`mt-6 px-4 py-3 rounded-xl border font-medium ${colorMap[type]} ${className}`}
        >
            {message}
        </div>
    );
}
