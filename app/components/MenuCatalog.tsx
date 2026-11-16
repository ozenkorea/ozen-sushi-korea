'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { database, MenuItem } from '../../lib/menu';
import LegacyKoreaMenu from './LegacyKoreaMenu';
import LegacySushiMenu from './LegacySushiMenu';
import { DINING_CATEGORIES, diningCategory } from '../../lib/menu-categories';
export default function MenuCatalog({ type, restaurant = 'korea' }: { type: 'dining' | 'takeout'; restaurant?: 'korea' | 'sushi' }) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(!!database);
  const [failed, setFailed] = useState(false);
  const [category, setCategory] = useState('All');
  useEffect(() => {
    let active = true;
    async function load() {
      if (!database) return;
      const { data, error } = await database.from('menu_items').select('*').eq('restaurant', restaurant).eq('menu_type', type).eq('visible', true).order('sort_order').order('name_en');
      if (active) { setItems((data || []).map(item => restaurant === 'korea' && type === 'dining' ? { ...item, category: diningCategory(item.category) } : item)); setFailed(!!error); setLoading(false); }
    }
    load();
    const refresh = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; document.removeEventListener('visibilitychange', refresh); };
  }, [type, restaurant]);
  const categories = restaurant === 'korea' && type === 'dining' ? DINING_CATEGORIES.filter(value => items.some(item => item.category === value)) : Array.from(new Set(items.map(item => item.category)));
  return <section className="menu-shell">
    <p className="menu-eyebrow">{restaurant === 'korea' ? 'OZEN KOREA' : 'OZEN SUSHI'} · LONDON</p><h1>{type === 'dining' ? 'Dine-in Menu' : 'Takeout Menu'}</h1><p className="menu-subtitle">{restaurant === 'korea' ? 'Korean favourites, made with care.' : 'Japanese favourites, made with care.'}</p>
    <nav className="menu-tabs" aria-label="Menu type"><Link aria-current={type === 'dining' ? 'page' : undefined} href={`/ozen-${restaurant}/menu`}>Dine-in · 매장 메뉴</Link><Link aria-current={type === 'takeout' ? 'page' : undefined} href={`/ozen-${restaurant}/takeout`}>Takeout · 포장 메뉴</Link></nav>
    {loading ? <p role="status">Loading menu…</p> : !items.length ? type === 'dining' ? restaurant === 'korea' ? <LegacyKoreaMenu /> : <LegacySushiMenu /> : <p role="status">{failed ? 'The takeout menu is temporarily unavailable. Please contact the restaurant.' : 'Our takeout menu is being prepared. Please contact the restaurant for current options.'}</p> : <>
      <div className="menu-categories">{['All', ...categories].map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div>
      <div className="menu-grid">{items.filter(item => category === 'All' || category === item.category).map(item => <article className="menu-card" key={item.id}>
        {item.image_url && <img src={item.image_url} alt={item.name_en} loading="lazy" />}
        <div className="menu-card-body"><p className="menu-eyebrow">{item.category}</p><div className="menu-item-title"><h2>{item.name_en}</h2><strong>${Number(item.price).toFixed(2)}</strong></div>{item.name_ko && <p className="menu-korean">{item.name_ko}</p>}{item.description && <><p className="menu-description">{item.description}</p><details className="menu-mobile-details"><summary aria-label={`Details for ${item.name_en}`}>Details · 상세</summary><p>{item.description}</p></details></>}{item.sold_out && <span className="menu-badge">Sold out · 품절</span>}</div>
      </article>)}</div><p className="menu-footnote">Prices in CAD. Please tell our team about any food allergies.</p>
    </>}
  </section>;
}
