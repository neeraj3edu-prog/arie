import { View, Text } from 'react-native';

type BadgeProps = {
  label: string;
  color?: string;   // hex
  textColor?: string;
};

export function Badge({ label, color = '#4f6ef7', textColor = '#fff' }: BadgeProps) {
  return (
    <View
      className="px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${color}33` }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text className="text-xs font-semibold" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
