'use client';

import Link from "next/link";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Header() {
    const [open, setOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 10);
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <motion.header
            animate={{ height: scrolled ? 60 : 72 }}
            className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 dark:bg-[#070b16]/80 border-b border-slate-200 dark:border-white/10"
        >
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-full relative">
                <Link href="/" className="font-bold text-xl bg-linear-to-r from-emerald-600 to-teal-500 text-transparent bg-clip-text">
                    EchoPix
                </Link>

                {/* Desktop Navigation */}
                <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
                    <NavLink href="/audio" label="Audio Studio" pathname={pathname} />
                    <NavLink href="/flashcards" label="Flashcards ✨" pathname={pathname} />
                    <ThemeToggle />
                </nav>

                {/* Mobile Menu Button */}
                <button 
                    onClick={() => setOpen(!open)} 
                    className="md:hidden p-2 text-slate-600 dark:text-slate-300 focus:outline-none"
                    aria-label="Toggle Menu"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {open ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Dropdown Menu */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        // Absolute positioning pushes it below the header bar without altering header height
                        className="md:hidden absolute top-full left-0 w-full bg-white/95 dark:bg-[#070b16]/95 backdrop-blur-xl border-b border-slate-200 dark:border-white/10 shadow-xl flex flex-col p-6 space-y-6"
                    >
                        <Link 
                            href="/audio" 
                            onClick={() => setOpen(false)}
                            className="text-slate-700 dark:text-slate-200 font-medium text-lg"
                        >
                            Audio Studio
                        </Link>
                        
                        <Link 
                            href="/flashcards" 
                            onClick={() => setOpen(false)}
                            className="text-slate-700 dark:text-slate-200 font-medium text-lg"
                        >
                            Flashcards ✨
                        </Link>

                        <div className="pt-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Toggle Theme</span>
                            <ThemeToggle />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}

function NavLink({ href, label, pathname }: { href: string, label: string, pathname: string }) {
    const active = pathname === href;

    return (
        <Link href={href} className="relative text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors py-1">
            <span className={active ? "text-emerald-600 dark:text-emerald-400" : ""}>{label}</span>

            {active && (
                <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 right-0 -bottom-1 h-0.5 bg-emerald-500"
                />
            )}
        </Link>
    );
}