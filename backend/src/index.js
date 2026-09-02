const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";
const KLING_API_URL = "https://api-singapore.klingai.com";


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


    // Kling AI - Create video generation task
    if (
      url.pathname === "/api/kling/video" &&
      request.method === "POST"
    ) {
      try {
        if (!env.KLING_API_KEY) {
          return json(
            { error: "Kling API key is not configured" },
            500
          );
        }

        const body = await request.json();

        if (!body || typeof body !== "object") {
          return json(
            { error: "Request body must be JSON" },
            400
          );
        }

        const response = await fetch(
          `${KLING_API_URL}/v1/videos/text2video`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.KLING_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(body),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("KLING ERROR:", data);

          return json(
            {
              error: "Kling video generation request failed",
              details: data,
            },
            response.status
          );
        }

        return json(data);
      } catch (error) {
        console.error("KLING VIDEO ERROR:", error);

        return json(
          {
            error:
              error.message ||
              "Kling video generation failed",
          },
          500
        );
      }
    }

    // Kling AI - Query video generation task
    if (
      url.pathname.startsWith("/api/kling/video/") &&
      request.method === "GET"
    ) {
      try {
        if (!env.KLING_API_KEY) {
          return json(
            { error: "Kling API key is not configured" },
            500
          );
        }

        const taskId = url.pathname.split("/").pop();

        if (!taskId) {
          return json(
            { error: "Kling task ID is required" },
            400
          );
        }

        const response = await fetch(
          `${KLING_API_URL}/v1/videos/text2video/${encodeURIComponent(
            taskId
          )}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${env.KLING_API_KEY}`,
            },
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("KLING TASK ERROR:", data);

          return json(
            {
              error: "Kling task request failed",
              details: data,
            },
            response.status
          );
        }

        return json(data);
      } catch (error) {
        console.error("KLING TASK ERROR:", error);

        return json(
          {
            error:
              error.message ||
              "Failed to query Kling task",
          },
          500
        );
      }
    }


  if (
  url.pathname === "/api/elevenlabs/video-access" &&
  request.method === "GET"
) {
  try {
    if (!env.ELEVENLABS_API_KEY) {
      return json(
        {
          success: false,
          error: "ElevenLabs API key is not configured",
        },
        500
      );
    }

    const response = await fetch(
      `${ELEVENLABS_API_URL}/flows/video?page_size=1`,
      {
        method: "GET",
        headers: {
          "xi-api-key": env.ELEVENLABS_API_KEY,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("ELEVENLABS VIDEO ACCESS ERROR:", data);

      return json(
        {
          success: false,
          status: response.status,
          details: data,
        },
        response.status
      );
    }

    return json({
      success: true,
      message: "ElevenLabs Image & Video API is accessible",
      data,
    });
  } catch (error) {
    console.error(
      "ELEVENLABS VIDEO ACCESS ERROR:",
      error
    );

    return json(
      {
        success: false,
        error:
          error.message ||
          "Failed to access ElevenLabs video API",
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