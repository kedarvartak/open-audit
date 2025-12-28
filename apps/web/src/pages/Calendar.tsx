import { useState, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useTheme } from '../contexts/ThemeContext';
import { tasksAPI, type Task } from '../services/api';
import { ChevronLeft, ChevronRight, Clock, MapPin, DollarSign, User, AlertCircle, PanelRightClose, PanelRightOpen } from 'lucide-react';
import toast from 'react-hot-toast';

type ViewMode = 'month' | 'week';

const Calendar = () => {
    const { theme } = useTheme();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
    const [isPanelOpen, setIsPanelOpen] = useState(true);
    const userRole = localStorage.getItem('userRole') as 'CLIENT' | 'WORKER';

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const role = userRole === 'CLIENT' ? 'client' : 'worker';
            const response = await tasksAPI.getMyTasks(role);
            setTasks(response.data);
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            toast.error('Failed to load tasks');
        } finally {
            setLoading(false);
        }
    };

    // Calendar navigation
    const goToPreviousMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const goToNextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
        setSelectedDate(new Date());
    };

    // Get calendar grid data
    const getCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        const startingDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();

        const days: (Date | null)[] = [];

        // Add empty slots for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day));
        }

        return days;
    };

    // Get tasks for a specific date
    const getTasksForDate = (date: Date): Task[] => {
        return tasks.filter(task => {
            if (!task.deadline) return false;
            const taskDate = new Date(task.deadline);
            return (
                taskDate.getFullYear() === date.getFullYear() &&
                taskDate.getMonth() === date.getMonth() &&
                taskDate.getDate() === date.getDate()
            );
        });
    };

    // Format time from deadline
    const formatTime = (deadline: string) => {
        const date = new Date(deadline);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    // Get status color
    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            'OPEN': 'bg-blue-500',
            'ACCEPTED': 'bg-amber-500',
            'IN_PROGRESS': 'bg-purple-500',
            'SUBMITTED': 'bg-cyan-500',
            'VERIFIED': 'bg-green-500',
            'PAID': 'bg-emerald-500',
            'DISPUTED': 'bg-red-500',
            'CANCELLED': 'bg-slate-500',
        };
        return colors[status] || 'bg-slate-500';
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return (
            date.getFullYear() === today.getFullYear() &&
            date.getMonth() === today.getMonth() &&
            date.getDate() === today.getDate()
        );
    };

    const isSelected = (date: Date) => {
        if (!selectedDate) return false;
        return (
            date.getFullYear() === selectedDate.getFullYear() &&
            date.getMonth() === selectedDate.getMonth() &&
            date.getDate() === selectedDate.getDate()
        );
    };

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const calendarDays = getCalendarDays();
    const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];

    return (
        <DashboardLayout>
            <div className="h-full flex relative overflow-hidden">
                {/* Main Calendar Area */}
                <div className={`flex-1 min-w-0 p-6 flex flex-col transition-all duration-300`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                Calendar
                            </h1>
                            <p className={`text-sm ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                Track and organize your tasks
                            </p>
                        </div>

                        {/* View Controls */}
                        <div className="flex items-center gap-3">
                            <div className={`flex rounded-lg overflow-hidden border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                <button
                                    onClick={() => setViewMode('month')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'month'
                                        ? 'bg-[#464ace] text-white'
                                        : theme === 'dark'
                                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            : 'bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    Month
                                </button>
                                <button
                                    onClick={() => setViewMode('week')}
                                    className={`px-4 py-2 text-sm font-medium transition-colors ${viewMode === 'week'
                                        ? 'bg-[#464ace] text-white'
                                        : theme === 'dark'
                                            ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            : 'bg-white text-slate-700 hover:bg-slate-50'
                                        }`}
                                >
                                    Week
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Calendar Card */}
                    <div className={`flex-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} p-4 overflow-auto`}>
                        {/* Navigation */}
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={goToPreviousMonth}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <h2 className={`text-xl font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h2>
                                <button
                                    onClick={goToNextMonth}
                                    className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
                                        }`}
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                            <button
                                onClick={goToToday}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${theme === 'dark'
                                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    }`}
                            >
                                Today
                            </button>
                        </div>

                        {/* Day Headers */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map(day => (
                                <div
                                    key={day}
                                    className={`text-center py-2 text-sm font-medium ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                                        }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((date, index) => {
                                if (!date) {
                                    return <div key={`empty-${index}`} className="h-24" />;
                                }

                                const dayTasks = getTasksForDate(date);
                                const hasTasksToday = dayTasks.length > 0;

                                return (
                                    <button
                                        key={date.toISOString()}
                                        onClick={() => {
                                            setSelectedDate(date);
                                            if (!isPanelOpen) setIsPanelOpen(true);
                                        }}
                                        className={`h-24 p-2 rounded-lg border transition-all text-left flex flex-col ${isSelected(date)
                                            ? 'border-[#464ace] bg-[#464ace]/10'
                                            : isToday(date)
                                                ? theme === 'dark'
                                                    ? 'border-slate-600 bg-slate-800'
                                                    : 'border-slate-300 bg-slate-50'
                                                : theme === 'dark'
                                                    ? 'border-slate-700 hover:border-slate-600 hover:bg-slate-800/50'
                                                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                            }`}
                                    >
                                        <span
                                            className={`text-sm font-medium ${isToday(date)
                                                ? 'text-[#464ace]'
                                                : theme === 'dark'
                                                    ? 'text-slate-300'
                                                    : 'text-slate-700'
                                                }`}
                                        >
                                            {date.getDate()}
                                        </span>
                                        {hasTasksToday && (
                                            <div className="mt-1 flex-1 overflow-hidden space-y-1">
                                                {dayTasks.slice(0, 2).map(task => (
                                                    <div
                                                        key={task.id}
                                                        className={`${getStatusColor(task.status)} text-white text-xs px-1.5 py-0.5 rounded truncate`}
                                                    >
                                                        {task.title}
                                                    </div>
                                                ))}
                                                {dayTasks.length > 2 && (
                                                    <div className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        +{dayTasks.length - 2} more
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {loading && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-xl">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#464ace]" />
                        </div>
                    )}
                </div>

                {/* Collapsible Right Panel */}
                <div
                    className={`relative h-full transition-all duration-300 ease-in-out ${isPanelOpen ? 'w-96' : 'w-0'
                        }`}
                >
                    {/* Toggle Button - Sticky Arrow */}
                    <button
                        onClick={() => setIsPanelOpen(!isPanelOpen)}
                        className="absolute -left-5 top-1/2 -translate-y-1/2 z-20 w-10 h-20 flex items-center justify-center rounded-l-xl bg-[#464ace] hover:bg-[#3a3eb8] text-white shadow-xl transition-all hover:scale-105"
                    >
                        {isPanelOpen ? <PanelRightClose size={20} /> : <PanelRightOpen size={20} />}
                    </button>

                    {/* Panel Content */}
                    <div
                        className={`h-full overflow-hidden transition-all duration-300 ${isPanelOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            }`}
                    >
                        <div className={`h-full border-l ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} p-4 overflow-auto`}>
                            {/* Panel Header */}
                            <div className={`flex items-center justify-between mb-4 pb-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                    {selectedDate
                                        ? `Tasks for ${selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`
                                        : 'Select a Date'
                                    }
                                </h3>
                            </div>

                            {/* Tasks List */}
                            {!selectedDate ? (
                                <div className={`flex flex-col items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <AlertCircle size={48} className="mb-4 opacity-50" />
                                    <p className="text-sm">Click on a date to view tasks</p>
                                </div>
                            ) : selectedDateTasks.length === 0 ? (
                                <div className={`flex flex-col items-center justify-center py-12 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                    <AlertCircle size={48} className="mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No tasks scheduled</p>
                                    <p className="text-sm">Select another date or create a new task</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {selectedDateTasks.map(task => (
                                        <div
                                            key={task.id}
                                            className={`p-4 rounded-xl border transition-all hover:shadow-md cursor-pointer ${theme === 'dark'
                                                ? 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                                : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`${getStatusColor(task.status)} text-white text-xs px-2 py-0.5 rounded-full font-medium`}>
                                                    {task.status.replace('_', ' ')}
                                                </span>
                                                {task.deadline && (
                                                    <span className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                        <Clock size={12} />
                                                        {formatTime(task.deadline)}
                                                    </span>
                                                )}
                                            </div>
                                            <h4 className={`font-semibold mb-1 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                                                {task.title}
                                            </h4>
                                            <p className={`text-sm line-clamp-2 mb-3 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}`}>
                                                {task.description}
                                            </p>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1 text-sm font-bold text-green-500">
                                                    <DollarSign size={14} />
                                                    ₹{task.budget}
                                                </div>
                                                <span className={`flex items-center gap-1 text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                    <User size={12} />
                                                    {userRole === 'CLIENT' ? task.worker?.name || 'Unassigned' : task.client.name}
                                                </span>
                                            </div>
                                            {task.locationName && (
                                                <div className={`mt-2 pt-2 border-t flex items-center gap-1 text-xs ${theme === 'dark' ? 'border-slate-700 text-slate-400' : 'border-slate-200 text-slate-500'
                                                    }`}>
                                                    <MapPin size={12} />
                                                    <span className="truncate">{task.locationName}</span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
};

export default Calendar;
