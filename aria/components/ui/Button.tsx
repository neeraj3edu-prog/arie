import { Pressable, Text, ActivityIndicator } from 'react-native';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
};

const VARIANT_CLASSES: Record<Variant, { container: string; text: string }> = {
  primary:   { container: 'bg-tasks',                    text: 'text-white font-semibold' },
  secondary: { container: 'bg-surface border border-border-strong', text: 'text-text-primary font-semibold' },
  ghost:     { container: '',                             text: 'text-tasks font-semibold' },
  danger:    { container: 'bg-error',                    text: 'text-white font-semibold' },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  accessibilityHint,
}: ButtonProps) {
  const { container, text } = VARIANT_CLASSES[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={`py-4 px-6 rounded-2xl items-center justify-center flex-row gap-2 ${container} ${isDisabled ? 'opacity-50' : 'active:opacity-80'}`}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
    >
      {loading && <ActivityIndicator size="small" color="#fff" />}
      <Text className={`text-base ${text}`}>{label}</Text>
    </Pressable>
  );
}
