"use client";

import React, { useState, useRef, ChangeEvent } from "react";
import { motion } from "framer-motion";

const MAX_CHARS = 50000;

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

export default function EchoPix() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [textInput, setTextInput] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [status, setStatus] = useState({ message: "", type: "info" });
  const [isExtracting, setIsExtracting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const audioRef = useRef<HTMLAudioElement>(null);

  /* ---------- Handlers ---------- */

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));

    setStatus({
      message: "Image loaded. Ready to extract text.",
      type: "info",
    });
  };

  const handleRemoveImage = () => {
    setImageFile(null);
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

  /* ---------- Image OCR ---------- */

  const handleImageExtraction = async () => {
    if (!imageFile) return;

    setIsExtracting(true);
    setStatus({ message: "Analyzing image...", type: "loading" });

    try {
      const base64Data = await fileToBase64(imageFile);

      const payload = {
        contents: [
          {
            parts: [
              {
                text: "Extract all visible text from this image.",
              },
              {
                inlineData: {
                  mimeType: imageFile.type,
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
      const mimeType = part?.inlineData?.mimeType;

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

  /* ---------- Status Color ---------- */

  const getStatusColor = () => {
    switch (status.type) {
      case "success":
        return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";

      case "error":
        return "text-rose-400 bg-rose-400/10 border-rose-400/20";

      case "loading":
        return "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";

      default:
        return "text-indigo-300 bg-indigo-400/10 border-indigo-400/20";
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070b16] text-slate-200 flex items-center justify-center p-6">

      {/* Animated Gradient Mesh Background */}

      <motion.div
        animate={{ x: [0, 100, -100, 0], y: [0, -80, 80, 0] }}
        transition={{ repeat: Infinity, duration: 25 }}
        className="absolute w-175 h-175 bg-fuchsia-500/20 rounded-full blur-[180px]"
      />

      <motion.div
        animate={{ x: [0, -120, 120, 0], y: [0, 90, -90, 0] }}
        transition={{ repeat: Infinity, duration: 30 }}
        className="absolute w-175 h-175 bg-cyan-500/20 rounded-full blur-[180px]"
      />

      {/* Main Container */}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-2xl"
      >

        {/* Header */}

        <header className="text-center mb-10">

          <h1 className="text-6xl font-extrabold bg-linear-to-r from-cyan-400 via-blue-500 to-fuchsia-500 text-transparent bg-clip-text">
            EchoPix
          </h1>

          <p className="text-slate-400 mt-3 text-lg">
            Turn homework, notes, and images into audio.
          </p>

        </header>

        {/* Glass Card */}

        <motion.main
          initial={{ scale: 0.96 }}
          animate={{ scale: 1 }}
          className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
        >

          {/* Upload Section */}

          {!previewUrl ? (
            <motion.label
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-500/40 rounded-2xl h-40 cursor-pointer"
            >
              <p className="text-slate-400">📷 Upload Image</p>

              <input
                type="file"
                accept="image/png, image/jpeg"
                className="hidden"
                onChange={handleImageChange}
              />
            </motion.label>
          ) : (
            <div className="relative rounded-xl overflow-hidden">
              <img src={previewUrl} className="w-full h-48 object-cover" />

              <button
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 bg-rose-500 px-3 py-1 rounded-lg text-sm"
              >
                Remove
              </button>
            </div>
          )}

          {/* Extract Button */}

          {previewUrl && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              onClick={handleImageExtraction}
              className="w-full mt-4 py-3 rounded-xl bg-linear-to-r from-cyan-500 to-fuchsia-500"
            >
              {isExtracting ? "Scanning Image..." : "Extract Text"}
            </motion.button>
          )}

          {/* Progress Loader */}

          {isExtracting && (
            <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <motion.div
                className="h-full bg-linear-to-r from-cyan-400 to-fuchsia-500"
                animate={{ x: ["-100%", "100%"] }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            </div>
          )}

          {/* Text Input */}

          <textarea
            rows={5}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            className="w-full mt-6 bg-slate-900/60 rounded-xl p-4 border border-white/10"
            placeholder="✍️ Type or edit text here..."
          />

          {/* Generate Audio */}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAudioGeneration}
            disabled={isGenerating}
            className="w-full mt-6 py-4 text-lg font-bold text-white rounded-xl bg-linear-to-r from-cyan-500 via-blue-500 to-fuchsia-500"
          >
            {isGenerating ? "Generating Audio..." : "🔊 Generate Audio"}
          </motion.button>

          {/* Waveform Animation */}

          {isGenerating && (
            <div className="flex justify-center mt-4 space-x-1">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [10, 30, 10] }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.8,
                    delay: i * 0.05,
                  }}
                  className="w-1 bg-cyan-400 rounded"
                />
              ))}
            </div>
          )}

          {/* Status */}

          {status.message && (
            <div
              className={`mt-6 px-4 py-2 rounded-lg border ${getStatusColor()}`}
            >
              {status.message}
            </div>
          )}

          {/* Audio Player */}

          {audioUrl && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <audio
                ref={audioRef}
                controls
                src={audioUrl}
                className="w-full"
              />
            </motion.div>
          )}
        </motion.main>

        <footer className="text-center mt-10 text-slate-500 text-sm">
          Built with ♥ by ZeniTech
        </footer>
      </motion.div>
    </div>
  );
}