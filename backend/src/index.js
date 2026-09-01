const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: corsHeaders,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Health check
    if (url.pathname === "/api/health") {
      return json({
        status: "ok",
        service: "ai-media-studio-api",
        platform: "cloudflare-workers",
      });
    }

    // List ElevenLabs voices
    if (url.pathname === "/api/voices" && request.method === "GET") {
      try {
        if (!env.ELEVENLABS_API_KEY) {
          return json(
            { error: "ElevenLabs API key is not configured" },
            500
          );
        }

        const response = await fetch(
          `${ELEVENLABS_API_URL}/voices`,
          {
            headers: {
              "xi-api-key": env.ELEVENLABS_API_KEY,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          return json(data, response.status);
        }

        return json(data);
      } catch (error) {
        return json(
          { error: error.message || "Failed to load voices" },
          500
        );
      }
    }

    // Text-to-Speech
    if (url.pathname === "/api/tts" && request.method === "POST") {
      try {
        if (!env.ELEVENLABS_API_KEY) {
          return json(
            { error: "ElevenLabs API key is not configured" },
            500
          );
        }

        const body = await request.json();

        const text =
          typeof body.text === "string"
            ? body.text.trim()
            : "";

        const voiceId =
          typeof body.voiceId === "string"
            ? body.voiceId.trim()
            : "";

        if (!text) {
          return json(
            { error: "Text is required" },
            400
          );
        }

        if (!voiceId) {
          return json(
            { error: "voiceId is required" },
            400
          );
        }

        const response = await fetch(
          `${ELEVENLABS_API_URL}/text-to-speech/${encodeURIComponent(
            voiceId
          )}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": env.ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
              "Accept": "audio/mpeg",
            },
            body: JSON.stringify({
              text,
              model_id: "eleven_multilingual_v2",
            }),
          }
        );

        if (!response.ok) {
          const errorText = await response.text();

          console.error(
            "ELEVENLABS ERROR:",
            errorText
          );

          return json(
            {
              error: "ElevenLabs request failed",
              details: errorText,
            },
            response.status
          );
        }

        return new Response(response.body, {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      } catch (error) {
        console.error("TTS ERROR:", error);

        return json(
          {
            error:
              error.message ||
              "Text-to-speech failed",
          },
          500
        );
      }
    }

    return json(
      {
        message: "AI Media Studio API",
      },
      404
    );
  },
};