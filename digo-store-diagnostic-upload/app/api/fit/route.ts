import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { allow, fitPrompt, parseFitAnswer, parseFitRequest } from "@/lib/fit";
import { callModel, ModelError, modelsFrom } from "@/lib/model";

// The fitting room's "describe yourself" helper. A shopper's words go to the language model, which
// proposes the figure's shape numbers. Nothing is stored here, and no size is decided here.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const noStore = { "Cache-Control": "no-store" };
const say = (error: string, status: number) => NextResponse.json({ error }, { status, headers: noStore });

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin"), host = request.headers.get("host"), expected = new URL(request.url);
  return Boolean(origin) && [expected.origin, host ? expected.protocol + "//" + host : ""].includes(origin as string);
}

// Whether the helper can be offered at all. The fitting room hides it when no model is connected.
export async function GET() {
  return NextResponse.json({ available: modelsFrom().length > 0 }, { headers: noStore });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return say("Please open the fitting room directly in your browser.", 403);
  if (!modelsFrom().length) return say("This helper is not available right now. You can still set your shape by hand.", 503);
  if (Number(request.headers.get("content-length") || 0) > 20000) return say("That message is too long. Please keep it short.", 413);
  let wanted;
  try {
    const text = await request.text();
    if (text.length > 20000) return say("That message is too long. Please keep it short.", 413);
    wanted = parseFitRequest(JSON.parse(text));
  } catch (error) {
    return say(error instanceof SyntaxError || !(error instanceof Error) ? "That message could not be read." : error.message, 400);
  }
  // The address is only used to count requests, as a hash, and is never stored or sent on.
  const address = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (!allow(createHash("sha256").update(address).digest("hex"))) return say("That is a lot of questions for now. Please set your shape by hand, or try again later.", 429);
  try {
    const { text } = await callModel(fitPrompt(wanted), { maxTokens: 1200, timeoutMs: 40000 });
    return NextResponse.json(parseFitAnswer(text, wanted.shape), { headers: noStore });
  } catch (error) {
    // The provider's own message stays in the server log; shoppers get a plain sentence.
    console.error("fit helper:", error instanceof Error ? error.message : error);
    const busy = error instanceof ModelError && error.status === 504;
    return say(busy ? "That took too long. Please try again, or set your shape by hand." : "We could not work that out. Please try again, or set your shape by hand.", 502);
  }
}
