import { useState } from 'react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, addMonths, subMonths, isSameMonth, isSameDay, isToday } from 'date-fns';
import { zhCN, enUS } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useSettingsStore } from '@/shared/store/settings-store';

interface CalendarProps {
    selectedDate?: Date;
    onSelectDate: (date?: Date) => void;
    dayRenderer?: (day: Date, opts: { isSelected: boolean; isCurrentMonth: boolean }) => React.ReactNode;
}

export function Calendar({ selectedDate, onSelectDate, dayRenderer }: CalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const { language } = useSettingsStore();
    const locale = language === 'zh' ? zhCN : enUS;

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale });
    const endDate = endOfWeek(monthEnd, { locale });

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    // Adjust for locale if needed, but simple strings work for now or use date-fns format

    return (
        <div className="p-3 bg-card rounded-lg border border-border shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="font-medium text-sm">
                    {format(currentMonth, 'MMMM yyyy', { locale })}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map((day) => (
                    <div key={day} className="text-center text-[10px] text-muted-foreground font-medium">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const isCurrentMonth = isSameMonth(day, monthStart);

                    return (
                        <div key={day.toString()} className="flex justify-center">
                            <button
                                onClick={() => {
                                    if (isSelected) {
                                        onSelectDate(undefined); // Toggle off
                                    } else {
                                        onSelectDate(day);
                                    }
                                }}
                                className={cn(
                                    "h-7 w-7 rounded-full flex items-center justify-center text-xs transition-colors",
                                    !isCurrentMonth && "text-muted-foreground/30",
                                    isCurrentMonth && "text-foreground hover:bg-secondary",
                                    isToday(day) && !isSelected && "text-primary font-bold bg-primary/10",
                                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
                                )}
                            >
                                {dayRenderer
                                    ? dayRenderer(day, { isSelected: !!isSelected, isCurrentMonth })
                                    : format(day, 'd')}
                            </button>
                        </div>
                    );
                })}
            </div>

            {selectedDate && (
                <div className="mt-3 pt-2 border-t border-border flex justify-center">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => onSelectDate(undefined)}
                    >
                        Clear Filter
                    </Button>
                </div>
            )}
        </div>
    );
}
