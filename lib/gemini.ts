/**
 * Calls the server-side Gemini proxy route.
 *
 * @param model  The Gemini model identifier (e.g. "gemini-3.6-flash").
 * @param payload  The request body forwarded to the Gemini REST API.
 * @returns The parsed JSON response from the API.
 */
export async function callGeminiApi(model: string, payload: Record<string, unknown>) {
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
}

/**
 * Safely extracts text output from either the Interactions API or generateContent responses.
 */
export function extractTextFromResponse(result: any): string {
    if (!result) return "";

    // 1. Direct output text
    if (typeof result.output_text === "string" && result.output_text) {
        return result.output_text;
    }
    if (typeof result.text === "string" && result.text) {
        return result.text;
    }

    // 2. Steps array (Interactions API standard response)
    if (Array.isArray(result.steps)) {
        const textParts: string[] = [];
        for (const step of result.steps) {
            if (typeof step?.text === "string") {
                textParts.push(step.text);
            } else if (Array.isArray(step?.content?.parts)) {
                for (const part of step.content.parts) {
                    if (typeof part?.text === "string") {
                        textParts.push(part.text);
                    }
                }
            } else if (Array.isArray(step?.parts)) {
                for (const part of step.parts) {
                    if (typeof part?.text === "string") {
                        textParts.push(part.text);
                    }
                }
            }
        }
        if (textParts.length > 0) {
            return textParts.join("");
        }
    }

    // 3. Legacy candidates array (generateContent API / backwards compatibility)
    if (Array.isArray(result.candidates)) {
        const parts = result.candidates[0]?.content?.parts;
        if (Array.isArray(parts)) {
            return parts.map((p: any) => p?.text || "").join("");
        }
    }

    // 4. Outputs array (alternative preview format)
    if (Array.isArray(result.outputs)) {
        for (const out of result.outputs) {
            if (typeof out?.text === "string") return out.text;
        }
    }

    return "";
}

/**
 * Safely extracts base64 audio data from either the Interactions API or generateContent responses.
 */
export function extractAudioFromResponse(result: any): string | null {
    if (!result) return null;

    // 1. Direct output_audio field
    if (typeof result.output_audio === "string") return result.output_audio;
    if (result.output_audio?.data) return result.output_audio.data;

    // 2. Steps array (Interactions API standard response)
    if (Array.isArray(result.steps)) {
        for (const step of result.steps) {
            if (typeof step?.audio === "string") return step.audio;
            if (step?.audio?.data) return step.audio.data;

            const parts = step?.content?.parts || step?.parts || step?.output;
            if (Array.isArray(parts)) {
                for (const part of parts) {
                    if (part?.type === "audio" && part?.data) return part.data;
                    if (part?.inlineData?.data) return part.inlineData.data;
                    if (part?.data && (part?.mime_type?.startsWith("audio/") || part?.mimeType?.startsWith("audio/"))) {
                        return part.data;
                    }
                }
            }
        }
    }

    // 3. Legacy candidates array
    const parts = result.candidates?.[0]?.content?.parts;
    if (Array.isArray(parts)) {
        for (const part of parts) {
            if (part?.inlineData?.data) return part.inlineData.data;
            if (part?.data) return part.data;
        }
    }

    return null;
}
