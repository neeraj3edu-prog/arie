import { View, Text, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getDb } from '@/lib/db/client';

type TaskMonthlySummaryProps = {
  activeMonth: string; // 'YYYY-MM'
};

type MonthlyCounts = { total: number; complete: number };

async function getMonthlyTaskCounts(monthPrefix: string): Promise<MonthlyCounts> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ total: number; complete: number }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN status = 'complete' THEN 1 ELSE 0 END) as complete
     FROM tasks_local
     WHERE scheduled_date LIKE ?`,
    [`${monthPrefix}%`]
  );
  return { total: row?.total ?? 0, complete: row?.complete ?? 0 };
}

export function TaskMonthlySummary({ activeMonth }: TaskMonthlySummaryProps) {
  const { data } = useQuery<MonthlyCounts>({
    queryKey: ['tasks', 'monthly-summary', activeMonth],
    queryFn: () => Platform.OS === 'web' ? Promise.resolve({ total: 0, complete: 0 }) : getMonthlyTaskCounts(activeMonth),
    staleTime: 30_000,
  });

  const total = data?.total ?? 0;
  const complete = data?.complete ?? 0;
  const pending = total - complete;
  const pct = total > 0 ? Math.round((complete / total) * 100) : 0;

  if (total === 0) return null;

  return (
    <View className="mx-4 mb-3 bg-surface rounded-2xl px-4 py-3 border border-border flex-row items-center gap-4">
      <View className="flex-1">
        <Text className="text-text-secondary text-xs font-semibold uppercase tracking-wider mb-1">
          This month
        </Text>
        <View className="flex-row gap-3">
          <Text className="text-text-primary text-sm">
            <Text className="font-bold text-tasks">{complete}</Text> done
          </Text>
          <Text className="text-text-primary text-sm">
            <Text className="font-bold text-text-secondary">{pending}</Text> pending
          </Text>
        </View>
      </View>

      {/* Completion ring */}
      <View className="items-center">
        <Text className="text-tasks text-xl font-bold">{pct}%</Text>
        <Text className="text-text-muted text-xs">complete</Text>
      </View>
    </View>
  );
}
