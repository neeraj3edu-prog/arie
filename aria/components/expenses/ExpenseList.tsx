import { View, Text, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { ExpenseItem } from './ExpenseItem';
import { formatCents } from '@/lib/utils/currency';
import type { Expense } from '@/lib/types';

type ExpenseListProps = {
  expenses: Expense[];
  onDelete: (id: string) => void;
  totalLabel?: string; // e.g. "3 expenses · $125.00"
};

const EXPENSE_PROMPTS = [
  '"Milk $3, bread $2 at Walmart"',
  '"Coffee $5 at Starbucks"',
  '"Uber ride $12, lunch $9"',
];

export function ExpenseList({ expenses, onDelete, totalLabel }: ExpenseListProps) {
  if (expenses.length === 0) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={{
          borderWidth: 1,
          borderColor: 'rgba(247,162,79,0.3)',
          borderRadius: 16,
          padding: 20,
          backgroundColor: 'rgba(247,162,79,0.06)',
        }}>
          <Text style={{ color: '#f7a24f', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>
            TRY SAYING...
          </Text>
          {EXPENSE_PROMPTS.map((p, i) => (
            <Text key={i} style={{ color: '#f0f0f5', fontSize: 14, lineHeight: 22, marginBottom: 4 }}>
              {p}
            </Text>
          ))}
          <Text style={{ color: '#4a4a60', fontSize: 12, marginTop: 12 }}>
            Or tap the scan icon to photograph a receipt
          </Text>
        </View>
      </View>
    );
  }

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const currency = expenses[0]?.currency ?? 'USD';
  const summary = `${expenses.length} expense${expenses.length !== 1 ? 's' : ''} · ${formatCents(total, currency)}`;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 200 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Count + total */}
      <Text style={{ color: '#f7a24f', fontSize: 13, marginHorizontal: 16, marginBottom: 10 }}>
        {totalLabel ?? summary}
      </Text>

      {/* Card containing all expense rows */}
      <View style={{ marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' }}>
        <FlashList
          data={expenses}
          estimatedItemSize={72}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <>
              {index > 0 && (
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)' }} />
              )}
              <ExpenseItem expense={item} onDelete={() => onDelete(item.id)} />
            </>
          )}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  );
}
