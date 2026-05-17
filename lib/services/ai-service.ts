import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generateAutoReply(commentText: string, postContext: string, tone: string): Promise<string> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Gemini API Key is not configured");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are a social media assistant. 
Reply to the following comment in a ${tone} tone.
${postContext ? `Originating Post Content:\n"${postContext}"\n` : ""}Comment: "${commentText}"

Provide a short, contextually accurate, and engaging reply. Output only the reply text — no intro, no labels, no quotes.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text().trim();
}
