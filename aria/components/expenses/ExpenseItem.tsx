import { useRef } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryMeta } from '@/lib/utils/category';
import { formatCents } from '@/lib/utils/currency';
import type { Expense } from '@/lib/types';

type ExpenseItemProps = {
  expense: Expense;
  onDelete: () => void;
};

function ExpenseItemWeb({ expense, onDelete }: ExpenseItemProps) {
  const meta = getCategoryMeta(expense.category);
  const subtitle = expense.store ?? meta.label;
  const subtitleColor = expense.store ? '#8a8aa0' : meta.color;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#13131a' }}>
      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${meta.color}22`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
        <Ionicons name={meta.icon as React.ComponentProps<typeof Ionicons>['name']} size={20} color={meta.color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: '#f0f0f5', fontSize: 15, fontWeight: '600' }} numberOfLines={1}>{expense.item}</Text>
        <Text style={{ color: subtitleColor, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Text style={{ color: '#f7a24f', fontSize: 16, fontWeight: '700', marginRight: 12 }}>
        {formatCents(expense.amount, expense.currency)}
      </Text>
      <Pressable onPress={onDelete} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        accessible accessibilityRole="button" accessibilityLabel={`Delete ${expense.item}`}>
        <Ionicons name="trash-outline" size={18} color="#ff453a" />
      </Pressable>
    </View>
  );
}

function ExpenseItemNative({ expense, onDelete }: ExpenseItemProps) {
  const meta = getCategoryMeta(expense.category);
  const swipeRef = useRef<Swipeable>(null);
  const subtitle = expense.store ?? meta.label;
  const subtitleColor = expense.store ? '#8a8aa0' : meta.color;

  function handleDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onDelete();
  }

  return (
    <Swipeable
      ref={swipeRef}
      friction={2}
      overshootRight={false}
      rightThreshold={40}
      renderRightActions={() => (
        <Pressable
          onPress={handleDelete}
          style={{ width: 80, backgroundColor: '#ff453a', alignItems: 'center', justifyContent: 'center' }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Delete ${expense.item}`}
        >
          <Ionicons name="trash" size={22} color="#fff" />
        </Pressable>
      )}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#13131a' }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: `${meta.color}22`, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
          <Ionicons name={meta.icon as React.ComponentProps<typeof Ionicons>['name']} size={20} color={meta.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#f0f0f5', fontSize: 15, fontWeight: '600' }} numberOfLines={1}>{expense.item}</Text>
          <Text style={{ color: subtitleColor, fontSize: 13, marginTop: 2 }} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Text style={{ color: '#f7a24f', fontSize: 16, fontWeight: '700', marginRight: 12 }}>
          {formatCents(expense.amount, expense.currency)}
        </Text>
        <Pressable
          onPress={handleDelete}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={`Delete ${expense.item}`}
        >
          <Ionicons name="trash-outline" size={18} color="#ff453a" />
        </Pressable>
      </View>
    </Swipeable>
  );
}

export function ExpenseItem(props: ExpenseItemProps) {
  if (Platform.OS === 'web') return <ExpenseItemWeb {...props} />;
  return <ExpenseItemNative {...props} />;
}
