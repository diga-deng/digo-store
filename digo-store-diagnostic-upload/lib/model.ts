// Language models for the store. Server only: keys are read from the environment and never sent to the browser.
//
// Up to five models, one group of variables each, the same names the design site uses:
//   DIGO_MODEL_1_NAME   shown to staff (optional; the model id is used when missing)
//   DIGO_MODEL_1_URL    full OpenAI-compatible chat completions address
//   DIGO_MODEL_1_KEY    the provider's API key
//   DIGO_MODEL_1_MODEL  the model id
//   DIGO_MODEL_1_EXTRA  optional JSON merged into the request (for one provider's own switches)
// Changing provider means changing variables, not code. Models are tried in order, 1 to 5.

export type Model = { id: string; name: string; url: string; key: string; model: string; extra: Record<string, unknown> };
export type Prompt = { system: string; user: string };
type Env = Record<string, string | undefined>;

export class ModelError extends Error {
  status: number;
  constructor(message: string, status = 502) { super(message); this.status = status; }
}

export const NO_MODEL = "No language model is connected. Add DIGO_MODEL_1_URL, DIGO_MODEL_1_KEY and DIGO_MODEL_1_MODEL in Vercel, then redeploy.";

export function modelsFrom(env: Env = process.env): Model[] {
  const list: Model[] = [];
  for (let n = 1; n <= 5; n++) {
    const get = (part: string) => String(env[`DIGO_MODEL_${n}_${part}`] || "").trim();
    const url = get("URL"), key = get("KEY"), model = get("MODEL");
    if (!url || !key || !model) continue;
    let extra: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(get("EXTRA") || "{}");
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) extra = parsed;
    } catch { /* a malformed EXTRA is ignored */ }
    list.push({ id: `m${n}`, name: get("NAME") || model, url, key, model, extra });
  }
  return list;
}

// What staff may see: never the key or the address.
export const publicModels = (env?: Env) => modelsFrom(env).map(({ id, name, model }) => ({ id, name, model }));

type CallOptions = { timeoutMs?: number; maxTokens?: number; fetchImpl?: typeof fetch };

export async function callOne(model: Model, prompt: Prompt, { timeoutMs = 25000, maxTokens = 600, fetchImpl = fetch }: CallOptions = {}): Promise<string> {
  let response: Response;
  try {
    response = await fetchImpl(model.url, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "content-type": "application/json", authorization: `Bearer ${model.key}` },
      // Some providers only accept max_completion_tokens: when EXTRA sets it, max_tokens is not sent.
      body: JSON.stringify({
        ...(model.extra.max_completion_tokens ? {} : { max_tokens: maxTokens }),
        ...model.extra,
        model: model.model,
        messages: [{ role: "system", content: prompt.system }, { role: "user", content: prompt.user }]
      })
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    throw new ModelError(timedOut ? `${model.name} took too long to answer.` : `${model.name} could not be reached.`, 504);
  }
  if (!response.ok) {
    let why = "";
    try { const data = await response.json(); why = String(data?.error?.message || data?.message || ""); } catch { /* no readable body */ }
    throw new ModelError(`${model.name} returned an error (${response.status})${why ? `: ${why.slice(0, 200)}` : ""}.`);
  }
  const data = await response.json();
  const text = String(data?.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new ModelError(`${model.name} returned no text.`);
  return text;
}

// Try each connected model in order and return the first answer.
export async function callModel(prompt: Prompt, options: CallOptions & { env?: Env } = {}): Promise<{ text: string; model: string }> {
  const models = modelsFrom(options.env);
  if (!models.length) throw new ModelError(NO_MODEL, 503);
  let last: unknown;
  for (const model of models) {
    try { return { text: await callOne(model, prompt, options), model: model.name }; }
    catch (error) { last = error; }
  }
  throw last;
}
