import { NextResponse } from 'next/server';

/** Models that clients are allowed to request. */
const ALLOWED_MODELS = new Set([
    'gemini-2.5-flash',
    'gemini-2.5-flash-preview-tts',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
]);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { model, payload } = body;

        // --- Input validation ---
        if (!model || typeof model !== 'string') {
            return NextResponse.json(
                { error: { message: 'Missing or invalid "model" parameter.' } },
                { status: 400 }
            );
        }

        if (!payload || typeof payload !== 'object') {
            return NextResponse.json(
                { error: { message: 'Missing or invalid "payload" parameter.' } },
                { status: 400 }
            );
        }

        // --- Model allowlist (prevents path traversal & misuse) ---
        if (!ALLOWED_MODELS.has(model)) {
            return NextResponse.json(
                { error: { message: `Model "${model}" is not supported. Allowed models: ${[...ALLOWED_MODELS].join(', ')}` } },
                { status: 400 }
            );
        }

        // --- API key check ---
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: { message: 'Server configuration error: API key missing.' } },
                { status: 500 }
            );
        }

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
            // User-friendly message for rate limiting
            if (response.status === 429) {
                return NextResponse.json(
                    { error: { message: 'You are sending requests too quickly. Please wait a moment and try again.' } },
                    { status: 429 }
                );
            }

            return NextResponse.json(data, { status: response.status });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('API Route Error:', error);
        return NextResponse.json(
            { error: { message: 'Internal server error while contacting Gemini API.' } },
            { status: 500 }
        );
    }
}