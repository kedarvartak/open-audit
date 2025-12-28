import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface DatePickerProps {
    value: string;
    onChange: (date: string) => void;
    placeholder?: string;
    required?: boolean;
}

export const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, placeholder = 'dd/mm/yyyy' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const { theme } = useTheme();
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const firstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const formatDate = (date: Date) => {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${year}-${month}-${day}`;
    };

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    const handleDateClick = (day: number) => {
        const selectedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        onChange(formatDate(selectedDate));
        setIsOpen(false);
    };

    const previousMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const renderCalendar = () => {
        const days = [];
        const totalDays = daysInMonth(currentMonth);
        const firstDay = firstDayOfMonth(currentMonth);
        const selectedDate = value ? new Date(value) : null;

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10" />);
        }

        // Days of the month
        for (let day = 1; day <= totalDays; day++) {
            const isSelected = selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === currentMonth.getMonth() &&
                selectedDate.getFullYear() === currentMonth.getFullYear();

            const isToday = new Date().getDate() === day &&
                new Date().getMonth() === currentMonth.getMonth() &&
                new Date().getFullYear() === currentMonth.getFullYear();

            days.push(
                <button
                    key={day}
                    type="button"
                    onClick={() => handleDateClick(day)}
                    className={`h-10 rounded-md text-sm font-medium transition-colors ${isSelected
                        ? 'bg-indigo-600 text-white'
                        : isToday
                            ? theme === 'dark'
                                ? 'bg-slate-600 text-slate-100'
                                : 'bg-slate-200 text-slate-900'
                            : theme === 'dark'
                                ? 'text-slate-300 hover:bg-slate-700'
                                : 'text-slate-700 hover:bg-slate-100'
                        }`}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    return (
        <div ref={pickerRef} className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex h-12 w-full items-center justify-between rounded-md border px-4 py-3 text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${theme === 'dark'
                    ? 'border-slate-600 bg-slate-700 text-slate-100 focus-visible:border-blue-500'
                    : 'border-slate-300 bg-white text-slate-900 focus-visible:border-blue-500'
                    }`}
            >
                <span className={value ? '' : theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}>
                    {value ? formatDisplayDate(value) : placeholder}
                </span>
                <CalendarIcon size={18} className={theme === 'dark' ? 'text-slate-400' : 'text-slate-500'} />
            </button>

            {isOpen && (
                <div className={`absolute z-50 bottom-full mb-2 right-0 w-80 rounded-md border shadow-lg p-4 ${theme === 'dark'
                    ? 'bg-slate-800 border-slate-700'
                    : 'bg-white border-slate-200'
                    }`}>
                    {/* Month/Year Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            type="button"
                            onClick={previousMonth}
                            className={`p-2 rounded-md transition-colors ${theme === 'dark'
                                ? 'hover:bg-slate-700 text-slate-300'
                                : 'hover:bg-slate-100 text-slate-600'
                                }`}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className={`font-semibold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                        </span>
                        <button
                            type="button"
                            onClick={nextMonth}
                            className={`p-2 rounded-md transition-colors ${theme === 'dark'
                                ? 'hover:bg-slate-700 text-slate-300'
                                : 'hover:bg-slate-100 text-slate-600'
                                }`}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {dayNames.map(day => (
                            <div
                                key={day}
                                className={`h-8 flex items-center justify-center text-xs font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                    }`}
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {renderCalendar()}
                    </div>
                </div>
            )}
        </div>
    );
};
