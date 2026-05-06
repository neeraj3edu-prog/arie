import { useRef } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import type { Task } from '@/lib/types';

const ROW_HEIGHT = 60;

type TaskItemProps = {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
};

// Web: plain row with visible trash button
function TaskItemWeb({ task, onToggle, onDelete }: TaskItemProps) {
  const isDone = task.status === 'complete';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131a', paddingHorizontal: 16, height: ROW_HEIGHT }}>
      <Pressable
        onPress={onToggle}
        style={{ marginRight: 12, paddingVertical: 4 }}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        accessible accessibilityRole="checkbox"
        accessibilityState={{ checked: isDone }}
        accessibilityLabel={`Mark "${task.text}" as ${isDone ? 'incomplete' : 'complete'}`}
      >
        <Ionicons name={isDone ? 'checkbox' : 'square-outline'} size={24} color={isDone ? '#4f6ef7' : '#4a4a60'} />
      </Pressable>
      <Text style={{ flex: 1, fontSize: 15, lineHeight: 22, color: isDone ? '#4a4a60' : '#f0f0f5', textDecorationLine: isDone ? 'line-through' : 'none' }} numberOfLines={2}>
        {task.text}
      </Text>
      <Pressable
        onPress={onDelete}
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 12 }}
        accessible accessibilityRole="button"
        accessibilityLabel={`Delete ${task.text}`}
      >
        <Ionicons name="trash-outline" size={18} color="#ff453a" />
      </Pressable>
    </View>
  );
}

// Native: Swipeable handles swipe-to-delete; Pressable inside fires correctly
function TaskItemNative({ task, onToggle, onDelete }: TaskItemProps) {
  const isDone = task.status === 'complete';
  const swipeRef = useRef<Swipeable>(null);

  function handleDelete() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onDelete();
  }

  function handleToggle() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onToggle();
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
          accessibilityLabel={`Delete ${task.text}`}
        >
          <Ionicons name="trash" size={22} color="#fff" />
        </Pressable>
      )}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#13131a', paddingHorizontal: 16, height: ROW_HEIGHT }}>
        <Pressable
          onPress={handleToggle}
          style={{ marginRight: 12, paddingVertical: 4 }}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
          accessible
          accessibilityRole="checkbox"
          accessibilityState={{ checked: isDone }}
          accessibilityLabel={`Mark "${task.text}" as ${isDone ? 'incomplete' : 'complete'}`}
        >
          <Ionicons name={isDone ? 'checkbox' : 'square-outline'} size={24} color={isDone ? '#4f6ef7' : '#4a4a60'} />
        </Pressable>
        <Text
          style={{ flex: 1, fontSize: 15, lineHeight: 22, color: isDone ? '#4a4a60' : '#f0f0f5', textDecorationLine: isDone ? 'line-through' : 'none' }}
          numberOfLines={2}
        >
          {task.text}
        </Text>
        {task.reminderAt && <Ionicons name="alarm-outline" size={16} color="#4a4a60" style={{ marginLeft: 8 }} />}
      </View>
    </Swipeable>
  );
}

export function TaskItem(props: TaskItemProps) {
  if (Platform.OS === 'web') return <TaskItemWeb {...props} />;
  return <TaskItemNative {...props} />;
}
