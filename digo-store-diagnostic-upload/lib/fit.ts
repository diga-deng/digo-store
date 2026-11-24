// Turning what a shopper says about their body into the fitting room's shape numbers.
//
// The language model listens and proposes numbers; it never decides a size. Whatever it returns is
// checked and limited here, the shopper sees the figure change and confirms it, and the size is then
// worked out by the size chart in public/scene-experience/fitting-shape.js.
//
// Not verified: there is no measured data yet behind how much "a bit of a belly" should move a number.
// The model's guesses are a starting point for the shopper to correct, not a measurement.

export const MIN = 85, MAX = 120;

// Every number is a percentage of the studio figure, 100 = unchanged. Widths are seen from the front;
// depths are front-to-back (a belly that sits forward, a fuller chest, a fuller seat).
// `cm` is what 100 stands for. PLACEHOLDER figures, the same ones the fitting room uses.
export const FIELDS = [
  { id: "shoulders", cm: 42, what: "shoulder width, seen from the front" },
  { id: "chest", cm: 92, what: "chest width, seen from the front" },
  { id: "belly", cm: 74, what: "waist and belly width, seen from the front" },
  { id: "hips", cm: 98, what: "hip width, seen from the front" },
  { id: "legs", cm: 56, what: "thigh width" },
  { id: "arms", cm: 28, what: "upper arm thickness" },
  { id: "chestDepth", cm: 0, what: "how far the chest comes forward (bust or chest muscle)" },
  { id: "bellyDepth", cm: 0, what: "how far the belly comes forward" },
  { id: "hipsDepth", cm: 0, what: "how far the seat comes back" }
] as const;

export type FieldId = (typeof FIELDS)[number]["id"];
export type Shape = Record<FieldId, number>;
export type Turn = { role: "user" | "assistant"; content: string };
export type FitRequest = { messages: Turn[]; shape: Shape };
export type FitAnswer = { shape: Shape; reply: string; question: string | null };

const clamp = (value: unknown, fallback: number) => {
  // Only a number, or a string holding one, counts: null, "" and true would otherwise read as 0 or 1.
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) ? Math.round(Math.min(MAX, Math.max(MIN, number))) : fallback;
};

export function cleanShape(value: unknown, fallback?: Shape): Shape {
  const source = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return Object.fromEntries(FIELDS.map(field => [field.id, clamp(source[field.id], fallback?.[field.id] ?? 100)])) as Shape;
}

export const MAX_TURNS = 12, MAX_CHARS = 600;

export function parseFitRequest(body: unknown): FitRequest {
  const value = body as Record<string, unknown>;
  if (!value || !Array.isArray(value.messages) || !value.messages.length || value.messages.length > MAX_TURNS) throw Error("Tell us a little about your shape first.");
  const messages = value.messages.map((turn: Record<string, unknown>): Turn => {
    if (!turn || (turn.role !== "user" && turn.role !== "assistant") || typeof turn.content !== "string" || !turn.content.trim() || turn.content.length > MAX_CHARS) throw Error("That message is too long. Please keep it short.");
    return { role: turn.role, content: turn.content.trim() };
  });
  if (messages[messages.length - 1].role !== "user") throw Error("Tell us a little about your shape first.");
  return { messages, shape: cleanShape(value.shape) };
}

export function fitPrompt({ messages, shape }: FitRequest) {
  const system = `You help a shopper set the shape of a studio figure in a clothing fitting room, so that it looks like them. You listen to what they say about their own body and turn it into numbers.

The figure has nine numbers. Each is a percentage of the studio figure: 100 means unchanged, ${MIN} is the smallest and ${MAX} the largest allowed.
${FIELDS.map(field => `- ${field.id}: ${field.what}${field.cm ? `; 100 stands for about ${field.cm} cm` : ""}`).join("\n")}

How to work:
- Use everything the shopper has said so far: height, weight, usual size, bra size, build, and how they describe each part.
- Height and weight set the overall level. Their own words then move single parts. Total weight is fixed, so when one part is larger than average for their weight, make the others a little smaller.
- "Thick" or "sticks out" is depth, not width: a belly that comes forward raises bellyDepth more than belly.
- Move a number only as far as their words justify. "A little" is 2 to 4, "quite" is 5 to 9, "very" is 10 or more.
- Leave a number where it is when they have said nothing that bears on it.
- You do not choose a clothing size and you do not mention one. The store works out the size from the shape.
- Say nothing about health, and do not judge any body. Be plain and kind.
- Ask at most one short follow-up question, only when the answer would change a number. A shopper may decline any question. Good questions: where weight sits (belly, hips, or even), whether the belly comes forward, how full the chest is (for a woman, her bra size; for a man, how developed the chest is), whether the upper arms are slim or full. Do not repeat a question already answered or declined.
- Write "reply" and "question" in the language the shopper writes in. "reply" is one or two short sentences saying what you changed and why.

Answer with one JSON object and nothing else, in exactly this form:
{"shape":{${FIELDS.map(field => `"${field.id}":100`).join(",")}},"reply":"...","question":"..." or null}`;
  const user = `The figure now: ${JSON.stringify(shape)}

The conversation so far:
${messages.map(turn => `${turn.role === "user" ? "Shopper" : "You"}: ${turn.content}`).join("\n")}

Return the JSON object.`;
  return { system, user };
}

// The model's text is untrusted: take the first JSON object in it, and keep only what fits.
export function parseFitAnswer(text: string, current: Shape): FitAnswer {
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw Error("The answer could not be read.");
  let data: Record<string, unknown>;
  try { data = JSON.parse(text.slice(start, end + 1)); } catch { throw Error("The answer could not be read."); }
  if (!data || typeof data !== "object" || !data.shape || typeof data.shape !== "object") throw Error("The answer could not be read.");
  const say = (value: unknown) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 400) : "");
  return { shape: cleanShape(data.shape, current), reply: say(data.reply), question: say(data.question) || null };
}

// A small brake on cost: per visitor and for the whole instance. Memory only, so it resets when the
// server restarts and is not shared between instances. It slows abuse; it is not a hard budget.
type Window = { count: number; resetAt: number };
const windows = new Map<string, Window>();
export const LIMITS = { visitor: 20, everyone: 600, ms: 60 * 60 * 1000 };

export function allow(visitor: string, now = Date.now(), limits = LIMITS) {
  const take = (key: string, max: number) => {
    const window = windows.get(key);
    if (!window || window.resetAt <= now) { windows.set(key, { count: 1, resetAt: now + limits.ms }); return true; }
    if (window.count >= max) return false;
    window.count += 1; return true;
  };
  if (windows.size > 5000) for (const [key, window] of windows) if (window.resetAt <= now) windows.delete(key);
  return take("visitor:" + visitor, limits.visitor) && take("everyone", limits.everyone);
}
export const resetLimits = () => windows.clear();
