import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "https://deno.land/x/webpush@0.2.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    "mailto:soporte@antenaflorida.com",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

serve(async (req) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return new Response(
      JSON.stringify({ error: "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Edge Function secrets." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
  const { title, body, icon, badge, url } = await req.json();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("push_subscriptions");

  if (error) {
    console.error(error);
    return new Response("Error fetching profiles", { status: 500 });
  }

  for (const profile of profiles) {
    if (profile.push_subscriptions) {
      for (const subscription of profile.push_subscriptions) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({ title, body, icon, badge, url: url ?? "/" })
          );
        } catch (err) {
          console.error("Error sending notification", err);
        }
      }
    }
  }

  return new Response("Push notifications sent", { status: 200 });
});
