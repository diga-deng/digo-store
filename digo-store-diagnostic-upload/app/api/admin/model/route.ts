import { NextResponse } from "next/server";
import { callOne, modelsFrom, NO_MODEL, publicModels } from "@/lib/model";

// Staff check that the language models are connected. Protected by the admin password;
// nothing here is reachable by shoppers, and no key or provider address is returned.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function denied(request: Request) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.json({ error: "Missing ADMIN_SECRET in Vercel environment variables." }, { status: 500 });
  if (request.headers.get("x-admin-secret") !== secret) return NextResponse.json({ error: "Invalid admin password." }, { status: 401 });
  return null;
}

const noStore = { headers: { "Cache-Control": "no-store" } };

// Which models are connected.
export async function GET(request: Request) {
  const stop = denied(request);
  if (stop) return stop;
  return NextResponse.json({ models: publicModels() }, noStore);
}

// Ask every connected model one short fixed question and report which of them answered.
export async function POST(request: Request) {
  const stop = denied(request);
  if (stop) return stop;
  const models = modelsFrom();
  if (!models.length) return NextResponse.json({ error: NO_MODEL }, { status: 503, ...noStore });
  const prompt = { system: "You are a connection check for the DIGO store. Answer in one short sentence.", user: "Reply with the word ready and the name of the company that built you." };
  const results = await Promise.all(models.map(async model => {
    const started = Date.now();
    try {
      const text = await callOne(model, prompt, { maxTokens: 200 });
      return { id: model.id, name: model.name, model: model.model, ok: true, ms: Date.now() - started, text: text.slice(0, 300) };
    } catch (error) {
      return { id: model.id, name: model.name, model: model.model, ok: false, ms: Date.now() - started, error: error instanceof Error ? error.message : "Unknown error." };
    }
  }));
  return NextResponse.json({ results }, noStore);
}
