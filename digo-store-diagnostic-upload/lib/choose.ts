import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseAdminClient } from './supabase';
export const bucket = 'digo-help-choose';
export const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const token = () => randomBytes(24).toString('hex');
export function validId(id: string) { return /^[a-f0-9]{48}$/.test(id); }
export type SharedItem = { name: string; brand: string; type: string; id: string; owned: boolean; image: string | null; tile: number | null };
export type Candidate = { id: string; title: string; items: SharedItem[] };
export type SharedChoice = { question: string; candidates: Candidate[]; ownerHash: string; createdAt: number; expiresAt: number };
export function parseChoice(body: unknown): Pick<SharedChoice, 'question' | 'candidates'> {
  const value = body as Record<string, unknown>;
  if (!value || typeof value.question !== 'string' || !value.question.trim() || value.question.length > 180 || !Array.isArray(value.candidates) || value.candidates.length < 2 || value.candidates.length > 4) throw Error('Choose 2–4 saved versions and write a short question.');
  const candidates = value.candidates.map((candidate): Candidate => {
    if (!candidate || typeof candidate.id !== 'string' || candidate.id.length > 100 || typeof candidate.title !== 'string' || candidate.title.length > 120 || !Array.isArray(candidate.items) || candidate.items.length < 1 || candidate.items.length > 16) throw Error('Invalid candidate.');
    const items = candidate.items.map((item: Record<string, unknown>): SharedItem => {
      if (!item || typeof item.name !== 'string' || item.name.length > 160 || typeof item.id !== 'string' || item.id.length > 100 || !['catalog','concept','own'].includes(String(item.type))) throw Error('Invalid shared item.');
      const image = typeof item.image === 'string' && (/^\/scene-experience\/assets\/[a-z-]+\.webp$/.test(item.image) || /^https:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/product-images\//.test(item.image)) ? item.image : null;
      return { name: item.name, id: item.id, type: String(item.type), owned: item.owned === true, brand: typeof item.brand === 'string' ? item.brand.slice(0,100) : 'Brand not yet supplied', image, tile: Number.isInteger(item.tile) && Number(item.tile) >= 0 && Number(item.tile) <= 5 ? Number(item.tile) : null };
    });
    return { id: candidate.id, title: candidate.title, items };
  });
  if (new Set(candidates.map(c => c.id)).size !== candidates.length) throw Error('Choose different saved versions.');
  return { question: value.question.trim(), candidates };
}
export async function readJson<T>(path: string): Promise<T | null> {
  const { data, error } = await getSupabaseAdminClient().storage.from(bucket).download(path);
  if (error) {
    if ('statusCode' in error && ['404', '400'].includes(String(error.statusCode))) return null;
    throw Error('Sharing storage is unavailable.');
  }
  return data ? JSON.parse(await data.text()) as T : null;
}
export async function writeJson(path: string, value: unknown, overwrite = false) {
  const { error } = await getSupabaseAdminClient().storage.from(bucket).upload(path, JSON.stringify(value), { contentType: 'application/json', cacheControl: '0', upsert: overwrite });
  if (error) throw Error('Your response could not be saved. Please try again.');
}
export async function ensureBucket() {
  const db = getSupabaseAdminClient();
  const { data } = await db.storage.getBucket(bucket);
  if (data) return;
  const { error } = await db.storage.createBucket(bucket, { public: false, fileSizeLimit: 32768, allowedMimeTypes: ['application/json'] });
  if (error && !/already exists/i.test(error.message)) throw Error('Sharing is not connected yet. Your versions remain saved on this device.');
}
export async function requestBody(request: Request) {
  if (Number(request.headers.get('content-length') || 0) > 30000) throw Error('Selection is too large.');
  const text = await request.text(); if (text.length > 30000) throw Error('Selection is too large.');
  return JSON.parse(text);
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const expected = new URL(request.url);
  const host = request.headers.get('host');
  if (!origin || ![expected.origin, host ? expected.protocol + '//' + host : ''].includes(origin)) throw Error('Please open this link directly in your browser.');
}
