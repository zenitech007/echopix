import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "AI Flashcards | EchoPix",
    description: "Upload notes or paste text to generate instant AI-powered flashcards for effective study.",
};

export default function FlashcardsLayout({ children }: { children: React.ReactNode }) {
    return children;
}
