"use client";

import React, { useState, useRef, ChangeEvent } from "react";
import { motion } from "framer-motion";

/* ---------------- Utilities ---------------- */

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
};

const pcmToWav = (
    pcmData: Int16Array,
    numChannels: number,
    sampleRate: number
): Blob => {
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = pcmData.length * bytesPerSample;
    const fileSize = 36 + dataSize;

    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);

    const writeString = (offset: number, text: string) => {
        for (let i = 0; i < text.length; i++) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
    };

    writeString(0, "RIFF");
    view.setUint32(4, fileSize, true);
    writeString(8, "WAVE");
    writeString(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(36, "data");
    view.setUint32(40, dataSize, true);

    return new Blob([view, pcmData as any], { type: "audio/wav" });
};

/* ---------------- Component ---------------- */

export default function AudioStudio() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState("");
    const [textInput, setTextInput] = useState("");
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    const [status, setStatus] = useState({ message: "", type: "info" });
    const [isExtracting, setIsExtracting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const audioRef = useRef<HTMLAudioElement>(null);

    /* ---------- Handlers ---------- */

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];

        if (!file) return;

        setSelectedFile(file);

        // Only create object URLs for images to show previews
        if (file.type.startsWith("image/")) {
            setPreviewUrl(URL.createObjectURL(file));
        } else {
            setPreviewUrl(""); // Clear preview for documents
        }

        setStatus({
            message: "File loaded. Ready to extract text.",
            type: "info",
        });
    };

    const handleRemoveFile = () => {
        setSelectedFile(null);
        setPreviewUrl("");
    };

    const callGeminiApi = async (model: string, payload: any) => {
        const res = await fetch("/api/gemini", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, payload }),
        });

        if (!res.ok) {
            const body = await res.json();
            throw new Error(body?.error?.message || "API error");
        }

        return res.json();
    };

    /* ---------- File Extraction ---------- */

    const handleFileExtraction = async () => {
        if (!selectedFile) return;

        setIsExtracting(true);
        setStatus({ message: "Analyzing document...", type: "loading" });

        try {
            const base64Data = await fileToBase64(selectedFile);

            const payload = {
                contents: [
                    {
                        parts: [
                            {
                                text: "Extract all visible text from this file. Return ONLY the extracted text with no additional commentary.",
                            },
                            {
                                inlineData: {
                                    mimeType: selectedFile.type,
                                    data: base64Data,
                                },
                            },
                        ],
                    },
                ],
            };

            const result = await callGeminiApi("gemini-2.5-flash", payload);

            const extracted =
                result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

            setTextInput(extracted.trim());

            setStatus({
                message: "Text successfully extracted!",
                type: "success",
            });
        } catch (err: any) {
            setStatus({ message: err.message, type: "error" });
        } finally {
            setIsExtracting(false);
        }
    };

    /* ---------- TTS ---------- */

    const handleAudioGeneration = async () => {
        if (!textInput.trim()) return;

        setIsGenerating(true);
        setStatus({ message: "Synthesizing voice...", type: "loading" });

        try {
            const payload = {
                contents: [{ parts: [{ text: `Say this: ${textInput}` }] }],
                generationConfig: {
                    responseModalities: ["AUDIO"],
                },
            };

            const result = await callGeminiApi(
                "gemini-2.5-flash-preview-tts",
                payload
            );

            const part = result?.candidates?.[0]?.content?.parts?.[0];

            const audioData = part?.inlineData?.data;

            const sampleRate = 24000;
            const pcm = base64ToArrayBuffer(audioData);
            const pcm16 = new Int16Array(pcm);

            const wavBlob = pcmToWav(pcm16, 1, sampleRate);
            const url = URL.createObjectURL(wavBlob);

            setAudioUrl(url);

            setStatus({
                message: "Audio ready!",
                type: "success",
            });

            setTimeout(() => {
                audioRef.current?.play();
            }, 200);
        } catch (err: any) {
            setStatus({ message: err.message, type: "error" });
        } finally {
            setIsGenerating(false);
        }
    };

    /* ---------- Status Color (Light & Dark Mode) ---------- */

    const getStatusColor = () => {
        switch (status.type) {
            case "success":
                return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20";
            case "error":
                return "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10 dark:border-rose-500/20";
            case "loading":
                return "text-teal-700 bg-teal-50 border-teal-200 dark:text-teal-400 dark:bg-teal-500/10 dark:border-teal-500/20";
            default:
                return "text-slate-600 bg-slate-100 border-slate-200 dark:text-slate-400 dark:bg-white/5 dark:border-white/10";
        }
    };

    /* ---------------- UI ---------------- */

    return (
        <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden flex items-center justify-center p-6 bg-slate-50 dark:bg-[#070b16] transition-colors duration-300">
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

            {/* Main Container */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-2xl mt-4"
            >
                {/* Header */}
                <header className="text-center mb-10 relative">
                    <h1 className="text-5xl font-extrabold bg-linear-to-r from-emerald-600 via-teal-500 to-cyan-500 text-transparent bg-clip-text pb-2 transition-colors">
                        Audio Studio
                    </h1>

                    <p className="text-slate-600 dark:text-slate-400 mt-2 text-lg max-w-lg mx-auto leading-relaxed transition-colors">
                        Transform documents, notes, and images into high-quality, listenable audio summaries.
                    </p>
                </header>

                {/* Clean Card Container */}
                <motion.main
                    initial={{ scale: 0.98 }}
                    animate={{ scale: 1 }}
                    className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none transition-colors"
                >
                    {/* Upload Section */}
                    {!selectedFile ? (
                        <motion.label
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-white/20 bg-slate-50/50 dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 rounded-2xl h-40 cursor-pointer transition-colors"
                        >
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm mb-3 text-slate-500 dark:text-slate-400 transition-colors">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
                                </svg>
                            </div>
                            <p className="text-slate-600 dark:text-slate-300 font-medium transition-colors">Upload Image or Document</p>
                            <p className="text-slate-400 dark:text-slate-500 text-xs mt-1 transition-colors">Supports PNG, JPG, PDF, TXT</p>

                            <input
                                type="file"
                                accept="image/*, application/pdf, text/plain"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </motion.label>
                    ) : (
                        <div className="relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 h-48 flex items-center justify-center transition-colors">
                            {previewUrl ? (
                                <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                            ) : (
                                <div className="flex flex-col items-center p-6 text-center">
                                    <span className="text-5xl mb-3">📄</span>
                                    <span className="text-slate-700 dark:text-slate-200 font-medium truncate max-w-50 transition-colors">{selectedFile.name}</span>
                                    <span className="text-slate-500 dark:text-slate-400 text-xs mt-1 transition-colors">
                                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                    </span>
                                </div>
                            )}

                            <button
                                onClick={handleRemoveFile}
                                className="absolute top-3 right-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur text-rose-600 dark:text-rose-400 px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm hover:bg-white dark:hover:bg-slate-700 transition-colors"
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    {/* Extract Button */}
                    {selectedFile && (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            onClick={handleFileExtraction}
                            disabled={isExtracting}
                            className="w-full mt-5 py-3.5 rounded-xl font-semibold text-white bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 shadow-md transition-colors disabled:opacity-70"
                        >
                            {isExtracting ? "Scanning Document..." : "Extract Text"}
                        </motion.button>
                    )}

                    {/* Progress Loader */}
                    {isExtracting && (
                        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-4 overflow-hidden transition-colors">
                            <motion.div
                                className="h-full bg-emerald-400 dark:bg-emerald-500"
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                            />
                        </div>
                    )}

                    {/* Text Input */}
                    <textarea
                        rows={5}
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        className="w-full mt-6 bg-white dark:bg-[#070b16]/60 rounded-xl p-4 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 shadow-inner dark:shadow-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 dark:focus:border-emerald-500/50 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        placeholder="✍️ Type or edit your study notes here..."
                    />

                    {/* Generate Audio */}
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleAudioGeneration}
                        disabled={isGenerating}
                        className="w-full mt-6 py-4 text-lg font-bold text-white rounded-xl shadow-lg bg-linear-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:opacity-70 transition-all"
                    >
                        {isGenerating ? "Synthesizing Audio..." : "🔊 Generate Audio"}
                    </motion.button>

                    {/* Waveform Animation */}
                    {isGenerating && (
                        <div className="flex justify-center mt-5 space-x-1.5">
                            {[...Array(15)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    animate={{ height: [8, 24, 8] }}
                                    transition={{
                                        repeat: Infinity,
                                        duration: 0.8,
                                        delay: i * 0.05,
                                    }}
                                    className="w-1.5 bg-teal-400 rounded-full"
                                />
                            ))}
                        </div>
                    )}

                    {/* Status */}
                    {status.message && (
                        <div
                            className={`mt-6 px-4 py-3 rounded-xl border font-medium ${getStatusColor()}`}
                        >
                            {status.message}
                        </div>
                    )}

                    {/* Audio Player */}
                    {audioUrl && (
                        <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-6 bg-slate-50 dark:bg-white/5 p-3 rounded-2xl border border-slate-200 dark:border-white/10 transition-colors"
                        >
                            <audio
                                ref={audioRef}
                                controls
                                src={audioUrl}
                                className="w-full h-12"
                            />
                        </motion.div>
                    )}
                </motion.main>
            </motion.div>
        </div>
    );
}