import type { NextApiRequest, NextApiResponse } from 'next';
import { CALLBACK, OWNER, beginState, clearSession, clearState, configured, fail, github, mutate, oauthState, OwnerError, readMenu, requireOwner, sameOrigin, sameState, sessionToken, startSession, verifyOwner, writeMenu } from '../../../lib/owner-server';
export const config = { api: { bodyParser: { sizeLimit: '2mb' } } };
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const action = req.query.action;
  try {
    if (action === 'session' && req.method === 'GET') return res.json({ configured: configured(), authorized: configured() && !!sessionToken(req) });
    if (action === 'login' && req.method === 'GET') {
      if (!configured()) throw new OwnerError(503, 'GitHub 로그인 연결 설정이 필요합니다.');
      const { state, challenge } = beginState(res);
      const params = new URLSearchParams({ client_id: process.env.OZEN_GITHUB_CLIENT_ID!, redirect_uri: CALLBACK, scope: 'repo', state, login: OWNER, allow_signup: 'false', code_challenge: challenge, code_challenge_method: 'S256' });
      return res.redirect(302, `https://github.com/login/oauth/authorize?${params}`);
    }
    if (action === 'callback' && req.method === 'GET') {
      const state = oauthState(req); clearState(res);
      if (!configured() || !state || !sameState(req.query.state, state.state) || typeof req.query.code !== 'string') return res.redirect(303, '/admin?error=login');
      const exchange = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: process.env.OZEN_GITHUB_CLIENT_ID, client_secret: process.env.OZEN_GITHUB_CLIENT_SECRET, code: req.query.code, redirect_uri: CALLBACK, code_verifier: state.verifier }), signal: AbortSignal.timeout(20000) });
      const result = await exchange.json();
      if (!exchange.ok || !result.access_token) return res.redirect(303, '/admin?error=login');
      await verifyOwner(result.access_token);
      startSession(res, result.access_token, result.expires_in);
      return res.redirect(303, '/admin');
    }
    if (action === 'logout' && req.method === 'POST') { sameOrigin(req); clearSession(res); return res.json({ ok: true }); }
    if (action !== 'menus' || !['GET', 'POST'].includes(req.method || '')) { res.setHeader('Allow', 'GET, POST'); return res.status(405).json({ error: '지원하지 않는 요청입니다.' }); }
    if (req.method === 'POST') { sameOrigin(req); if (!req.headers['content-type']?.startsWith('application/json')) throw new OwnerError(415, '요청 형식을 확인해주세요.'); }
    const token = await requireOwner(req), base = await readMenu(token);
    if (req.method === 'GET') return res.json({ items: base.items, version: base.version });
    if (typeof req.body?.version !== 'string' || req.body.version !== base.version) throw new OwnerError(409, '다른 변경 사항이 먼저 저장되었습니다. 목록을 새로 불러온 뒤 다시 수정해주세요.');
    const { items, image } = mutate(base.items, req.body);
    return res.json(await writeMenu(token, base, items, image));
  } catch (error) {
    if (action === 'callback') { clearSession(res); return res.redirect(303, '/admin?error=login'); }
    return fail(res, error);
  }
}
