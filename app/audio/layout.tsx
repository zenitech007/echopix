import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Audio Studio | EchoPix",
    description: "Transform documents, notes, and images into high-quality, listenable audio summaries.",
};

export default function AudioLayout({ children }: { children: React.ReactNode }) {
    return children;
}
