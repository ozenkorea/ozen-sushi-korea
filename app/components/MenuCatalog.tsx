import menu from '../../data/menu-public.json';
import type { MenuItem } from '../../lib/menu-types';
import { diningCategory } from '../../lib/menu-categories';
import MenuCatalogClient from './MenuCatalogClient';

// Public menu is built from this repository, never from a live database request.
export default function MenuCatalog({ type, restaurant = 'korea' }: { type: 'dining' | 'takeout'; restaurant?: 'korea' | 'sushi' }) {
  const items = (menu as MenuItem[]).filter(item => item.restaurant === restaurant && item.menu_type === type && item.visible)
    .map(item => restaurant === 'korea' && type === 'dining' ? { ...item, category: diningCategory(item.category) } : item)
    .sort((a, b) => a.sort_order - b.sort_order || a.name_en.localeCompare(b.name_en));
  return <MenuCatalogClient type={type} restaurant={restaurant} items={items} />;
}
