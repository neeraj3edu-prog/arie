import { View, Text, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/store/authStore';

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
  'UTC',
];

const CURRENCIES = [
  { code: 'USD', label: '$ US Dollar' },
  { code: 'EUR', label: '€ Euro' },
  { code: 'GBP', label: '£ British Pound' },
  { code: 'INR', label: '₹ Indian Rupee' },
  { code: 'JPY', label: '¥ Japanese Yen' },
  { code: 'AUD', label: 'A$ Australian Dollar' },
];

function detectTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC';
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [timezone, setTimezone] = useState(detectTimezone());
  const [currency, setCurrency] = useState('USD');
  const [saving, setSaving] = useState(false);

  async function handleDone() {
    if (!user) return;
    setSaving(true);
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        timezone,
        currency,
        onboarded: true,
      });
      router.replace('/(tabs)/tasks');
    } catch {
      // Profile update fails gracefully — Supabase not connected yet
      router.replace('/(tabs)/tasks');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-bg"
      contentContainerClassName="px-6 pt-16 pb-12"
    >
      <Text className="text-text-primary text-3xl font-bold mb-2">Welcome to Aria</Text>
      <Text className="text-text-secondary text-base mb-10">
        Let's set up your preferences so Aria works the way you do.
      </Text>

      <Text className="text-text-primary font-semibold text-base mb-3">Your timezone</Text>
      <View className="gap-2 mb-8">
        {TIMEZONES.map((tz) => (
          <Pressable
            key={tz}
            className={`py-3 px-4 rounded-xl border ${timezone === tz ? 'bg-tasks border-tasks' : 'bg-surface border-border'}`}
            onPress={() => setTimezone(tz)}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ checked: timezone === tz }}
            accessibilityLabel={tz}
          >
            <Text className={`text-sm ${timezone === tz ? 'text-white font-semibold' : 'text-text-secondary'}`}>
              {tz}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text className="text-text-primary font-semibold text-base mb-3">Your currency</Text>
      <View className="gap-2 mb-10">
        {CURRENCIES.map((c) => (
          <Pressable
            key={c.code}
            className={`py-3 px-4 rounded-xl border ${currency === c.code ? 'bg-expenses border-expenses' : 'bg-surface border-border'}`}
            onPress={() => setCurrency(c.code)}
            accessible
            accessibilityRole="radio"
            accessibilityState={{ checked: currency === c.code }}
            accessibilityLabel={c.label}
          >
            <Text className={`text-sm ${currency === c.code ? 'text-white font-semibold' : 'text-text-secondary'}`}>
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        className="bg-tasks py-4 rounded-2xl items-center active:opacity-80"
        onPress={handleDone}
        disabled={saving}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Get started"
      >
        <Text className="text-white font-bold text-base">Get started</Text>
      </Pressable>
    </ScrollView>
  );
}
