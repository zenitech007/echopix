/**
 * Calls the server-side Gemini proxy route.
 *
 * @param model  The Gemini model identifier (e.g. "gemini-2.5-flash").
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
