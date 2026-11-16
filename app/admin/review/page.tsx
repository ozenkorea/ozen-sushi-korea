'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import part1 from '../../../data/menu-import-1.json';
import part2 from '../../../data/menu-import-2.json';
import part3 from '../../../data/menu-import-3.json';
import part4 from '../../../data/menu-import-4.json';
const original = [...part1, ...part2, ...part3, ...part4];
import { database, MenuItem } from '../../../lib/menu';
type SourceItem = MenuItem & { code: string; source_page: number; review_note: string; photo_box?: number[] };
const sources = original as SourceItem[];
export default function Review() {
  const [allowed, setAllowed] = useState(false), [checking, setChecking] = useState(true);
  const [kind, setKind] = useState('dining'), [query, setQuery] = useState(''), [onlyNotes, setOnlyNotes] = useState(false);
  const [saved, setSaved] = useState<MenuItem[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  async function refresh() {
    if (!database) return;
    const { data, error } = await database.from('menu_items').select('*');
    if (error) throw error;
    setSaved(data || []);
  }
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        if (!database) throw new Error();
        const { data: { user } } = await database.auth.getUser();
        if (!user) return;
        const { data, error } = await database.from('menu_admins').select('user_id').eq('user_id', user.id).maybeSingle();
        if (error || !data) return;
        if (active) { setAllowed(true); await refresh(); }
      } catch { if (active) setMessage('메뉴 자료를 불러오지 못했습니다. 다시 시도해주세요.'); }
      finally { if (active) setChecking(false); }
    }
    init(); return () => { active = false; };
  }, []);
  async function importDrafts() {
    if (!database || !allowed || busy) return;
    setBusy(true); setMessage('사진과 메뉴 초안을 저장하고 있습니다. 이 화면을 열어두세요.');
    try {
      const { data, error } = await database.from('menu_items').select('id');
      if (error) throw error;
      const existing = new Set((data || []).map(row => row.id));
      const missing = sources.filter(row => !existing.has(row.id));
      const photos = Array.from(new Map(missing.filter(row => row.photo_box).map(row => [row.code,row])).values());
      const uploaded: Record<string, string> = {};
      for (let i=0; i<photos.length; i+=4) {
        await Promise.all(photos.slice(i,i+4).map(async row => {
          const image = new Image();
          await new Promise<void>((resolve,reject) => { image.onload=()=>resolve(); image.onerror=()=>reject(new Error('원본 사진을 불러오지 못했습니다.')); image.src=`/images/ozen-korea/ozen_korea_menu/page${row.source_page}.jpg`; });
          const [x,y,right,bottom] = row.photo_box!;
          const canvas = document.createElement('canvas'); canvas.width=right-x; canvas.height=bottom-y;
          const context = canvas.getContext('2d'); if (!context) throw new Error('사진 추출에 실패했습니다.');
          context.drawImage(image,x,y,right-x,bottom-y,0,0,canvas.width,canvas.height);
          const blob = await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('사진 변환에 실패했습니다.')),'image/jpeg',0.88));
          const filename = `import-v1-${row.code}.jpg`;
          const { error: uploadError } = await database!.storage.from('menu-photos').upload(filename, blob, { contentType: 'image/jpeg', upsert: false });
          if (uploadError && String((uploadError as { statusCode?: string }).statusCode) !== '409' && !/already exists|duplicate/i.test(uploadError.message)) throw uploadError;
          uploaded[row.code] = database!.storage.from('menu-photos').getPublicUrl(filename).data.publicUrl;
        }));
      }
      const records = missing.map(({ code, source_page, review_note, photo_box, ...row }) => ({ ...row, image_url: uploaded[code] || '', visible: false }));
      if (records.length) {
        const { error: writeError } = await database.from('menu_items').upsert(records, { onConflict: 'id', ignoreDuplicates: true });
        if (writeError) throw writeError;
      }
      await refresh(); setMessage(`${records.length}개 초안을 저장했습니다. 모두 숨김 상태입니다. 기존에 저장하거나 수정한 메뉴는 덮어쓰지 않았습니다.`);
    } catch (error) { setMessage(`저장에 실패했습니다. 다시 누르면 남은 항목을 이어서 처리합니다. ${error instanceof Error ? error.message : ''}`); }
    finally { setBusy(false); }
  }
  const byId = new Map(saved.map(row => [row.id,row]));
  const shown = sources.filter(row => row.menu_type === kind && (!onlyNotes || row.review_note) && `${row.code} ${row.name_en} ${row.name_ko} ${row.category}`.toLowerCase().includes(query.toLowerCase()));
  return <main className="menu-admin menu-review"><Link href="/admin">← 메뉴 관리</Link><p className="menu-eyebrow">OZEN · MENU MIGRATION REVIEW</p><h1>기존 메뉴 검토</h1>
    {checking ? <p>관리 권한 확인 중…</p> : !allowed ? <p>먼저 <Link href="/admin">관리자 로그인</Link>을 해주세요.</p> : <>
      <p>다이닝 84개 · 테이크아웃 76개. 검토용 자료이며, 아직 손님 메뉴에 공개되지 않았습니다.</p>
      <div className="admin-panel review-notice"><h2>확인이 필요한 차이</h2><p>다이닝: 기존 홈페이지 메뉴 이미지 2–8페이지 기준. 테이크아웃: 2026년 11월 10일 완성한 메뉴판 기준.</p><p>36개 항목의 가격이 다릅니다. B9는 삼계탕 / 육곱탕, F10·F11은 콘치즈 링 BBQ / 곱창 전골로 내용이 다릅니다. G7도 막걸리 병 / CANMAK으로 달라 사진을 연결하지 않았습니다.</p><p>다이닝 가격은 오래된 웹사이트 기준일 수 있습니다. 소스별 차이를 유지했으니 현재 가격과 판매 여부를 확인해주세요. 선택 옵션은 설명에 적었습니다.</p></div>
      <button className="admin-primary" onClick={importDrafts} disabled={busy}>기존 메뉴 전체를 숨김 초안으로 저장</button><p role="status" aria-live="polite">{message}</p>
      <div className="menu-tabs"><button aria-pressed={kind==='dining'} onClick={()=>setKind('dining')}>다이닝 · 84</button><button aria-pressed={kind==='takeout'} onClick={()=>setKind('takeout')}>테이크아웃 · 76</button></div>
      <label>메뉴 검색<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="번호, 한글·영문 이름, 카테고리" /></label><label className="admin-check"><input type="checkbox" checked={onlyNotes} onChange={e=>setOnlyNotes(e.target.checked)} />확인 메모가 있는 메뉴만</label>
      <p>{shown.length}개 표시 · 초안 저장 후 이름·가격·사진 수정은 <Link href="/admin">메뉴 관리</Link>에서 할 수 있습니다.</p>
      <div className="menu-grid">{shown.map(source => { const current = byId.get(source.id); const item = current || source; return <article className="menu-card" key={source.id}>
        {item.image_url ? <img src={item.image_url} alt={item.name_en} loading="lazy" /> : source.photo_box && <svg style={{width:'100%',height:220,background:'#231f1d'}} viewBox={`${source.photo_box[0]} ${source.photo_box[1]} ${source.photo_box[2]-source.photo_box[0]} ${source.photo_box[3]-source.photo_box[1]}`} role="img" aria-label={source.name_en}><image href={`/images/ozen-korea/ozen_korea_menu/page${source.source_page}.jpg`} width="1276" height="1790" /></svg>}<div className="menu-card-body"><p className="menu-eyebrow">{source.code} · {item.category}</p><div className="menu-item-title"><h2>{item.name_en}</h2><strong>${Number(item.price).toFixed(2)}</strong></div><p className="menu-korean">{item.name_ko}</p><p>{item.description}</p><p className="review-note">{source.review_note}</p><p>{current ? current.visible ? '저장됨 · 공개' : '저장됨 · 숨김' : '검토 자료 · 아직 저장 전'}</p>{source.source_page>0 && <a target="_blank" rel="noreferrer" href={`/images/ozen-korea/ozen_korea_menu/page${source.source_page}.jpg`}>기존 메뉴판 원본 보기 ↗</a>}</div>
      </article>; })}</div>
    </>}
  </main>;
}
