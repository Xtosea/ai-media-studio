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


    // ============================================================
// MAGIC HOUR - IMAGE TO VIDEO
// ============================================================

if (
  url.pathname === "/api/magic-hour/video" &&
  request.method === "POST"
) {
  try {
    if (!env.MAGIC_HOUR_API_KEY) {
      return json(
        {
          error: "Magic Hour API key is not configured",
        },
        500
      );
    }

    const formData = await request.formData();

    const image = formData.get("image");
    const prompt = formData.get("prompt") || "";

    if (!image || typeof image === "string") {
      return json(
        {
          error: "Image file is required",
        },
        400
      );
    }

    if (!prompt.trim()) {
      return json(
        {
          error: "Prompt is required",
        },
        400
      );
    }

    // Get the uploaded file extension
    const contentType =
      image.type || "image/jpeg";

    const extensionMap = {
      "image/jpeg": "jpg",
      "image/jpg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/heic": "heic",
      "image/heif": "heif",
    };

    const extension =
      extensionMap[contentType] || "jpg";

    // --------------------------------------------------------
    // STEP 1: Ask Magic Hour for an upload URL
    // --------------------------------------------------------

    const uploadResponse = await fetch(
      "https://api.magichour.ai/v1/files/upload-urls",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.MAGIC_HOUR_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: [
            {
              extension,
              type: "image",
            },
          ],
        }),
      }
    );

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      console.error(
        "MAGIC HOUR UPLOAD URL ERROR:",
        uploadData
      );

      return json(
        {
          error:
            "Magic Hour failed to create upload URL",
          details: uploadData,
        },
        uploadResponse.status
      );
    }

    const uploadItem =
      uploadData.items?.[0];

    if (
      !uploadItem ||
      !uploadItem.upload_url ||
      !uploadItem.file_path
    ) {
      return json(
        {
          error:
            "Magic Hour returned an invalid upload response",
          details: uploadData,
        },
        502
      );
    }

    // --------------------------------------------------------
    // STEP 2: Upload image to Magic Hour
    // --------------------------------------------------------

    const imageBuffer = await image.arrayBuffer();

    const fileUploadResponse = await fetch(
      uploadItem.upload_url,
      {
        method: "PUT",
        headers: {
          "Content-Type": contentType,
        },
        body: imageBuffer,
      }
    );

    if (!fileUploadResponse.ok) {
      const uploadText =
        await fileUploadResponse.text();

      console.error(
        "MAGIC HOUR FILE UPLOAD ERROR:",
        uploadText
      );

      return json(
        {
          error:
            "Failed to upload image to Magic Hour",
          details: uploadText,
        },
        502
      );
    }

    // --------------------------------------------------------
    // STEP 3: Create Image-to-Video project
    // --------------------------------------------------------

    const videoResponse = await fetch(
      "https://api.magichour.ai/v1/image-to-video",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.MAGIC_HOUR_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "AI Media Studio Image To Video",

          model: "ltx-2",

          resolution: "480p",

          end_seconds: 5,

          assets: {
            image_file_path:
              uploadItem.file_path,
          },

          style: {
            prompt: prompt.trim(),
          },
        }),
      }
    );

    const videoData =
      await videoResponse.json();

    if (!videoResponse.ok) {
      console.error(
        "MAGIC HOUR VIDEO ERROR:",
        videoData
      );

      return json(
        {
          error:
            "Magic Hour video generation failed",
          details: videoData,
        },
        videoResponse.status
      );
    }

    return json({
      success: true,
      provider: "magic-hour",
      projectId: videoData.id,
      creditsCharged:
        videoData.credits_charged,
      status: videoData.status || "queued",
    });
  } catch (error) {
    console.error(
      "MAGIC HOUR VIDEO ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Magic Hour Image-to-Video failed",
      },
      500
    );
  }
}


// ============================================================
// MAGIC HOUR - CHECK VIDEO STATUS
// ============================================================

if (
  url.pathname.startsWith(
    "/api/magic-hour/video/"
  ) &&
  request.method === "GET"
) {
  try {
    if (!env.MAGIC_HOUR_API_KEY) {
      return json(
        {
          error:
            "Magic Hour API key is not configured",
        },
        500
      );
    }

    const projectId =
      url.pathname
        .split("/")
        .pop();

    if (!projectId) {
      return json(
        {
          error:
            "Magic Hour project ID is required",
        },
        400
      );
    }

    const response = await fetch(
      `https://api.magichour.ai/v1/video-projects/${encodeURIComponent(
        projectId
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${env.MAGIC_HOUR_API_KEY}`,
        },
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "MAGIC HOUR STATUS ERROR:",
        data
      );

      return json(
        {
          error:
            "Magic Hour status request failed",
          details: data,
        },
        response.status
      );
    }

    return json({
      success: true,
      provider: "magic-hour",
      project: data,
    });
  } catch (error) {
    console.error(
      "MAGIC HOUR STATUS ERROR:",
      error
    );

    return json(
      {
        error:
          error.message ||
          "Failed to query Magic Hour video",
      },
      500
    );
  }
}


        // ============================================================
    // GEMINI AI CHAT - STREAMING
    // ============================================================

    if (
      url.pathname === "/api/chat" &&
      request.method === "POST"
    ) {
      try {
        if (!env.GEMINI_API_KEY) {
          return json(
            {
              error: "Gemini API key is not configured",
            },
            500
          );
        }

        const body = await request.json();

        const message =
          typeof body.message === "string"
            ? body.message.trim()
            : "";

        const history =
          Array.isArray(body.history)
            ? body.history
            : [];

        const image = body.image;

        if (!message && !image) {
          return json(
            {
              error:
                "Payload missing contents.",
            },
            400
          );
        }

        // --------------------------------------------------------
        // Build Gemini conversation contents
        // --------------------------------------------------------

        const contents = [];

        for (const item of history) {
          if (!item || typeof item !== "object") {
            continue;
          }

          const role =
            item.role === "model"
              ? "model"
              : "user";

          const parts = [];

          if (Array.isArray(item.parts)) {
            for (const part of item.parts) {
              if (typeof part === "string" && part.trim()) {
                parts.push({
                  text: part,
                });
              } else if (
                part &&
                typeof part === "object" &&
                typeof part.text === "string"
              ) {
                parts.push({
                  text: part.text,
                });
              }
            }
          }

          if (parts.length > 0) {
            contents.push({
              role,
              parts,
            });
          }
        }

        // --------------------------------------------------------
        // Current user message
        // --------------------------------------------------------

        const currentParts = [];

        if (message) {
          currentParts.push({
            text: message,
          });
        }

        // --------------------------------------------------------
        // Optional image
        // --------------------------------------------------------

        if (
          image &&
          typeof image === "object" &&
          typeof image.base64 === "string" &&
          typeof image.mimeType === "string"
        ) {
          currentParts.push({
            inline_data: {
              mime_type: image.mimeType,
              data: image.base64,
            },
          });
        }

        contents.push({
          role: "user",
          parts: currentParts,
        });

        // --------------------------------------------------------
        // Call Gemini streaming REST API
        // --------------------------------------------------------

        const geminiResponse = await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:streamGenerateContent?alt=sse&key=" +
            encodeURIComponent(env.GEMINI_API_KEY),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              contents,
            }),
          }
        );

        if (!geminiResponse.ok) {
          const errorText =
            await geminiResponse.text();

          console.error(
            "GEMINI API ERROR:",
            errorText
          );

          return json(
            {
              error:
                "Gemini API request failed",
              details: errorText,
            },
            geminiResponse.status
          );
        }

        // --------------------------------------------------------
        // Return Gemini SSE stream to frontend
        // --------------------------------------------------------

        return new Response(
          geminiResponse.body,
          {
            status: 200,
            headers: {
              ...corsHeaders,
              "Content-Type":
                "text/event-stream",
              "Cache-Control":
                "no-cache, no-transform",
              "Connection": "keep-alive",
            },
          }
        );
      } catch (error) {
        console.error(
          "GEMINI CHAT ERROR:",
          error
        );

        return json(
          {
            error:
              error.message ||
              "Gemini chat failed",
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