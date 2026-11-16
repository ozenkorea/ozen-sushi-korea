import Link from 'next/link';

const menuPdf = '/menus/ozen-korea-takeout.pdf';

export default function Page() {
  return <section className="menu-shell">
    <p className="menu-eyebrow">OZEN KOREA · LONDON</p>
    <h1>Takeout Menu</h1>
    <nav className="menu-tabs" aria-label="Menu type">
      <Link href="/ozen-korea/menu">Dine-in · 매장 메뉴</Link>
      <Link aria-current="page" href="/ozen-korea/takeout">Takeout · 포장 메뉴</Link>
    </nav>
    <div className="menu-tabs">
      <a href={menuPdf} target="_blank" rel="noreferrer">Open PDF · 메뉴 크게 보기 ↗</a>
      <a href={menuPdf} download>Download PDF · 내려받기</a>
    </div>
    <object data={menuPdf} type="application/pdf" aria-label="Ozen Korea takeout menu PDF" style={{ width: '100%', height: '80vh', minHeight: 520, border: '1px solid #dce1e8', borderRadius: 12 }}>
      <p><a href={menuPdf}>View the takeout menu PDF · 메뉴 PDF 열기</a></p>
    </object>
  </section>;
}
