import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRef, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '@/lib/utils/date';

type AddTaskSheetProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (texts: string[]) => void;
  defaultDate: string;  // 'YYYY-MM-DD'
};

export function AddTaskSheet({ visible, onClose, onAdd, defaultDate }: AddTaskSheetProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<TextInput>(null);

  function handleClose() {
    setText('');
    onClose();
  }

  async function handleAdd() {
    const trimmed = text.trim();
    if (!trimmed) return;

    setLoading(true);
    try {
      onAdd([trimmed]);
      setText('');
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save task. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet visible={visible} onClose={handleClose} snapHeight={320}>
      <View className="px-5 pt-2 pb-6 flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-text-primary text-lg font-bold">Add task</Text>
            <Text className="text-text-muted text-xs mt-0.5">
              {formatDate(defaultDate)}
            </Text>
          </View>
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

        {/* Input */}
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder="What do you need to do?"
          placeholderTextColor="#4a4a60"
          className="bg-bg border border-border-strong rounded-xl px-4 py-3 text-text-primary text-base mb-4"
          style={{ minHeight: 52 }}
          multiline
          returnKeyType="done"
          blurOnSubmit
          onSubmitEditing={handleAdd}
          autoFocus
          accessible
          accessibilityLabel="Task description, required"
        />

        <Button
          label="Add task"
          onPress={handleAdd}
          loading={loading}
          disabled={!text.trim()}
        />
      </View>
    </Sheet>
  );
}
