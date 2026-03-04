// Detecta si un canal de YouTube está en vivo y devuelve la URL del stream.
// Requiere YOUTUBE_API_KEY en los secrets de la Edge Function.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") ?? "";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, Authorization" } });
  }

  if (!YOUTUBE_API_KEY) {
    return new Response(
      JSON.stringify({ live: false, error: "YOUTUBE_API_KEY not configured" }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }

  try {
    const { channelId } = await req.json();
    if (!channelId || typeof channelId !== "string") {
      return new Response(
        JSON.stringify({ live: false, error: "channelId required" }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const id = channelId.trim();
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${encodeURIComponent(id)}&eventType=live&type=video&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();

    if (!res.ok) {
      console.error("YouTube API error", data);
      return new Response(
        JSON.stringify({ live: false, error: data?.error?.message || "YouTube API error" }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const first = data?.items?.[0];
    const videoId = first?.id?.videoId;
    if (videoId) {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      return new Response(
        JSON.stringify({ live: true, videoId, url }),
        { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    return new Response(
      JSON.stringify({ live: false }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  } catch (e) {
    console.error(e);
    return new Response(
      JSON.stringify({ live: false, error: String(e) }),
      { status: 200, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
    );
  }
});
