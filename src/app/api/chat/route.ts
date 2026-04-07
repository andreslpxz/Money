import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';
import { promises as fs } from 'fs';
import path from 'path';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    let systemPrompt = "You are an AI assistant that helps users create n8n workflows.";
    try {
      const skillsPath = path.join(process.cwd(), 'skills.md');
      systemPrompt = await fs.readFile(skillsPath, 'utf8');
    } catch (error) {
      console.warn("Could not read skills.md, falling back to default system prompt", error);
    }

    const modelName = process.env.MODEL || 'qwen/qwen3-32b';

    const groqOpenAI = createOpenAI({
      apiKey: process.env.GROQ_API_KEY || 'no-key-provided',
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const result = streamText({
      model: groqOpenAI(modelName),
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error("Error in chat route:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
