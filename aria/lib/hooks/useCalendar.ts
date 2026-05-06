import { useState, useCallback } from 'react';
import { localDateISO, localMonthISO } from '@/lib/utils/date';

type CalendarState = {
  selectedDate: string;
  activeMonth: string;  // 'YYYY-MM'
  setSelectedDate: (date: string) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
};

export function useCalendar(): CalendarState {
  const [selectedDate, setSelectedDateRaw] = useState(localDateISO());
  const [activeMonth, setActiveMonth] = useState(localMonthISO());

  // Auto-advance the visible month when the user taps an adjacent-month cell
  const setSelectedDate = useCallback((date: string) => {
    setSelectedDateRaw(date);
    const newMonth = date.substring(0, 7);
    setActiveMonth(newMonth);
  }, []);

  const goToPrevMonth = useCallback(() => {
    setActiveMonth((prev) => {
      const [year, month] = prev.split('-').map(Number);
      const d = new Date(year, month - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setActiveMonth((prev) => {
      const [year, month] = prev.split('-').map(Number);
      const d = new Date(year, month, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
  }, []);

  const goToToday = useCallback(() => {
    setSelectedDate(localDateISO());
    setActiveMonth(localMonthISO());
  }, []);

  return { selectedDate, activeMonth, setSelectedDate, goToPrevMonth, goToNextMonth, goToToday };
}
