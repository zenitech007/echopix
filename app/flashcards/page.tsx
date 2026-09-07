"use client";

import React, { useState, useEffect, useCallback, ChangeEvent } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { fileToBase64 } from "@/lib/utils";
import { callGeminiApi, extractTextFromResponse } from "@/lib/gemini";
import StatusBanner from "@/components/StatusBanner";

interface Flashcard {
    question: string;
    answer: string;
}

export default function FlashcardsPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [inputText, setInputText] = useState("");
    const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [cardCount, setCardCount] = useState(5);

    const [isExtracting, setIsExtracting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [status, setStatus] = useState({ message: "", type: "info" });

    // Load saved flashcards from local storage on mount
    useEffect(() => {
        const savedCards = localStorage.getItem("echopix_flashcards");
        if (savedCards) {
            try {
                setFlashcards(JSON.parse(savedCards));
            } catch (e) {
                console.error("Failed to parse saved flashcards");
            }
        }
    }, []);

    /* ---------- Deck Controls ---------- */
    const nextCard = useCallback(() => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentCardIndex((prev) => (prev + 1) % flashcards.length);
        }, 150);
    }, [flashcards.length]);

    const prevCard = useCallback(() => {
        setIsFlipped(false);
        setTimeout(() => {
            setCurrentCardIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length);
        }, 150);
    }, [flashcards.length]);

    const clearDeck = () => {
        setFlashcards([]);
        localStorage.removeItem("echopix_flashcards");
        setStatus({ message: "Deck cleared.", type: "info" });
    };

    // Keyboard navigation for flashcards
    useEffect(() => {
        if (flashcards.length === 0) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case "ArrowRight":
                    nextCard();
                    break;
                case "ArrowLeft":
                    prevCard();
                    break;
                case " ":
                    e.preventDefault();
                    setIsFlipped((prev) => !prev);
                    break;
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [flashcards.length, nextCard, prevCard]);

    /* ---------- File Extraction ---------- */
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setSelectedFile(file);
        setStatus({ message: "File loaded. Extract text to continue.", type: "info" });
    };

    const handleFileExtraction = async () => {
        if (!selectedFile) return;

        setIsExtracting(true);
        setStatus({ message: "Analyzing document...", type: "loading" });

        try {
            const base64Data = await fileToBase64(selectedFile);
            const mediaType = selectedFile.type.startsWith("image/") ? "image" : "document";

            const payload = {
                input: [
                    {
                        type: "text",
                        text: "Extract all visible text from this file. Return ONLY the extracted text with no additional commentary.",
                    },
                    {
                        type: mediaType,
                        data: base64Data,
                        mime_type: selectedFile.type || (mediaType === "image" ? "image/png" : "application/pdf"),
                    },
                ],
            };

            const result = await callGeminiApi("gemini-3.6-flash", payload);
            const extracted = extractTextFromResponse(result);

            // Append extracted text to whatever the user has already typed
            setInputText((prev) => (prev ? prev + "\n\n" + extracted.trim() : extracted.trim()));
            setSelectedFile(null); // Clear the file input after successful extraction

            setStatus({ message: "Text successfully extracted! You can now generate your deck.", type: "success" });
        } catch (err: any) {
            setStatus({ message: err.message, type: "error" });
        } finally {
            setIsExtracting(false);
        }
    };

    /* ---------- Flashcard Generation ---------- */
    const handleGenerateCards = async () => {
        if (!inputText.trim()) {
            setStatus({ message: "Please enter some text or upload a document first.", type: "error" });
            return;
        }

        setIsGenerating(true);
        setStatus({ message: "Analyzing text and generating cards...", type: "loading" });

        try {
            const payload = {
                input: `Create exactly ${cardCount} educational flashcards from the following text. Extract the most important concepts. 
Return ONLY a raw JSON array of objects, with each object having a "question" string and an "answer" string. 
Do not include markdown formatting or the word json. 
Text: ${inputText}`,
                response_format: {
                    type: "text",
                    mime_type: "application/json",
                },
            };

            const result = await callGeminiApi("gemini-3.6-flash", payload);
            const textResponse = extractTextFromResponse(result);

            // Clean up potential markdown wrappers
            const cleanJson = textResponse.replace(/```json/gi, "").replace(/```/g, "").trim();
            const generatedCards: Flashcard[] = JSON.parse(cleanJson);

            if (generatedCards && generatedCards.length > 0) {
                setFlashcards(generatedCards);
                localStorage.setItem("echopix_flashcards", JSON.stringify(generatedCards));
                setCurrentCardIndex(0);
                setIsFlipped(false);
                setInputText("");
                setStatus({ message: "Flashcards generated successfully!", type: "success" });
            } else {
                throw new Error("Failed to format cards properly.");
            }
        } catch (err: any) {
            setStatus({ message: err.message || "Something went wrong.", type: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    /* ---------------- UI ---------------- */
    return (
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex flex-col items-center p-6 transition-colors duration-300">

            {/* Soft Animated Background Mesh */}
            <motion.div
                animate={{ x: [0, 80, -80, 0], y: [0, -60, 60, 0] }}
                transition={{ repeat: Infinity, duration: 25 }}
                className="absolute w-125 h-125 bg-emerald-200/40 dark:bg-emerald-500/10 rounded-full blur-[120px] -z-10"
            />
            <motion.div
                animate={{ x: [0, -100, 100, 0], y: [0, 80, -80, 0] }}
                transition={{ repeat: Infinity, duration: 30 }}
                className="absolute w-125 h-125 bg-teal-200/40 dark:bg-teal-500/10 rounded-full blur-[120px] -z-10 right-0 top-1/4"
            />

            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-2xl mt-4">

                {/* Header */}
                <header className="text-center mb-10">
                    <h1 className="text-5xl font-extrabold bg-linear-to-r from-emerald-600 via-teal-500 to-cyan-500 text-transparent bg-clip-text pb-2 transition-colors">
                        AI Study Deck
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg transition-colors">
                        Upload notes, documents, or paste text to generate instant flashcards.
                    </p>
                </header>

                {/* Glass Card Container */}
                <motion.main className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none transition-colors">

                    {flashcards.length === 0 ? (
                        <div className="flex flex-col gap-4">

                            {/* File Upload Area */}
                            <div className="flex flex-col sm:flex-row gap-3">
                                <label className="flex-1 flex items-center justify-center gap-2 border-2 border-dashed border-slate-300 dark:border-white/20 bg-slate-50/50 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-xl p-4 cursor-pointer transition-colors">
                                    <span className="text-xl">📄</span>
                                    <div className="text-left">
                                        <p className="text-slate-700 dark:text-slate-300 font-medium text-sm">
                                            {selectedFile ? selectedFile.name : "Upload File"}
                                        </p>
                                        <p className="text-slate-400 dark:text-slate-500 text-xs">PDF, Image, or TXT</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*, application/pdf, text/plain"
                                        className="hidden"
                                        onChange={handleFileChange}
                                    />
                                </label>

                                {selectedFile && (
                                    <button
                                        onClick={handleFileExtraction}
                                        disabled={isExtracting}
                                        className="px-6 py-4 rounded-xl font-semibold text-white bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 shadow-md transition-colors disabled:opacity-70 whitespace-nowrap"
                                    >
                                        {isExtracting ? "Extracting..." : "Extract Text"}
                                    </button>
                                )}
                            </div>

                            {/* Text Area */}
                            <textarea
                                rows={6}
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                className="w-full bg-white dark:bg-[#070b16]/60 rounded-xl p-4 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500/50 transition-all placeholder:text-slate-400"
                                placeholder="✍️ Or paste your paragraph, summary, or lecture notes here..."
                            />

                            {/* Card Count Selector */}
                            <div className="flex items-center gap-3">
                                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Cards to generate:</label>
                                <select
                                    value={cardCount}
                                    onChange={(e) => setCardCount(Number(e.target.value))}
                                    className="bg-white dark:bg-[#070b16]/60 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                                >
                                    {[3, 5, 10, 15, 20].map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Generate Button */}
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleGenerateCards}
                                disabled={isGenerating}
                                className="w-full mt-2 py-4 text-lg font-bold text-white rounded-xl shadow-lg bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-70 transition-all"
                            >
                                {isGenerating ? "Generating Deck..." : "✨ Generate Flashcards"}
                            </motion.button>
                        </div>
                    ) : (

                        // Flashcard Viewer
                        <div className="flex flex-col items-center">
                            <div className="w-full flex justify-between items-center mb-6 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                <span>Card {currentCardIndex + 1} of {flashcards.length}</span>
                                <button onClick={clearDeck} className="hover:text-rose-500 dark:hover:text-rose-400 transition-colors">🗑️ Clear Deck</button>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-100 dark:bg-white/5 rounded-full h-1.5 mb-6">
                                <div
                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                                />
                            </div>

                            {/* 3D Flashcard */}
                            <div
                                className="w-full h-64 perspective-1000 cursor-pointer"
                                onClick={() => setIsFlipped(!isFlipped)}
                                tabIndex={0}
                                role="button"
                                aria-label={isFlipped ? "Hide answer" : "Show answer"}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(!isFlipped); } }}
                            >
                                <motion.div
                                    className="w-full h-full relative preserve-3d"
                                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                                    transition={{ type: "spring", stiffness: 260, damping: 20 }}
                                >
                                    {/* Front (Question) */}
                                    <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex items-center justify-center text-center shadow-lg">
                                        <p className="text-2xl font-semibold text-slate-800 dark:text-slate-100">{flashcards[currentCardIndex].question}</p>
                                    </div>

                                    {/* Back (Answer) */}
                                    <div className="absolute inset-0 backface-hidden bg-emerald-50 dark:bg-linear-to-br dark:from-emerald-900/40 dark:to-slate-800 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-6 flex items-center justify-center text-center shadow-lg transform rotate-y-180">
                                        <p className="text-xl text-emerald-900 dark:text-emerald-100">{flashcards[currentCardIndex].answer}</p>
                                    </div>
                                </motion.div>
                            </div>

                            {/* Controls */}
                            <div className="flex gap-4 mt-8 w-full">
                                <button onClick={prevCard} className="flex-1 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors">
                                    Previous
                                </button>
                                <button onClick={() => setIsFlipped(!isFlipped)} className="flex-2 py-3 px-8 rounded-xl font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/20 border border-teal-200 dark:border-teal-500/30 hover:bg-teal-100 dark:hover:bg-teal-500/30 transition-colors">
                                    {isFlipped ? "Hide Answer" : "Show Answer"}
                                </button>
                                <button onClick={nextCard} className="flex-1 py-3 rounded-xl font-medium text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors">
                                    Next
                                </button>
                            </div>
                        </div>
                    )}

                    <StatusBanner message={status.message} type={status.type as "info" | "success" | "error" | "loading"} className="text-center" />
                </motion.main>
            </motion.div>
        </div>
    );
}