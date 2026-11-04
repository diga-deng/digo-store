import { NextResponse } from 'next/server';
import { ensureBucket, hash, parseChoice, requestBody, sameOrigin, token, writeJson } from '@/lib/choose';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const choice = parseChoice(await requestBody(request));
    await ensureBucket();
    const id = token(), ownerToken = token();
    await writeJson(`${id}/choice.json`, { ...choice, ownerHash: hash(ownerToken), createdAt: Date.now(), expiresAt: Date.now() + 30*86400000 });
    return NextResponse.json({ id, ownerToken, path: `/#/choose/${id}` }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error && !/environment|supabase|fetch|network/i.test(error.message) ? error.message : 'Sharing is not connected yet. Your versions remain saved on this device.' }, { status: 503 });
  }
}
