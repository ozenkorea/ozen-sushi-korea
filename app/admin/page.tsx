'use client';
import { FormEvent, useEffect, useState } from 'react';
import { database, emptyItem, MenuItem } from '../../lib/menu';
export default function Admin() {
  const [ready, setReady] = useState(false), [authorized, setAuthorized] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [newPassword, setNewPassword] = useState(''), [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState(''), [password, setPassword] = useState('');
  const [items, setItems] = useState<MenuItem[]>([]), [draft, setDraft] = useState<MenuItem | null>(null);
  const [message, setMessage] = useState(''), [busy, setBusy] = useState(false);
  async function load() {
    if (!database) return;
    const { data, error } = await database.from('menu_items').select('*').order('sort_order').order('name_en');
    if (error) throw error;
    setItems(data || []);
  }
  useEffect(() => {
    if (!database) { setReady(true); return; }
    const client = database;
    let active = true;
    async function check() {
      try {
        const { data: { user } } = await client.auth.getUser();
        if (!user) { if (active) { setAuthorized(false); setItems([]); setDraft(null); } return; }
        const { data, error } = await client.from('menu_admins').select('user_id').eq('user_id', user.id).maybeSingle();
        if (error) throw error;
        if (active) { setAuthorized(!!data); if (data) await load(); else setMessage('이 계정에는 메뉴 관리 권한이 없습니다.'); }
      } catch { if (active) setMessage('관리 권한을 확인할 수 없습니다. 연결 설정을 확인해주세요.'); }
      finally { if (active) setReady(true); }
    }
    check();
    const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setRecovering(true); setReady(true); }
      if (event === 'SIGNED_OUT') { setRecovering(false); setNewPassword(''); setConfirmPassword(''); }
      setTimeout(check, 0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  async function login(event: FormEvent) {
    event.preventDefault(); if (!database) return;
    setBusy(true); setMessage('');
    try { const { error } = await database.auth.signInWithPassword({ email, password }); if (error) throw error; setPassword(''); }
    catch { setMessage('로그인할 수 없습니다. 이메일과 비밀번호를 확인해주세요.'); }
    finally { setBusy(false); }
  }
  async function requestReset() {
    if (!database || !email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setMessage('이메일을 먼저 입력해주세요.'); return; }
    setBusy(true); setMessage('');
    try {
      const { error } = await database.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin` });
      if (error) {
        const hint = error.code === 'email_address_not_authorized' ? 'Supabase 기본 이메일은 프로젝트 팀에 등록된 주소로만 보낼 수 있습니다. ' : error.status === 429 ? '이메일 요청 횟수 제한에 걸렸습니다. 잠시 후 다시 시도해주세요. ' : '';
        setMessage(`${hint}${error.message} (오류: ${error.code || error.status || 'unknown'})`);
        return;
      }
      setMessage('등록된 계정이면 재설정 이메일이 발송됩니다. 메일의 링크를 이 브라우저에서 열어주세요.');
    } catch { setMessage('재설정 이메일을 요청하지 못했습니다. 잠시 후 다시 시도해주세요.'); }
    finally { setBusy(false); }
  }
  async function resetPassword(event: FormEvent) {
    event.preventDefault(); if (!database) return;
    if (newPassword.length < 12 || newPassword !== confirmPassword) { setMessage('12자 이상의 비밀번호를 두 칸에 동일하게 입력해주세요.'); return; }
    setBusy(true); setMessage('');
    try {
      const { error } = await database.auth.updateUser({ password: newPassword });
      if (error) { setMessage(error.message); return; }
      setNewPassword(''); setConfirmPassword(''); setRecovering(false);
      setMessage('비밀번호를 변경했습니다. 새 비밀번호를 안전하게 보관해주세요.');
    } catch { setMessage('변경하지 못했습니다. 재설정 링크가 만료됐다면 새로 요청해주세요.'); }
    finally { setBusy(false); }
  }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!database || !draft) return;
    setBusy(true); setMessage('');
    try {
      const { data, error } = await database.from('menu_items').upsert({ ...draft, name_en: draft.name_en.trim(), category: draft.category.trim() }).select().single();
      if (error || !data) throw error || new Error('Save failed');
      await load(); setDraft(null); setMessage('저장했습니다. 새로 연 손님 메뉴에 반영됩니다.');
    } catch { setMessage('저장하지 못했습니다. 연결과 관리 권한을 확인한 뒤 다시 시도해주세요.'); }
    finally { setBusy(false); }
  }
  async function upload(file?: File) {
    if (!file || !database || !draft) return;
    const types: Record<string,string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
    if (!types[file.type] || file.size > 5 * 1024 * 1024) { setMessage('사진은 JPG, PNG, WebP 형식으로 5MB 이하를 선택해주세요.'); return; }
    setBusy(true); setMessage('');
    try {
      const path = `${crypto.randomUUID()}.${types[file.type]}`;
      const { error } = await database.storage.from('menu-photos').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data } = database.storage.from('menu-photos').getPublicUrl(path);
      setDraft(current => current ? { ...current, image_url: data.publicUrl } : current);
      setMessage('사진을 업로드했습니다. 저장을 눌러 메뉴에 적용해주세요.');
    } catch { setMessage('사진 업로드에 실패했습니다. 다시 시도해주세요.'); }
    finally { setBusy(false); }
  }
  const change = (key: keyof MenuItem, value: string | number | boolean) => setDraft(current => current ? { ...current, [key]: value } : current);
  return <main className="menu-admin">
    <header><div><p className="menu-eyebrow">OZEN · OWNER PORTAL</p><h1>메뉴 관리</h1><p>사진, 가격, 신메뉴를 한곳에서 관리하세요.</p></div>{authorized && <button disabled={busy} onClick={async () => { if (!database) return; const { error } = await database.auth.signOut(); if (error) setMessage('로그아웃하지 못했습니다. 다시 시도해주세요.'); }}>로그아웃</button>}</header>
    <p role="status" aria-live="polite">{message}</p>
    {!database ? <div className="admin-panel"><h2>메뉴 관리 연결 준비 중</h2><p>관리자 로그인과 사진 저장 공간을 연결한 뒤 사용할 수 있습니다. 현재 메뉴는 기존 방식으로 표시됩니다.</p></div> : !ready ? <p>확인 중…</p> : recovering ? <form className="admin-panel admin-login" onSubmit={resetPassword}><h2>새 비밀번호 설정</h2><label>새 비밀번호<input type="password" autoComplete="new-password" minLength={12} required value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label><label>새 비밀번호 확인<input type="password" autoComplete="new-password" minLength={12} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label><button className="admin-primary" disabled={busy}>비밀번호 저장</button></form> : !authorized ? <form className="admin-panel admin-login" onSubmit={login}><h2>관리자 로그인</h2><label>이메일<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>비밀번호<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label><button className="admin-primary" disabled={busy}>로그인</button><button type="button" disabled={busy} onClick={requestReset}>비밀번호를 잊으셨나요?</button></form> : <>
    <button type="button" disabled={busy || !!draft} onClick={() => setRecovering(true)}>비밀번호 변경</button>
    <div className="admin-toolbar"><a href="/ozen-korea/menu" target="_blank" rel="noreferrer">손님 메뉴 보기 ↗</a><button className="admin-primary" disabled={busy || !!draft} onClick={() => { setMessage(''); setDraft(emptyItem()); }}>+ 신메뉴 추가</button></div>
    {draft && <form className="admin-panel admin-form" onSubmit={save}><h2>{items.some(item => item.id === draft.id) ? '메뉴 수정' : '신메뉴 추가'}</h2><fieldset disabled={busy}>
      <label>매장<select value={draft.restaurant} onChange={e => change('restaurant', e.target.value)}><option value="korea">Ozen Korea</option><option value="sushi" disabled>Ozen Sushi · 다음 단계</option></select></label>
      <label>메뉴 종류<select value={draft.menu_type} onChange={e => change('menu_type', e.target.value)}><option value="dining">다이닝</option><option value="takeout">테이크아웃</option></select></label>
      <label>카테고리<input required maxLength={100} value={draft.category} placeholder="예: Soup & Stew" onChange={e => change('category', e.target.value)} /></label>
      <label>영문 메뉴 이름<input required maxLength={150} value={draft.name_en} onChange={e => change('name_en', e.target.value)} /></label>
      <label>한글 메뉴 이름<input maxLength={150} value={draft.name_ko} onChange={e => change('name_ko', e.target.value)} /></label>
      <label>가격 (CAD)<input type="number" required min="0" max="9999.99" step="0.01" value={draft.price} onChange={e => change('price', Number(e.target.value))} /></label>
      <label>표시 순서 · 작은 숫자부터<input type="number" min="0" step="1" required value={draft.sort_order} onChange={e => change('sort_order', Number(e.target.value))} /></label>
      <label className="admin-wide">메뉴 설명<textarea maxLength={2000} rows={3} value={draft.description} onChange={e => change('description', e.target.value)} /></label>
      <label>메뉴 사진<input type="file" accept="image/jpeg,image/png,image/webp" onChange={e => upload(e.target.files?.[0])} /></label>
      {draft.image_url && <div><img className="admin-preview" src={draft.image_url} alt="메뉴 사진 미리보기" /><button type="button" onClick={() => change('image_url', '')}>사진 빼기</button></div>}
      <label className="admin-check"><input type="checkbox" checked={draft.visible} onChange={e => change('visible', e.target.checked)} />손님 메뉴에 공개</label><label className="admin-check"><input type="checkbox" checked={draft.sold_out} onChange={e => change('sold_out', e.target.checked)} />품절 표시</label>
      <div className="admin-wide admin-actions"><button type="button" onClick={() => { if (window.confirm('수정 내용을 취소할까요?')) setDraft(null); }}>취소</button><button className="admin-primary" type="submit">저장</button></div>
    </fieldset></form>}
    <div className="admin-list">{!items.length && <div className="admin-panel">등록한 메뉴가 없습니다. 신메뉴를 추가해보세요. 다이닝 메뉴는 등록된 공개 메뉴가 없으면 기존 이미지로 표시됩니다.</div>}{items.map(item => <div className="admin-row" key={item.id}><div><strong>{item.name_en}</strong><p>{item.name_ko} · {item.menu_type === 'dining' ? '다이닝' : '테이크아웃'} · {item.category}</p></div><strong>${Number(item.price).toFixed(2)}</strong><span>{item.visible ? item.sold_out ? '품절' : '공개' : '숨김'}</span><button disabled={busy || !!draft} onClick={() => setDraft({ ...item })}>수정</button></div>)}</div>
    </>}
  </main>;
}
