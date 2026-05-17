import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { hasAIFeatures } from "@/lib/plan-gates";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const isAllowed = await hasAIFeatures(userId);
  if (!isAllowed) {
    return new Response(
      JSON.stringify({ error: "upgrade_required", feature: "ai_captions" }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return new Response(JSON.stringify({ error: "Gemini API Key is not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { topic, platforms, tone } = await req.json();

  if (!topic || !platforms || !tone) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an expert social media manager.
Create a captivating social media caption based on the following:
Topic: ${topic}
Target Platforms: ${(platforms as string[]).join(", ")}
Tone: ${tone}

Provide a single caption optimized for the requested platforms, respecting platform character limits and best practices. Output only the caption text — no intro, no labels, no markdown.`;

  // Stream tokens back as plain text via Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const result = await model.generateContentStream(prompt);
        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            // SSE format: "data: <chunk>\n\n"
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(text)}\n\n`));
          }
        }
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err: any) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err.message || "Generation failed" })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
