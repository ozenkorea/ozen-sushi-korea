export const DINING_CATEGORIES = [
  'Appetizer', 'Korean Soup', 'Korean Speciality', 'Hot plate', 'Noodles',
  'A La Carte', 'Hot Pot', 'Barbecue', 'Beverage', 'Dessert', 'OZEN Market',
] as const;

const aliases: Record<string, string> = {
  'Appetizers · 전채류': 'Appetizer',
  'Korean Soups · 탕류': 'Korean Soup',
  'Specialities · 식사류': 'Korean Speciality',
  'Hot Plate · 철판류': 'Hot plate',
  'Noodles · 면류': 'Noodles',
  'Platters · 단품류': 'A La Carte',
  'Hot Pots · 전골류': 'Hot Pot',
  'Barbecue · 바비큐': 'Barbecue',
  'Liquor · 주류': 'Beverage',
  'Beverages · 음료': 'Beverage',
};
export function diningCategory(value: string): string {
  return aliases[value] || value;
}
