import { Pressable, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import type { VoiceMode } from '@/lib/types';

type VoiceButtonProps = {
  onPress: () => void;
  mode: VoiceMode;
};

const MODE_COLOR: Record<VoiceMode, string> = {
  tasks: '#4f6ef7',
  expenses: '#f7a24f',
};

export function VoiceButton({ onPress, mode }: VoiceButtonProps) {
  const scale = useSharedValue(1);
  const color = MODE_COLOR[mode];

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    scale.value = withSpring(0.9, { damping: 10 }, () => {
      scale.value = withSpring(1);
    });
    onPress();
  }

  return (
    <Animated.View
      style={[animStyle, {
        position: 'absolute',
        bottom: 24,
        alignSelf: 'center',
        left: '50%',
        marginLeft: -32,
      }]}
    >
      <Pressable
        onPress={handlePress}
        className="w-16 h-16 rounded-full items-center justify-center"
        style={{ backgroundColor: color, elevation: 8, shadowColor: color, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Record ${mode} by voice`}
        accessibilityHint="Opens voice recorder"
      >
        <Ionicons name="mic" size={28} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}
