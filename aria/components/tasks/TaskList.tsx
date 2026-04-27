import { View, Text } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { TaskItem } from './TaskItem';
import type { Task } from '@/lib/types';

type TaskListProps = {
  tasks: Task[];
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  selectedDate: string;
};

const TASK_PROMPTS = [
  '"Buy groceries, call dentist, finish report"',
  '"Morning run, team meeting at 10, pick up kids"',
  '"Pay bills, review pull requests, water plants"',
];

export function TaskList({ tasks, onToggle, onDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 8 }}>
        <View style={{
          borderWidth: 1,
          borderColor: 'rgba(79,110,247,0.3)',
          borderRadius: 16,
          padding: 20,
          backgroundColor: 'rgba(79,110,247,0.06)',
        }}>
          <Text style={{ color: '#4f6ef7', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 12 }}>
            TRY SAYING...
          </Text>
          {TASK_PROMPTS.map((p, i) => (
            <Text key={i} style={{ color: '#f0f0f5', fontSize: 14, lineHeight: 22, marginBottom: 4 }}>
              {p}
            </Text>
          ))}
          <Text style={{ color: '#4a4a60', fontSize: 12, marginTop: 12 }}>
            Or tap + to type tasks manually
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlashList
      data={tasks}
      estimatedItemSize={60}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TaskItem
          task={item}
          onToggle={() => onToggle(item.id)}
          onDelete={() => onDelete(item.id)}
        />
      )}
      ItemSeparatorComponent={() => (
        <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 16 }} />
      )}
      contentContainerStyle={{ paddingBottom: 200 }}
    />
  );
}
