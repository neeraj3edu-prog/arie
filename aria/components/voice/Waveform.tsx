import { View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { useEffect } from 'react';

const BAR_COUNT = 5;
const BAR_HEIGHTS = [20, 32, 48, 32, 20]; // natural shape

type WaveformProps = {
  active: boolean;
  color?: string;
};

function Bar({ baseHeight, active, delay, color }: {
  baseHeight: number;
  active: boolean;
  delay: number;
  color: string;
}) {
  const height = useSharedValue(baseHeight * 0.4);

  useEffect(() => {
    if (active) {
      height.value = withRepeat(
        withSequence(
          withTiming(baseHeight, { duration: 300 + delay * 30 }),
          withTiming(baseHeight * 0.3, { duration: 300 + delay * 30 }),
        ),
        -1,
        true
      );
    } else {
      cancelAnimation(height);
      height.value = withTiming(baseHeight * 0.4, { duration: 200 });
    }
  }, [active, baseHeight, delay, height]);

  const style = useAnimatedStyle(() => ({
    height: height.value,
  }));

  return (
    <Animated.View
      style={[style, { width: 4, borderRadius: 2, backgroundColor: color, marginHorizontal: 3 }]}
    />
  );
}

export function Waveform({ active, color = '#4f6ef7' }: WaveformProps) {
  return (
    <View
      className="flex-row items-center justify-center"
      style={{ height: 56 }}
      accessible={false}
    >
      {BAR_HEIGHTS.map((h, i) => (
        <Bar key={i} baseHeight={h} active={active} delay={i} color={color} />
      ))}
    </View>
  );
}
