import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const database = url && key ? createClient(url, key) : null;
export type { MenuItem } from './menu-types';
import type { MenuItem } from './menu-types';
export const emptyItem = (): MenuItem => ({ id: crypto.randomUUID(), restaurant: 'korea', menu_type: 'dining', category: '', name_en: '', name_ko: '', description: '', price: 0, image_url: '', visible: false, sold_out: false, sort_order: 0 });
