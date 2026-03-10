import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      throw new Error("imageBase64 is required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const generateOnBackground = async (bgColor: string): Promise<string> => {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3.1-flash-image-preview",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Take this image of a person and place them on a solid ${bgColor} background. Remove the existing background completely and replace it with a pure ${bgColor} (#${bgColor === "white" ? "FFFFFF" : "000000"}) background. Keep the person exactly the same - same size, same position, same details, same resolution. Output the image at the highest possible resolution matching the input. The background must be completely solid ${bgColor} with no gradients, noise, or compression artifacts.`,
                  },
                  {
                    type: "image_url",
                    image_url: { url: imageBase64 },
                  },
                ],
              },
            ],
            modalities: ["image", "text"],
          }),
        }
      );

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Rate limit exceeded. Please try again in a moment.");
        }
        if (response.status === 402) {
          throw new Error("AI usage limit reached. Please add credits to your workspace.");
        }
        const text = await response.text();
        console.error(`AI gateway error (${bgColor}):`, response.status, text);
        throw new Error(`AI gateway error for ${bgColor} background`);
      }

      const data = await response.json();
      const imageUrl =
        data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) {
        throw new Error(`No image returned for ${bgColor} background`);
      }
      return imageUrl;
    };

    // Generate both backgrounds in parallel
    const [whiteImage, blackImage] = await Promise.all([
      generateOnBackground("white"),
      generateOnBackground("black"),
    ]);

    return new Response(
      JSON.stringify({ whiteImage, blackImage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    console.error("generate-backgrounds error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
