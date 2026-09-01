export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        service: "ai-media-studio-api",
        platform: "cloudflare-workers",
        timestamp: new Date().toISOString()
      });
    }

    return Response.json({
      message: "AI Media Studio API"
    });
  }
};
