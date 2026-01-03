import { cn } from "../../lib/utils";
import { useTheme } from "../../contexts/ThemeContext";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> { }

export function Skeleton({ className, ...props }: SkeletonProps) {
    const { theme } = useTheme();

    return (
        <div
            className={cn(
                "animate-pulse rounded-md",
                theme === 'dark' ? "bg-slate-800" : "bg-slate-200",
                className
            )}
            {...props}
        />
    );
}

// Task Card Skeleton
export function TaskCardSkeleton() {
    const { theme } = useTheme();
    const bgClass = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

    return (
        <div className={cn("p-6 rounded-xl border space-y-4", bgClass)}>
            <div className="flex items-start justify-between">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <div className="flex items-center gap-4 pt-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
            </div>
        </div>
    );
}

// Dashboard Stats Card Skeleton
export function StatCardSkeleton() {
    const { theme } = useTheme();
    const bgClass = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

    return (
        <div className={cn("p-6 rounded-xl border space-y-3", bgClass)}>
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-20" />
        </div>
    );
}

// Workspace Card Skeleton
export function WorkspaceCardSkeleton() {
    const { theme } = useTheme();
    const bgClass = theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';

    return (
        <div className={cn("p-6 rounded-xl border space-y-4", bgClass)}>
            <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>
            <div className="flex gap-2 pt-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
            </div>
        </div>
    );
}

// Calendar Skeleton
export function CalendarSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }).map((_, i) => (
                    <Skeleton key={`header-${i}`} className="h-8" />
                ))}
                {Array.from({ length: 35 }).map((_, i) => (
                    <Skeleton key={`day-${i}`} className="h-20 md:h-24" />
                ))}
            </div>
        </div>
    );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
    const { theme } = useTheme();
    const borderClass = theme === 'dark' ? 'border-gray-700' : 'border-gray-200';

    return (
        <div className={cn("flex items-center gap-4 p-4 border-b", borderClass)}>
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton key={i} className="h-5 flex-1" />
            ))}
        </div>
    );
}

// Modal Content Skeleton
export function ModalContentSkeleton() {
    return (
        <div className="space-y-6 p-4">
            <Skeleton className="h-8 w-1/2" />
            <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
            </div>
        </div>
    );
}

// Full Page Loading Skeleton
interface PageLoadingSkeletonProps {
    type?: 'dashboard' | 'list' | 'calendar' | 'workspace' | 'tasks';
}

export function PageLoadingSkeleton({ type = 'list' }: PageLoadingSkeletonProps) {
    if (type === 'dashboard') {
        return (
            <div className="space-y-8">
                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <StatCardSkeleton key={i} />
                    ))}
                </div>
                {/* Tasks */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <TaskCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'calendar') {
        return <CalendarSkeleton />;
    }

    if (type === 'workspace') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <WorkspaceCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'tasks') {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <div className="flex gap-3">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <TaskCardSkeleton key={i} />
                    ))}
                </div>
            </div>
        );
    }

    // Default list type
    return (
        <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <TaskCardSkeleton key={i} />
            ))}
        </div>
    );
}
