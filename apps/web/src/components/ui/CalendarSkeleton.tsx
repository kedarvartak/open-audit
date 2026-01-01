import { Skeleton } from "./Skeleton";
import { useTheme } from "../../contexts/ThemeContext";

export function CalendarSkeleton() {
    const { theme } = useTheme();

    return (
        <div className="h-full flex relative overflow-hidden">
            {/* Main Calendar Area */}
            <div className="flex-1 min-w-0 p-6 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-10 w-32 rounded-lg" />
                </div>

                {/* Calendar Card */}
                <div className={`flex-1 rounded-xl border ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} p-4 overflow-hidden flex flex-col`}>
                    {/* Navigation */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <Skeleton className="w-9 h-9 rounded-lg" />
                            <Skeleton className="h-7 w-40" />
                            <Skeleton className="w-9 h-9 rounded-lg" />
                        </div>
                        <Skeleton className="h-9 w-20 rounded-lg" />
                    </div>

                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 mb-2">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="flex justify-center">
                                <Skeleton className="h-4 w-8" />
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 flex-1">
                        {[...Array(35)].map((_, i) => (
                            <div
                                key={i}
                                className={`p-2 rounded-lg border flex flex-col ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}
                            >
                                <Skeleton className="h-4 w-6 mb-2" />
                                {/* Randomly show some skeleton tasks */}
                                {i % 3 === 0 && (
                                    <Skeleton className="h-5 w-full rounded mb-1" />
                                )}
                                {i % 7 === 0 && (
                                    <Skeleton className="h-5 w-3/4 rounded" />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel Skeleton */}
            <div className={`w-96 h-full border-l ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} p-4`}>
                <div className={`mb-6 pb-4 border-b ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                    <Skeleton className="h-6 w-48" />
                </div>
                <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className={`p-4 rounded-sm border ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                            <div className="flex gap-2 mb-2">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-12" />
                            </div>
                            <Skeleton className="h-5 w-3/4 mb-2" />
                            <Skeleton className="h-4 w-full mb-3" />
                            <div className="flex justify-between">
                                <Skeleton className="h-5 w-16" />
                                <Skeleton className="h-6 w-6 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
