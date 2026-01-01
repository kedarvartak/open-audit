import { Skeleton } from "./Skeleton";
import { useTheme } from "../../contexts/ThemeContext";

export function TaskCardSkeleton() {
    const { theme } = useTheme();

    return (
        <div className={`rounded-lg overflow-hidden ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-200'}`}>
            {/* Image Banner Skeleton */}
            <div className="p-3">
                <Skeleton className={`w-full aspect-video rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-300'}`} />
            </div>

            {/* Card Content Skeleton */}
            <div className="p-4">
                {/* Title and Budget */}
                <div className="mb-3 flex justify-between items-start">
                    <Skeleton className={`h-6 w-3/4 ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                    <Skeleton className={`h-5 w-16 rounded ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                </div>

                {/* Description */}
                <div className="mb-4 space-y-2">
                    <Skeleton className={`h-3 w-full ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                    <Skeleton className={`h-3 w-5/6 ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                </div>

                {/* Status Chips */}
                <div className="flex gap-2 mb-4">
                    <Skeleton className={`h-5 w-16 rounded ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                    <Skeleton className={`h-5 w-12 rounded ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                    <Skeleton className={`h-5 w-20 rounded ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                </div>

                {/* Footer with Avatar */}
                <div className="flex items-center gap-2">
                    <Skeleton className={`w-7 h-7 rounded-full ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                    <div className="flex-1 space-y-1">
                        <Skeleton className={`h-3 w-24 ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                        <Skeleton className={`h-3 w-16 ${theme === 'dark' ? '' : 'bg-slate-300'}`} />
                    </div>
                </div>
            </div>
        </div>
    );
}
