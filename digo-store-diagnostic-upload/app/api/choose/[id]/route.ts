import { NextResponse } from 'next/server';
import { bucket, hash, readJson, requestBody, sameOrigin, SharedChoice, token, validId, writeJson } from '@/lib/choose';
import { getSupabaseAdminClient } from '@/lib/supabase';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store, max-age=0' };
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!validId(params.id)) return NextResponse.json({ error: 'Link not found.' }, { status: 404, headers });
    const choice = await readJson<SharedChoice>(`${params.id}/choice.json`);
    const status = await readJson<{ ended?: boolean; disabled?: boolean }>(`${params.id}/status.json`);
    if (!choice || choice.expiresAt < Date.now() || status?.disabled) return NextResponse.json({ error: 'This link has expired or been disabled.' }, { status: 410, headers });
    const votes = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await getSupabaseAdminClient().storage.from(bucket).list(`${params.id}/votes`, { limit: 100, offset, sortBy: { column: 'name', order: 'asc' } });
      if (error) throw Error('Responses could not be loaded.');
      // Bound concurrent storage reads while preserving all responses, including
      // those after the first page. Do not expose voter tokens or file names.
      const files = (data || []).filter(f => /^[a-f0-9]{64}\.json$/.test(f.name));
      for (let i = 0; i < files.length; i += 10) {
        const batch = await Promise.all(files.slice(i, i + 10).map(f => readJson<{ candidateId: string; comment: string }>(`${params.id}/votes/${f.name}`)));
        votes.push(...batch.filter(Boolean));
      }
      if (!data || data.length < 100) break;
    }
    const voter = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`digo_vote_${params.id}=`))?.split('=')[1];
    const myVote = voter && validId(voter) ? await readJson<{ candidateId: string; comment: string }>(`${params.id}/votes/${hash(voter)}.json`) : null;
    return NextResponse.json({ question: choice.question, candidates: choice.candidates, ended: !!status?.ended, votes, myVote }, { headers });
  } catch { return NextResponse.json({ error: 'Could not load this choice. Please retry.' }, { status: 503, headers }); }
}
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    sameOrigin(request);
    if (!validId(params.id)) throw Error('Link not found.');
    const choice = await readJson<SharedChoice>(`${params.id}/choice.json`);
    const status = await readJson<{ ended?: boolean; disabled?: boolean }>(`${params.id}/status.json`);
    if (!choice || choice.expiresAt < Date.now() || status?.disabled) throw Error('This link is no longer active.');
    const body = await requestBody(request);
    if (body.action === 'end' || body.action === 'disable') {
      if (typeof body.ownerToken !== 'string' || hash(body.ownerToken) !== choice.ownerHash) return NextResponse.json({ error: 'Only the creator can manage this link.' }, { status: 403, headers });
      await writeJson(`${params.id}/status.json`, { ended: true, disabled: body.action === 'disable' }, true);
      return NextResponse.json({ ended: true, disabled: body.action === 'disable' }, { headers });
    }
    if (status?.ended) throw Error('Voting has ended.');
    if (!choice.candidates.some(c => c.id === body.candidateId) || typeof body.comment !== 'string' || body.comment.length > 300) throw Error('Choose a candidate and keep comments under 300 characters.');
    const cookieName = `digo_vote_${params.id}`;
    const existing = request.headers.get('cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(cookieName+'='))?.split('=')[1];
    const voter = existing && validId(existing) ? existing : token();
    await writeJson(`${params.id}/votes/${hash(voter)}.json`, { candidateId: body.candidateId, comment: body.comment.trim() }, true);
    const response = NextResponse.json({ saved: true, candidateId: body.candidateId }, { headers });
    response.cookies.set(cookieName, voter, { httpOnly: true, secure: new URL(request.url).protocol === 'https:', sameSite: 'lax', path: '/', maxAge: 30*86400 });
    return response;
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Your response was not saved. Please retry.' }, { status: 400, headers }); }
}
