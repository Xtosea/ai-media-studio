const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        service: "ai-media-studio-api",
        platform: "cloudflare-workers"
      });
    }

    // Text-to-Speech
    if (url.pathname === "/api/tts" && request.method === "POST") {
      try {
        if (!env.ELEVENLABS_API_KEY) {
          return Response.json(
            { error: "ElevenLabs API key is not configured" },
            { status: 500 }
          );
        }

        const body = await request.json();

        const text = typeof body.text === "string"
          ? body.text.trim()
          : "";

        const voiceId = typeof body.voiceId === "string"
          ? body.voiceId.trim()
          : "";

        if (!text) {
          return Response.json(
            { error: "Text is required" },
            { status: 400 }
          );
        }

        if (!voiceId) {
          return Response.json(
            { error: "voiceId is required" },
            { status: 400 }
          );
        }

        const response = await fetch(
          `${ELEVENLABS_API_URL}/text-to-speech/${encodeURIComponent(voiceId)}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": env.ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
              "Accept": "audio/mpeg"
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2"
            })
          }
        );

        if (!response.ok) {
          const errorText = await response.text();

          console.error("ELEVENLABS ERROR:", errorText);

          return Response.json(
            {
              error: "ElevenLabs request failed",
              details: errorText
            },
            { status: response.status }
          );
        }

        return new Response(response.body, {
          status: 200,
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store"
          }
        });

      } catch (error) {
        console.error("TTS ERROR:", error);

        return Response.json(
          {
            error: error.message || "Text-to-speech failed"
          },
          { status: 500 }
        );
      }
    }

    return Response.json(
      {
        message: "AI Media Studio API"
      },
      { status: 404 }
    );
  }
};
