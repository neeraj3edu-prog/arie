import { View, Text, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { getCategoryMeta } from '@/lib/utils/category';
import { formatCents } from '@/lib/utils/currency';
import type { Expense } from '@/lib/types';

const DELETE_THRESHOLD = -80;

type ExpenseItemProps = {
  expense: Expense;
  onDelete: () => void;
};

// Web: plain row — no gesture handler so iOS Safari scroll works
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

// Native: full swipe-to-delete
function ExpenseItemNative({ expense, onDelete }: ExpenseItemProps) {
  const meta = getCategoryMeta(expense.category);
  const translateX = useSharedValue(0);
  const rowOpacity = useSharedValue(1);

  function triggerDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    rowOpacity.value = withTiming(0, { duration: 200 }, () => runOnJS(onDelete)());
  }

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-8, 8])
    .onUpdate((e) => { translateX.value = Math.min(0, e.translationX); })
    .onEnd((e) => {
      if (e.translationX < DELETE_THRESHOLD || e.velocityX < -600) {
        translateX.value = withTiming(-500, { duration: 200 });
        runOnJS(triggerDelete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const itemStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }], opacity: rowOpacity.value }));
  const deleteRevealStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(translateX.value) / Math.abs(DELETE_THRESHOLD)) }));

  const subtitle = expense.store ?? meta.label;
  const subtitleColor = expense.store ? '#8a8aa0' : meta.color;

  return (
    <View style={{ overflow: 'hidden', position: 'relative' }}>
      <Animated.View style={[deleteRevealStyle, { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: '#ff453a', alignItems: 'center', justifyContent: 'center' }]} accessible={false}>
        <Ionicons name="trash" size={20} color="#fff" />
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[itemStyle, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#13131a' }]}>
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
          <Pressable onPress={triggerDelete} hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessible accessibilityRole="button" accessibilityLabel={`Delete ${expense.item}`}>
            <Ionicons name="trash-outline" size={18} color="#ff453a" />
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export function ExpenseItem(props: ExpenseItemProps) {
  if (Platform.OS === 'web') return <ExpenseItemWeb {...props} />;
  return <ExpenseItemNative {...props} />;
}
