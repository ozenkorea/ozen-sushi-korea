import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import type { MenuItem } from './menu-types';

export const REPO = 'ozenkorea/ozen-sushi-korea';
export const OWNER = 'ozenkorea';
export const ORIGIN = 'https://ozenlondon.ca';
export const CALLBACK = `${ORIGIN}/api/owner/callback`;
export const DATA_PATH = 'data/menu-items.json';
const SESSION = '__Host-ozen-owner';
const STATE = '__Host-ozen-oauth';
export class OwnerError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function configured() {
  return !!(process.env.OZEN_GITHUB_CLIENT_ID && process.env.OZEN_GITHUB_CLIENT_SECRET && (process.env.OZEN_SESSION_SECRET || '').length >= 32);
}
function key() {
  const secret = process.env.OZEN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new OwnerError(503, 'GitHub 로그인 연결 설정이 필요합니다.');
  return createHash('sha256').update(secret).digest();
}
export function seal(value: object) {
  const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}
export function unseal(value?: string): any {
  try {
    if (!value || value.length > 6000) return null;
    const data = Buffer.from(value, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', key(), data.subarray(0, 12));
    decipher.setAuthTag(data.subarray(12, 28));
    const result = JSON.parse(Buffer.concat([decipher.update(data.subarray(28)), decipher.final()]).toString());
    return result.exp > Date.now() ? result : null;
  } catch { return null; }
}
export function setCookie(res: NextApiResponse, name: string, value: string, seconds: number) {
  const prior = res.getHeader('Set-Cookie');
  res.setHeader('Set-Cookie', [...(Array.isArray(prior) ? prior : prior ? [String(prior)] : []), `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`]);
}
export function oauthState(req: NextApiRequest) { return unseal(req.cookies[STATE]); }
export function beginState(res: NextApiResponse) {
  const state = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url');
  setCookie(res, STATE, seal({ state, verifier, exp: Date.now() + 600000 }), 600);
  return { state, challenge: createHash('sha256').update(verifier).digest('base64url') };
}
export function sameState(a: unknown, b: unknown) {
  return typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
export function clearState(res: NextApiResponse) { setCookie(res, STATE, '', 0); }
export function startSession(res: NextApiResponse, token: string, expiresIn?: number) {
  const seconds = Math.max(1, Math.min(7 * 3600, Number(expiresIn) || 7 * 3600));
  setCookie(res, SESSION, seal({ token, exp: Date.now() + seconds * 1000 }), seconds);
}
export function clearSession(res: NextApiResponse) { setCookie(res, SESSION, '', 0); }
export function sessionToken(req: NextApiRequest): string | null { return unseal(req.cookies[SESSION])?.token || null; }
export function sameOrigin(req: NextApiRequest) {
  if (req.headers.origin !== ORIGIN || req.headers['sec-fetch-site'] === 'cross-site') throw new OwnerError(403, '요청 출처를 확인할 수 없습니다.');
}
export async function github(token: string, path: string, method = 'GET', body?: unknown) {
  const response = await fetch(`https://api.github.com${path}`, {
    method, headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    if (response.status === 401) throw new OwnerError(401, '로그인이 만료되었습니다. 다시 로그인해주세요.');
    if (response.status === 409 || response.status === 422) throw new OwnerError(409, '다른 변경 사항이 먼저 저장되었습니다. 목록을 새로 불러온 뒤 다시 수정해주세요.');
    if (response.status === 403 || response.status === 429) throw new OwnerError(503, 'GitHub 권한 또는 요청 한도를 확인해주세요. 잠시 후 다시 시도할 수 있습니다.');
    throw new OwnerError(502, 'GitHub에 연결하지 못했습니다. 잠시 후 다시 시도해주세요.');
  }
  return response.json();
}
export async function verifyOwner(token: string) {
  const user = await github(token, '/user');
  if (user.login?.toLowerCase() !== OWNER) throw new OwnerError(403, '오젠 소유자 GitHub 계정으로 로그인해주세요.');
  const repo = await github(token, `/repos/${REPO}`);
  if (!repo.private) throw new OwnerError(503, '숨김 메뉴 보호를 위해 GitHub 저장소를 비공개로 설정해주세요.');
  if (!repo.permissions?.push) throw new OwnerError(403, '이 계정에는 메뉴 저장 권한이 없습니다.');
}
export async function requireOwner(req: NextApiRequest) {
  const token = sessionToken(req);
  if (!token) throw new OwnerError(401, 'GitHub로 로그인해주세요.');
  await verifyOwner(token);
  return token;
}
export async function readMenu(token: string) {
  const ref = await github(token, `/repos/${REPO}/git/ref/heads/main`);
  const commit = await github(token, `/repos/${REPO}/git/commits/${ref.object.sha}`);
  const file = await github(token, `/repos/${REPO}/contents/${DATA_PATH}?ref=${ref.object.sha}`);
  const items: MenuItem[] = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
  if (!Array.isArray(items)) throw new OwnerError(502, '메뉴 파일을 확인해주세요.');
  return { items, version: file.sha as string, head: ref.object.sha as string, tree: commit.tree.sha as string };
}
function text(value: unknown, max: number, required = false) {
  if (typeof value !== 'string' || value.length > max || required && !value.trim()) throw new OwnerError(400, '메뉴명과 입력 내용을 확인해주세요.');
  return value.trim();
}
export function validateItem(value: any): MenuItem {
  if (!value || !/^[0-9a-f-]{36}$/i.test(value.id) || !['korea', 'sushi'].includes(value.restaurant) || !['dining', 'takeout'].includes(value.menu_type)
    || typeof value.visible !== 'boolean' || typeof value.sold_out !== 'boolean' || typeof value.price !== 'number' || !Number.isFinite(value.price) || value.price < 0 || value.price > 9999.99
    || !Number.isSafeInteger(value.sort_order) || value.sort_order < 0) throw new OwnerError(400, '메뉴 정보와 가격, 순서를 확인해주세요.');
  return { id: value.id, restaurant: value.restaurant, menu_type: value.menu_type, category: text(value.category, 100, true), name_en: text(value.name_en, 150, true), name_ko: text(value.name_ko, 150), description: text(value.description, 2000), price: Math.round(value.price * 100) / 100, image_url: text(value.image_url, 1500000), visible: value.visible, sold_out: value.sold_out, sort_order: value.sort_order };
}
export function photo(item: MenuItem): { path: string; content: Buffer } | null {
  if (!item.image_url || /^\/images\/menu\/[a-f0-9]{24}\.webp$/.test(item.image_url)) return null;
  const match = /^data:image\/webp;base64,([A-Za-z0-9+/=]+)$/.exec(item.image_url);
  if (!match) throw new OwnerError(400, '사진을 다시 업로드해주세요.');
  const content = Buffer.from(match[1], 'base64');
  if (content.length > 1024 * 1024 || content.toString('ascii', 0, 4) !== 'RIFF' || content.toString('ascii', 8, 12) !== 'WEBP') throw new OwnerError(400, '사진 형식 또는 용량을 확인해주세요.');
  const name = createHash('sha256').update(content).digest('hex').slice(0, 24) + '.webp';
  item.image_url = `/images/menu/${name}`;
  return { path: `public${item.image_url}`, content };
}
export function mutate(items: MenuItem[], body: any) {
  let image: ReturnType<typeof photo> = null;
  const restaurant = body.restaurant;
  if (!['korea', 'sushi'].includes(restaurant)) throw new OwnerError(400, '매장을 선택해주세요.');
  if (body.operation === 'save') {
    const item = validateItem(body.item), old = items.find(x => x.id === item.id);
    if (item.restaurant !== restaurant || old && old.restaurant !== restaurant) throw new OwnerError(403, '선택한 매장의 메뉴만 수정할 수 있습니다.');
    // Existing photo paths must belong to this catalogue. New photos use data URLs.
    if (item.image_url.startsWith('/images/') && !items.some(x => x.image_url === item.image_url)) throw new OwnerError(400, '사진을 다시 업로드해주세요.');
    image = photo(item);
    items = old ? items.map(x => x.id === item.id ? item : x) : [...items, item];
  } else if (body.operation === 'delete') {
    if (!items.some(x => x.id === body.id && x.restaurant === restaurant)) throw new OwnerError(404, '메뉴를 찾을 수 없습니다.');
    items = items.filter(x => x.id !== body.id);
  } else if (body.operation === 'reorder') {
    const ids = body.ids;
    if (!Array.isArray(ids) || !ids.length || new Set(ids).size !== ids.length) throw new OwnerError(400, '순서를 확인해주세요.');
    const selected = items.filter(x => ids.includes(x.id)), first = selected[0];
    if (selected.length !== ids.length || !first || selected.some(x => x.restaurant !== restaurant || x.menu_type !== first.menu_type || x.category !== first.category)) throw new OwnerError(400, '같은 카테고리의 메뉴만 재배치할 수 있습니다.');
    const categoryItems = items.filter(x => x.restaurant === restaurant && x.menu_type === first.menu_type && x.category === first.category);
    if (categoryItems.length !== ids.length) throw new OwnerError(409, '목록을 새로 불러온 뒤 순서를 바꿔주세요.');
    items = items.map(x => ids.includes(x.id) ? { ...x, sort_order: ids.indexOf(x.id) * 10 } : x);
  } else throw new OwnerError(400, '지원하지 않는 요청입니다.');
  return { items, image };
}
export async function writeMenu(token: string, base: Awaited<ReturnType<typeof readMenu>>, items: MenuItem[], image: ReturnType<typeof photo>) {
  const content = JSON.stringify(items, null, 2) + '\n';
  const entries: any[] = [{ path: DATA_PATH, mode: '100644', type: 'blob', content }, { path: 'data/menu-public.json', mode: '100644', type: 'blob', content: JSON.stringify(items.filter(item => item.visible), null, 2) + '\n' }];
  if (image) {
    const blob = await github(token, `/repos/${REPO}/git/blobs`, 'POST', { content: image.content.toString('base64'), encoding: 'base64' });
    entries.push({ path: image.path, mode: '100644', type: 'blob', sha: blob.sha });
  }
  const tree = await github(token, `/repos/${REPO}/git/trees`, 'POST', { base_tree: base.tree, tree: entries });
  const commit = await github(token, `/repos/${REPO}/git/commits`, 'POST', { message: 'Update restaurant menu from owner portal', tree: tree.sha, parents: [base.head] });
  // No force push: a concurrent edit cannot overwrite another person's changes.
  await github(token, `/repos/${REPO}/git/refs/heads/main`, 'PATCH', { sha: commit.sha, force: false });
  return { items, version: createHash('sha1').update(`blob ${Buffer.byteLength(content)}\0`).update(content).digest('hex'), commit: commit.sha };
}
export function fail(res: NextApiResponse, error: unknown) {
  const known = error instanceof OwnerError;
  return res.status(known ? error.status : 502).json({ error: known ? error.message : '연결하지 못했습니다. 잠시 후 다시 시도해주세요.' });
}
