import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '@/lib/types';

const DELETE_THRESHOLD = -80;
const ROW_HEIGHT = 60;

type TaskItemProps = {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
};

export function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
  const translateX = useSharedValue(0);
  const rowHeight = useSharedValue(ROW_HEIGHT);
  const opacity = useSharedValue(1);

  function triggerDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    rowHeight.value = withTiming(0, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 }, () => runOnJS(onDelete)());
  }

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-8, 8])
    .onUpdate((e) => {
      translateX.value = Math.min(0, e.translationX);
    })
    .onEnd((e) => {
      if (e.translationX < DELETE_THRESHOLD || e.velocityX < -600) {
        translateX.value = withTiming(-500, { duration: 200 });
        runOnJS(triggerDelete)();
      } else {
        translateX.value = withSpring(0);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    height: rowHeight.value,
    opacity: opacity.value,
  }));

  const itemStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteRevealStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(translateX.value) / Math.abs(DELETE_THRESHOLD)),
  }));

  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle();
  }

  const isDone = task.status === 'complete';

  return (
    <Animated.View style={[rowStyle, { overflow: 'hidden' }]}>
      {/* Delete background revealed by swipe */}
      <Animated.View
        style={[
          deleteRevealStyle,
          { position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, backgroundColor: '#ff453a', alignItems: 'center', justifyContent: 'center' },
        ]}
        accessible={false}
      >
        <Ionicons name="trash" size={22} color="#fff" />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            itemStyle,
            { flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131a', paddingHorizontal: 16, height: ROW_HEIGHT },
          ]}
        >
          {/* Checkbox */}
          <Pressable
            onPress={handleToggle}
            style={{ marginRight: 12, paddingVertical: 4 }}
            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            accessible
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isDone }}
            accessibilityLabel={`Mark "${task.text}" as ${isDone ? 'incomplete' : 'complete'}`}
          >
            <Ionicons
              name={isDone ? 'checkbox' : 'square-outline'}
              size={24}
              color={isDone ? '#4f6ef7' : '#4a4a60'}
            />
          </Pressable>

          {/* Task text */}
          <Text
            style={{
              flex: 1,
              fontSize: 15,
              lineHeight: 22,
              color: isDone ? '#4a4a60' : '#f0f0f5',
              textDecorationLine: isDone ? 'line-through' : 'none',
            }}
            numberOfLines={2}
          >
            {task.text}
          </Text>

          {/* Reminder indicator */}
          {task.reminderAt && (
            <Ionicons name="alarm-outline" size={16} color="#4a4a60" style={{ marginLeft: 8 }} />
          )}
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
