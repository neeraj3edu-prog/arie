import type { ExpenseCategory } from '../types';

type CategoryMeta = {
  label: string;
  icon: string;  // @expo/vector-icons name (Ionicons)
  color: string;
};

export const CATEGORY_META: Record<ExpenseCategory, CategoryMeta> = {
  groceries:     { label: 'Groceries',     icon: 'cart-outline',        color: '#34c759' },
  dining:        { label: 'Dining',         icon: 'restaurant-outline',  color: '#f7a24f' },
  transport:     { label: 'Transport',      icon: 'car-outline',         color: '#4f6ef7' },
  shopping:      { label: 'Shopping',       icon: 'bag-outline',         color: '#bf5af2' },
  health:        { label: 'Health',         icon: 'heart-outline',       color: '#ff453a' },
  entertainment: { label: 'Entertainment',  icon: 'film-outline',        color: '#ffd60a' },
  utilities:     { label: 'Utilities',      icon: 'flash-outline',       color: '#64d2ff' },
  other:         { label: 'Other',          icon: 'ellipsis-horizontal', color: '#8a8aa0' },
};

export function getCategoryMeta(category: ExpenseCategory): CategoryMeta {
  return CATEGORY_META[category] ?? CATEGORY_META.other;
}
