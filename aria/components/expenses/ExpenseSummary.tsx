import { View, Text, ScrollView } from 'react-native';
import { formatCents } from '@/lib/utils/currency';
import { getCategoryMeta, CATEGORY_META } from '@/lib/utils/category';
import { Ionicons } from '@expo/vector-icons';
import type { Expense, ExpenseCategory } from '@/lib/types';

type ExpenseSummaryProps = {
  expenses: Expense[];
  currency?: string;
};

export function ExpenseSummary({ expenses, currency = 'USD' }: ExpenseSummaryProps) {
  const totalCents = expenses.reduce((s, e) => s + e.amount, 0);

  // Group by category
  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});

  const sorted = (Object.entries(byCategory) as [ExpenseCategory, number][])
    .sort((a, b) => b[1] - a[1]);

  return (
    <View className="mx-4 mb-3 bg-surface rounded-2xl border border-border overflow-hidden">
      {/* Total row */}
      <View className="px-4 pt-3 pb-2 flex-row items-baseline justify-between">
        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider">
          Total this month
        </Text>
        <Text className="text-expenses text-2xl font-bold">
          {formatCents(totalCents, currency)}
        </Text>
      </View>

      {sorted.length > 0 && (
        <View className="border-t border-border px-4 pt-2 pb-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-1">
            {sorted.map(([cat, amount]) => {
              const meta = getCategoryMeta(cat);
              const pct = totalCents > 0 ? Math.round((amount / totalCents) * 100) : 0;
              return (
                <View
                  key={cat}
                  className="mx-1 items-center px-3 py-2 rounded-xl"
                  style={{ backgroundColor: `${meta.color}18` }}
                >
                  <Ionicons
                    name={meta.icon as React.ComponentProps<typeof Ionicons>['name']}
                    size={16}
                    color={meta.color}
                  />
                  <Text className="text-text-secondary text-xs mt-1">{meta.label}</Text>
                  <Text className="font-semibold text-sm mt-0.5" style={{ color: meta.color }}>
                    {formatCents(amount, currency)}
                  </Text>
                  <Text className="text-text-muted text-xs">{pct}%</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
