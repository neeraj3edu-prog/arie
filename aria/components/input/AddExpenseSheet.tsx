import { View, Text, TextInput, Pressable, ScrollView, Alert } from 'react-native';
import { useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META } from '@/lib/utils/category';
import { parseDollarsToCents } from '@/lib/utils/currency';
import { localDateISO } from '@/lib/utils/date';
import type { ExpenseCategory, NewExpense } from '@/lib/types';

const CATEGORIES = Object.entries(CATEGORY_META) as [
  ExpenseCategory,
  (typeof CATEGORY_META)[ExpenseCategory],
][];

type AddExpenseSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (expenses: NewExpense[]) => void;
  defaultDate: string;
  defaultCurrency?: string;
};

export function AddExpenseSheet({
  visible,
  onClose,
  onAdd,
  defaultDate,
  defaultCurrency = 'USD',
}: AddExpenseSheetProps) {
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [store, setStore] = useState('');
  const [loading, setLoading] = useState(false);

  function handleClose() {
    setItem('');
    setAmount('');
    setCategory('other');
    setStore('');
    onClose();
  }

  async function handleAdd() {
    const trimmedItem = item.trim();
    if (!trimmedItem) return;

    setLoading(true);
    try {
      const newExpense: NewExpense = {
        item: trimmedItem,
        amount: parseDollarsToCents(amount),
        currency: defaultCurrency,
        category,
        store: store.trim() || null,
        date: defaultDate,
        receiptScan: false,
      };
      onAdd([newExpense]);
      handleClose();
    } catch {
      Alert.alert('Error', 'Could not save expense. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={handleClose} snapHeight={540}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-2 pb-8"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between mb-5">
          <Text className="text-text-primary text-lg font-bold">Add expense</Text>
          <Pressable
            onPress={handleClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <Ionicons name="close" size={22} color="#8a8aa0" />
          </Pressable>
        </View>

        {/* Item name */}
        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
          Item
        </Text>
        <TextInput
          value={item}
          onChangeText={setItem}
          placeholder="e.g. Whole milk, Uber ride…"
          placeholderTextColor="#4a4a60"
          className="bg-bg border border-border-strong rounded-xl px-4 py-3 text-text-primary text-base mb-4"
          returnKeyType="next"
          autoFocus
          accessible
          accessibilityLabel="Item description, required"
        />

        {/* Amount + Store row */}
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
              Amount
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#4a4a60"
              className="bg-bg border border-border-strong rounded-xl px-4 py-3 text-text-primary text-base"
              keyboardType="decimal-pad"
              returnKeyType="next"
              accessible
              accessibilityLabel="Amount in dollars"
            />
          </View>
          <View className="flex-1">
            <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
              Store (optional)
            </Text>
            <TextInput
              value={store}
              onChangeText={setStore}
              placeholder="Walmart, Amazon…"
              placeholderTextColor="#4a4a60"
              className="bg-bg border border-border-strong rounded-xl px-4 py-3 text-text-primary text-base"
              returnKeyType="done"
              accessible
              accessibilityLabel="Store name, optional"
            />
          </View>
        </View>

        {/* Category picker */}
        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-2">
          Category
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-5">
          {CATEGORIES.map(([cat, meta]) => {
            const selected = category === cat;
            return (
              <Pressable
                key={cat}
                onPress={() => setCategory(cat)}
                className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl border ${
                  selected ? 'border-transparent' : 'border-border'
                }`}
                style={selected ? { backgroundColor: `${meta.color}33`, borderColor: meta.color } : {}}
                accessible
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={meta.label}
              >
                <Ionicons
                  name={meta.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={14}
                  color={selected ? meta.color : '#8a8aa0'}
                />
                <Text
                  className="text-xs font-medium"
                  style={{ color: selected ? meta.color : '#8a8aa0' }}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Button
          label="Add expense"
          onPress={handleAdd}
          loading={loading}
          disabled={!item.trim()}
        />
      </ScrollView>
    </Sheet>
  );
}
