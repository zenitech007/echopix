"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-300">

      {/* Soft Animated Background Mesh */}
      <motion.div
        animate={{ x: [0, 60, -60, 0], y: [0, -40, 40, 0] }}
        transition={{ repeat: Infinity, duration: 25 }}
        className="absolute w-75 sm:w-150 h-75 sm:h-150 bg-emerald-200/40 dark:bg-emerald-500/10 rounded-full blur-[80px] sm:blur-[120px] -z-10"
      />
      <motion.div
        animate={{ x: [0, -80, 80, 0], y: [0, 60, -60, 0] }}
        transition={{ repeat: Infinity, duration: 30 }}
        className="absolute w-62.5 sm:w-125 h-62.5 sm:h-125 bg-teal-200/40 dark:bg-teal-500/10 rounded-full blur-[80px] sm:blur-[120px] -z-10 right-0 top-1/4"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl text-center mt-6 sm:mt-0"
      >
        {/* Responsive Typography */}
        <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-slate-800 dark:text-white tracking-tight mb-4 sm:mb-6 leading-[1.15] sm:leading-tight transition-colors">
          Study smarter, <br className="hidden sm:block" />
          <span className="bg-linear-to-r from-emerald-500 to-teal-500 text-transparent bg-clip-text">
            not harder.
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed px-2 sm:px-0 transition-colors">
          EchoPix is your AI-powered study companion. Upload your notes, documents, or images to instantly generate interactive learning materials.
        </p>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-3xl mx-auto w-full">

          {/* Audio Tool Card */}
          <Link href="/audio" className="group block w-full">
            <motion.div
              whileHover={{ y: -5 }}
              className="h-full bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-left shadow-lg shadow-slate-200/50 dark:shadow-none hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-teal-50 dark:bg-teal-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-teal-600 dark:text-teal-400 text-xl sm:text-2xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                🎧
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 sm:mb-3">Audio Studio</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-5 sm:mb-6">
                Turn lengthy PDFs, images, and raw text into high-quality, listenable audio summaries. Perfect for learning on the go.
              </p>
              <span className="text-teal-600 dark:text-teal-400 text-sm sm:text-base font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                Extract Audio <span>→</span>
              </span>
            </motion.div>
          </Link>

          {/* Flashcard Tool Card */}
          <Link href="/flashcards" className="group block w-full">
            <motion.div
              whileHover={{ y: -5 }}
              className="h-full bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-8 text-left shadow-lg shadow-slate-200/50 dark:shadow-none hover:border-emerald-300 dark:hover:border-emerald-500/50 transition-colors"
            >
              <div className="w-12 h-12 sm:w-14 sm:h-14 bg-emerald-50 dark:bg-emerald-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xl sm:text-2xl mb-4 sm:mb-6 group-hover:scale-110 transition-transform">
                🗂️
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 sm:mb-3">AI Flashcards</h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed mb-5 sm:mb-6">
                Instantly convert your study materials into interactive, spaced-repetition flashcard decks to test your knowledge.
              </p>
              <span className="text-emerald-600 dark:text-emerald-400 text-sm sm:text-base font-semibold flex items-center gap-2 group-hover:gap-3 transition-all">
                Generate Deck <span>→</span>
              </span>
            </motion.div>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}