import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import webpush from "https://deno.land/x/webpush@0.2.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// TODO: Move VAPID keys to environment variables
const VAPID_PUBLIC_KEY = "BDS2-f9316245-da30-4c31-9a79-f218a5141c2c"; 
const VAPID_PRIVATE_KEY = "REPLACE_WITH_YOUR_PRIVATE_KEY"; 

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? ""
);

webpush.setVapidDetails(
  "mailto:example@example.com",
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

serve(async (req) => {
  const { title, body, icon, badge } = await req.json();

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
            JSON.stringify({ title, body, icon, badge })
          );
        } catch (err) {
          console.error("Error sending notification", err);
        }
      }
    }
  }

  return new Response("Push notifications sent", { status: 200 });
});
