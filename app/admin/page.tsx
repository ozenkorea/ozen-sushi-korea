'use client';
import { FormEvent, useEffect, useState } from 'react';
import { emptyItem, MenuItem } from '../../lib/menu-types';
import { DINING_CATEGORIES, diningCategory } from '../../lib/menu-categories';
export default function Admin() {
  const [ready, setReady] = useState(false), [authorized, setAuthorized] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [version, setVersion] = useState('');
  const [restaurant, setRestaurant] = useState<MenuItem['restaurant'] | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]), [draft, setDraft] = useState<MenuItem | null>(null);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  const [menuType, setMenuType] = useState<'dining' | 'takeout'>('dining');
  const [category, setCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [photoSize, setPhotoSize] = useState('');
  useEffect(() => {
    if (!draft) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [draft]);
  async function request(path: string, body?: unknown) {
    const response = await fetch(`/api/owner/${path}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
    const result = await response.json();
    if (!response.ok) {
      if (response.status === 401) { setAuthorized(false); setItems([]); setDraft(null); setRestaurant(null); }
      throw new Error(result.error || '연결하지 못했습니다. 다시 시도해주세요.');
    }
    return result;
  }
  function accept(result: { items: MenuItem[]; version: string }) {
    setItems(result.items.sort((a, b) => a.sort_order - b.sort_order || a.name_en.localeCompare(b.name_en)));
    setVersion(result.version);
  }
  async function load() { accept(await request('menus')); }
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await request('session');
        if (!active) return;
        setConfigured(session.configured); setAuthorized(session.authorized);
        if (session.authorized) await load();
        if (new URLSearchParams(window.location.search).has('error')) setMessage('GitHub 로그인을 완료하지 못했습니다. 오젠 소유자 계정으로 다시 시도해주세요.');
      } catch (error) { if (active) setMessage((error as Error).message); }
      finally { if (active) setReady(true); }
    })();
    return () => { active = false; };
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); if (!draft || !restaurant || draft.restaurant !== restaurant) return;
    setBusy(true); setMessage('');
    try {
      const item = { ...draft, name_en: draft.name_en.trim(), category: restaurant === 'korea' && draft.menu_type === 'dining' ? diningCategory(draft.category.trim()) : draft.category.trim() };
      accept(await request('menus', { operation: 'save', version, restaurant, item }));
      setMenuType(item.menu_type); setCategory(item.category); setSearch(''); setDraft(null); setPhotoSize('');
      setMessage('GitHub에 저장했습니다. 홈페이지 자동 배포가 완료되면 반영됩니다. 보통 1–3분 정도 걸리며 배포가 지연될 수도 있습니다.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function removeItem() {
    if (!draft || !restaurant || draft.restaurant !== restaurant || busy || !items.some(item => item.id === draft.id)) return;
    if (!window.confirm(`“${draft.name_ko || draft.name_en}” 메뉴를 삭제할까요? 손님 메뉴에서도 제거됩니다.`)) return;
    setBusy(true); setMessage('');
    try {
      accept(await request('menus', { operation: 'delete', version, restaurant, id: draft.id }));
      setDraft(null); setPhotoSize(''); setMessage('삭제 내용을 저장했습니다. 자동 배포 후 손님 메뉴에서도 제거됩니다.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function moveItem(id: string, direction: -1 | 1) {
    if (busy || search || status !== 'all') return;
    const ordered = scopedItems.filter(item => item.category === category);
    const index = ordered.findIndex(item => item.id === id), target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    setBusy(true); setMessage('');
    try {
      accept(await request('menus', { operation: 'reorder', version, restaurant, ids: ordered.map(item => item.id) }));
      setMessage('메뉴 순서를 저장했습니다. 자동 배포 후 홈페이지에 반영됩니다.');
    } catch (error) { setMessage((error as Error).message); }
    finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file || !draft || draft.restaurant !== restaurant) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage('사진은 JPG, PNG, WebP 형식으로 5MB 이하를 선택해주세요.'); return; }
    setBusy(true); setMessage('');
    const url = URL.createObjectURL(file);
    try {
      const image = new Image(); image.src = url; await image.decode();
      const ratio = Math.min(1, 800 / image.naturalWidth, 600 / image.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      const context = canvas.getContext('2d'); if (!context) throw new Error();
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL('image/webp', 0.85);
      if (!data.startsWith('data:image/webp;') || data.length > 1400000) throw new Error();
      setDraft(current => current ? { ...current, image_url: data } : current);
      setMessage('사진을 준비했습니다. 저장을 눌러 적용해주세요. 비율을 유지해 용량을 줄입니다.');
    } catch { setMessage('사진을 처리하지 못했습니다. 다른 JPG, PNG, WebP 사진으로 다시 시도해주세요.'); }
    finally { URL.revokeObjectURL(url); setBusy(false); }
  }
  async function logout() {
    if (draft && !window.confirm('저장하지 않은 변경 내용을 취소하고 로그아웃할까요?')) return;
    try { await request('logout', {}); setAuthorized(false); setItems([]); setDraft(null); setRestaurant(null); }
    catch (error) { setMessage((error as Error).message); }
  }
  const change = (key: keyof MenuItem, value: string | number | boolean) => setDraft(current => current ? { ...current, [key]: value } : current);
  const scopedItems = items.filter(item => item.restaurant === restaurant && item.menu_type === menuType).map(item => restaurant === 'korea' && menuType === 'dining' ? { ...item, category: diningCategory(item.category) } : item);
  const categories = restaurant === 'korea' && menuType === 'dining' ? [...DINING_CATEGORIES] : Array.from(new Set(scopedItems.map(item => item.category)));
  const shownItems = scopedItems.filter(item => item.category === category && `${item.name_en} ${item.name_ko}`.toLowerCase().includes(search.toLowerCase()) && (status === 'all' || status === 'hidden' && !item.visible || status === 'public' && item.visible && !item.sold_out || status === 'soldout' && item.sold_out));
  function openItem(item: MenuItem) { if (item.restaurant !== restaurant) return; setPhotoSize(''); setMessage(''); setDraft({ ...item }); }
  function closeDetail() {
    if (busy || draft && !window.confirm('저장하지 않은 변경 내용을 취소하고 메뉴 목록으로 돌아갈까요?')) return;
    setDraft(null); setPhotoSize(''); setMessage('');
  }
  function addItem() { if (!restaurant) return; openItem({ ...emptyItem(), restaurant, price: 99, menu_type: menuType, category: category || (restaurant === 'korea' && menuType === 'dining' ? 'Appetizer' : ''), sort_order: scopedItems.length ? Math.max(...scopedItems.map(item => item.sort_order)) + 10 : 0 }); }
  function selectRestaurant(next: MenuItem['restaurant'] | null) {
    if (busy || draft && !window.confirm('저장하지 않은 변경 내용을 취소하고 매장을 변경할까요?')) return;
    setRestaurant(next); setMenuType('dining'); setCategory(null); setDraft(null);
    setSearch(''); setStatus('all'); setPhotoSize(''); setMessage('');
  }
  return <main className={`menu-admin ${authorized ? 'admin-workspace' : ''}`}>
    <header><div><p className="menu-eyebrow">OZEN · OWNER PORTAL</p><h1>{restaurant === 'korea' ? '오젠코리아 관리자 포탈' : restaurant === 'sushi' ? '오젠스시 관리자 포탈' : '관리자 포탈'}</h1><p>{restaurant ? '사진, 가격, 신메뉴를 한곳에서 관리하세요.' : '로그인 후 관리할 매장을 선택해주세요.'}</p></div>{authorized && <button disabled={busy} onClick={logout}>로그아웃</button>}</header>
    <p role="status" aria-live="polite">{message}</p>
    {!ready ? <p>확인 중…</p> : !authorized ? <section className="admin-panel admin-login"><h2>관리자 로그인</h2><p>GitHub 계정으로 로그인하여 두 매장의 메뉴를 관리하세요.</p>{configured ? <a className="admin-primary" href="/api/owner/login">GitHub로 로그인</a> : <><p>메뉴와 사진 이전을 준비했습니다. 관리자 로그인을 사용하려면 마지막 GitHub 연결 설정이 필요합니다.</p><a href="https://github.com/settings/applications/new?oauth_application%5Bname%5D=Ozen%20Menu%20Manager&oauth_application%5Burl%5D=https%3A%2F%2Fozenlondon.ca&oauth_application%5Bcallback_url%5D=https%3A%2F%2Fozenlondon.ca%2Fapi%2Fowner%2Fcallback" target="_blank" rel="noreferrer">GitHub 로그인 연결 만들기</a></>}<p>오젠 소유자 계정만 메뉴를 수정할 수 있습니다.</p></section> : restaurant === null ? <section className="owner-panel owner-portal-selector">
      <div className="owner-section-title"><div><h2>매장 선택</h2><p>관리할 매장의 관리자 포탈을 선택해주세요.</p></div></div>
      <div className="owner-portal-grid">
        <button type="button" className="owner-portal-card is-korea" onClick={() => selectRestaurant('korea')}><span className="menu-eyebrow">OZEN KOREA</span><h3>오젠코리아 관리자 포탈</h3><p>오젠코리아의 메뉴, 사진, 가격을 관리합니다.</p><span className="owner-portal-enter">포탈 들어가기 →</span></button>
        <button type="button" className="owner-portal-card is-sushi" onClick={() => selectRestaurant('sushi')}><span className="menu-eyebrow">OZEN SUSHI</span><h3>오젠스시 관리자 포탈</h3><p>오젠스시의 메뉴, 사진, 가격을 관리합니다.</p><span className="owner-portal-enter">포탈 들어가기 →</span></button>
      </div>
    </section> : <>
    <div className="owner-tools">
      <a href={`/ozen-${restaurant}/${menuType === 'dining' ? 'menu' : 'takeout'}`} target="_blank" rel="noreferrer">손님 메뉴 보기 ↗</a>
      <button type="button" disabled={busy || !!draft} onClick={() => { setBusy(true); load().then(() => setMessage('최신 메뉴를 불러왔습니다.')).catch(error => setMessage(error.message)).finally(() => setBusy(false)); }}>최신 목록 불러오기</button>
    </div>
    <nav className="owner-breadcrumb" aria-label="현재 위치">
      <button disabled={busy} onClick={() => selectRestaurant(null)}>← 매장 선택</button><span>›</span>
      <button disabled={busy} onClick={() => { if (draft) { closeDetail(); return; } setCategory(null); setSearch(''); setStatus('all'); }}>메뉴 관리</button>
      {category !== null && <><span>›</span><button disabled={busy} onClick={() => { if (draft) closeDetail(); }}>{category}</button></>}
      {draft && <><span>›</span><span>{draft.name_ko || draft.name_en || '신메뉴 추가'}</span></>}
    </nav>
    {!draft ? <>
      <div className="owner-toolbar"><div className="owner-switch" aria-label="메뉴 종류">{(['dining','takeout'] as const).map(value => <button disabled={busy} key={value} aria-pressed={menuType===value} onClick={() => { setMenuType(value); setCategory(null); setSearch(''); setStatus('all'); setMessage(''); }}>{value==='dining' ? '다이닝 메뉴' : '테이크아웃 메뉴'}</button>)}</div><button className="admin-primary" disabled={busy} onClick={addItem}>＋ 신메뉴 추가</button></div>
      {category === null ? <section className="owner-panel"><div className="owner-section-title"><div><h2>카테고리 선택</h2><p>관리할 카테고리를 선택해주세요.</p></div><span>{categories.length}개 분류 · {scopedItems.length}개 메뉴</span></div>
        {!categories.length ? <p className="owner-empty">아직 등록된 메뉴가 없습니다. 기존 메뉴를 가져오거나 신메뉴를 추가해주세요.</p> : <div className="owner-category-grid">{categories.map(value => { const entries=scopedItems.filter(item=>item.category===value); return <button className="owner-category" key={value} onClick={()=>{setCategory(value);setSearch('');setStatus('all');}}><span className="owner-folder" aria-hidden="true">▤</span><strong>{value.split(' · ')[1] || value}</strong><span>{value.split(' · ')[1] ? value.split(' · ')[0] : '메뉴 관리'}</span><span className="owner-category-count">{entries.length}개 메뉴 <span aria-hidden="true">→</span></span></button>; })}</div>}
      </section> : <section className="owner-panel"><div className="owner-section-title"><div><button className="owner-back" disabled={busy} onClick={()=>{setCategory(null);setSearch('');}}>← 카테고리 목록</button><h2>{category}</h2></div><span>{shownItems.length}개 메뉴</span></div>
        <div className="owner-search"><label>메뉴 검색<input disabled={busy} value={search} onChange={e=>setSearch(e.target.value)} placeholder="한글 또는 영문 메뉴명" /></label><label>표시 상태<select disabled={busy} value={status} onChange={e=>setStatus(e.target.value)}><option value="all">전체</option><option value="public">공개 · 판매 중</option><option value="hidden">숨김</option><option value="soldout">품절</option></select></label></div>
        <p className="owner-order-note">메뉴 아래의 ↑ 위로 · ↓ 아래로 버튼으로 순서를 변경하면 저장되며, 홈페이지에는 자동 배포 후 반영됩니다.{(search || status !== 'all') && ' 순서를 바꾸려면 검색을 비우고 표시 상태를 전체로 선택해주세요.'}</p>{!shownItems.length ? <p className="owner-empty">해당 조건의 메뉴가 없습니다.</p> : <div className="owner-menu-grid">{shownItems.map(item=><div className="owner-menu-entry" key={item.id}><button disabled={busy} className="owner-menu-card" onClick={()=>openItem(item)} aria-label={`${item.name_ko || item.name_en} 상세 수정`}><div className="owner-photo-stage">{item.image_url ? <img src={item.image_url} alt={item.name_en} loading="lazy" /> : <span>사진 없음</span>}</div><div className="owner-menu-card-body"><span className={`owner-status ${!item.visible ? 'is-hidden' : item.sold_out ? 'is-soldout' : 'is-public'}`}>{!item.visible ? '숨김' : item.sold_out ? '품절' : '판매 중'}</span><h3>{item.name_ko || item.name_en}</h3>{item.name_ko && <p>{item.name_en}</p>}<div className="owner-card-bottom"><strong>${Number(item.price).toFixed(2)}</strong><span>상세 수정 →</span></div></div></button><div className="owner-order-actions"><button type="button" disabled={busy || !!search || status !== 'all' || scopedItems.filter(entry=>entry.category===category)[0]?.id===item.id} onClick={()=>moveItem(item.id,-1)} aria-label={`${item.name_ko || item.name_en} 위로 이동`}>↑ 위로</button><button type="button" disabled={busy || !!search || status !== 'all' || scopedItems.filter(entry=>entry.category===category).slice(-1)[0]?.id===item.id} onClick={()=>moveItem(item.id,1)} aria-label={`${item.name_ko || item.name_en} 아래로 이동`}>↓ 아래로</button></div></div>)}</div>}
      </section>}
    </> : <form className="owner-panel owner-detail" onSubmit={save}>
      <div className="owner-section-title"><div><button type="button" className="owner-back" disabled={busy} onClick={closeDetail}>← 메뉴 목록으로</button><h2>{items.some(item=>item.id===draft.id) ? '메뉴 상세 수정' : '신메뉴 추가'}</h2></div><span>{draft.menu_type==='dining' ? '다이닝' : '테이크아웃'}</span></div>
      <fieldset disabled={busy} className="owner-detail-grid">
        <aside className="owner-photo-editor"><h3>메뉴 사진</h3><div className="owner-photo-stage">{draft.image_url ? <img src={draft.image_url} alt="손님에게 표시될 메뉴 사진 전체" onLoad={e=>setPhotoSize(`${e.currentTarget.naturalWidth} × ${e.currentTarget.naturalHeight} px`)} /> : <span>메뉴 사진을 추가해주세요</span>}</div><p className="owner-photo-note">권장 크기 <strong>800 × 600 px</strong> · 가로 4:3<br/>사진 전체가 보이며 비율을 유지해 용량을 줄입니다.</p>{photoSize && <p className="owner-photo-note">현재 사진: {photoSize}</p>}<label className="owner-file-label">사진 업로드·변경<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>upload(e.target.files?.[0])} /></label><p className="owner-photo-note">JPG, PNG, WebP · 최대 5MB</p>{draft.image_url && <button type="button" className="owner-remove-photo" onClick={()=>{change('image_url','');setPhotoSize('');}}>사진 제거</button>}</aside>
        <section className="owner-fields"><h3>메뉴 정보</h3><div className="owner-field-grid">
          <label>한글 메뉴명<input maxLength={150} value={draft.name_ko} onChange={e=>change('name_ko',e.target.value)} /></label>
          <label>영문 메뉴명<input required maxLength={150} value={draft.name_en} onChange={e=>change('name_en',e.target.value)} /></label>
          <label>가격 (CAD)<input type="number" required min="0" max="9999.99" step="0.01" value={draft.price} onChange={e=>change('price',Number(e.target.value))} /></label>
          <label>메뉴 종류<select value={draft.menu_type} onChange={e=>change('menu_type',e.target.value)}><option value="dining">다이닝</option><option value="takeout">테이크아웃</option></select></label>
          <label>카테고리{draft.restaurant === 'korea' && draft.menu_type === 'dining' ? <select required value={diningCategory(draft.category)} onChange={e=>change('category',e.target.value)}><option value="" disabled>카테고리 선택</option>{DINING_CATEGORIES.map(value=><option key={value} value={value}>{value}</option>)}</select> : <><input list="owner-category-options" required maxLength={100} value={draft.category} onChange={e=>change('category',e.target.value)} placeholder="기존 분류 선택 또는 새 이름 입력" /><datalist id="owner-category-options">{Array.from(new Set(items.filter(item=>item.menu_type===draft.menu_type && item.restaurant===draft.restaurant).map(item=>item.category))).map(value=><option key={value} value={value}/>)}</datalist></>}</label>
          <label>표시 순서 · 작은 숫자부터<input type="number" min="0" step="1" required value={draft.sort_order} onChange={e=>change('sort_order',Number(e.target.value))} /></label>
          <label className="owner-wide">메뉴 설명<textarea maxLength={2000} rows={4} value={draft.description} onChange={e=>change('description',e.target.value)} /></label>
        </div><div className="owner-visibility"><h3>손님 화면 표시</h3><label className="admin-check"><input type="checkbox" checked={draft.visible} onChange={e=>change('visible',e.target.checked)} />메뉴 공개</label><label className="admin-check"><input type="checkbox" checked={draft.sold_out} onChange={e=>change('sold_out',e.target.checked)} />품절 표시</label><p>공개를 끄면 손님 메뉴에서 숨겨집니다.</p></div></section>
      </fieldset><div className="owner-save-bar">{items.some(item=>item.id===draft.id) && <button type="button" className="owner-delete" disabled={busy} onClick={removeItem}>메뉴 삭제</button>}<button type="button" disabled={busy} onClick={closeDetail}>취소 · 목록으로</button><button type="submit" disabled={busy} className="admin-primary">{busy ? '처리 중…' : '수정 / 저장'}</button></div>
    </form>}
    </>}
  </main>;
}
