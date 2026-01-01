import { View } from 'react-native';

// Skeleton placeholder with shimmer effect simulation
const SkeletonBox = ({
    width,
    height,
    borderRadius = 8,
    style = {}
}: {
    width: number | string;
    height: number;
    borderRadius?: number;
    style?: object;
}) => (
    <View
        style={[
            {
                backgroundColor: '#e2e8f0',
                width,
                height,
                borderRadius,
            },
            style
        ]}
    />
);

// Dashboard Header Skeleton
export const DashboardHeaderSkeleton = () => (
    <View style={{
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    }}>
        {/* User info row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonBox width={32} height={32} borderRadius={16} />
                <View style={{ marginLeft: 12 }}>
                    <SkeletonBox width={120} height={18} style={{ marginBottom: 4 }} />
                    <SkeletonBox width={160} height={14} />
                </View>
            </View>
            <SkeletonBox width={40} height={40} borderRadius={20} />
        </View>

        {/* Stats Row */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={{
                flex: 1,
                backgroundColor: '#f1f5f9',
                borderRadius: 12,
                padding: 12,
            }}>
                <SkeletonBox width={40} height={28} style={{ marginBottom: 4 }} />
                <SkeletonBox width={70} height={12} />
            </View>
            <View style={{
                flex: 1,
                backgroundColor: '#f1f5f9',
                borderRadius: 12,
                padding: 12,
            }}>
                <SkeletonBox width={40} height={28} style={{ marginBottom: 4 }} />
                <SkeletonBox width={70} height={12} />
            </View>
            <View style={{
                flex: 1,
                backgroundColor: '#f1f5f9',
                borderRadius: 12,
                padding: 12,
            }}>
                <SkeletonBox width={40} height={28} style={{ marginBottom: 4 }} />
                <SkeletonBox width={60} height={12} />
            </View>
        </View>
    </View>
);

// Filter Bar Skeleton
export const FilterBarSkeleton = () => (
    <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#1e3a8a',
    }}>
        <SkeletonBox width={70} height={32} borderRadius={4} style={{ marginRight: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <SkeletonBox width={80} height={32} borderRadius={4} style={{ marginRight: 8, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <SkeletonBox width={90} height={32} borderRadius={4} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
    </View>
);

// Task Card Skeleton
export const TaskCardSkeleton = () => (
    <View style={{
        backgroundColor: '#ffffff',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        overflow: 'hidden',
    }}>
        {/* Image placeholder */}
        <View style={{ padding: 12, paddingBottom: 0 }}>
            <SkeletonBox width="100%" height={160} borderRadius={12} />
        </View>

        {/* Content */}
        <View style={{ padding: 16 }}>
            {/* Title & Budget */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <SkeletonBox width="60%" height={18} style={{ marginRight: 8 }} />
                <SkeletonBox width={60} height={24} borderRadius={6} />
            </View>

            {/* Description */}
            <SkeletonBox width="100%" height={14} style={{ marginBottom: 4 }} />
            <SkeletonBox width="80%" height={14} style={{ marginBottom: 12 }} />

            {/* Badges */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <SkeletonBox width={60} height={28} borderRadius={6} />
                <SkeletonBox width={70} height={28} borderRadius={6} />
                <SkeletonBox width={65} height={28} borderRadius={6} />
            </View>

            {/* User row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <SkeletonBox width={32} height={32} borderRadius={16} style={{ marginRight: 10 }} />
                    <View>
                        <SkeletonBox width={80} height={13} style={{ marginBottom: 4 }} />
                        <SkeletonBox width={50} height={11} />
                    </View>
                </View>
                <SkeletonBox width={80} height={14} />
            </View>
        </View>
    </View>
);

// Calendar Header Skeleton
export const CalendarHeaderSkeleton = () => (
    <View style={{
        backgroundColor: '#ffffff',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
                <SkeletonBox width={100} height={24} style={{ marginBottom: 4 }} />
                <SkeletonBox width={180} height={14} />
            </View>
            <SkeletonBox width={70} height={36} borderRadius={8} />
        </View>
    </View>
);

// Calendar Grid Skeleton
export const CalendarGridSkeleton = () => (
    <View style={{
        backgroundColor: '#ffffff',
        margin: 16,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    }}>
        {/* Month Navigation */}
        <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
        }}>
            <SkeletonBox width={40} height={40} borderRadius={8} />
            <SkeletonBox width={140} height={20} />
            <SkeletonBox width={40} height={40} borderRadius={8} />
        </View>

        {/* Day Headers */}
        <View style={{ flexDirection: 'row', marginBottom: 8 }}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((_, index) => (
                <View key={index} style={{ flex: 1, alignItems: 'center', paddingVertical: 8 }}>
                    <SkeletonBox width={16} height={14} />
                </View>
            ))}
        </View>

        {/* Calendar Grid - 5 rows of 7 days */}
        {[0, 1, 2, 3, 4].map((row) => (
            <View key={row} style={{ flexDirection: 'row', marginBottom: 4 }}>
                {[0, 1, 2, 3, 4, 5, 6].map((col) => (
                    <View key={col} style={{ width: '14.28%', aspectRatio: 1, padding: 2 }}>
                        <View style={{
                            flex: 1,
                            borderRadius: 8,
                            backgroundColor: '#f1f5f9',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                            <SkeletonBox width={18} height={16} />
                        </View>
                    </View>
                ))}
            </View>
        ))}
    </View>
);

// Upcoming Task Item Skeleton
export const TaskItemSkeleton = () => (
    <View style={{
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    }}>
        {/* Status row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <SkeletonBox width={60} height={22} borderRadius={4} style={{ marginRight: 8 }} />
            <SkeletonBox width={50} height={14} />
        </View>

        {/* Title */}
        <SkeletonBox width="80%" height={16} style={{ marginBottom: 4 }} />

        {/* Description */}
        <SkeletonBox width="100%" height={13} style={{ marginBottom: 4 }} />
        <SkeletonBox width="60%" height={13} style={{ marginBottom: 12 }} />

        {/* Budget & Assignment */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <SkeletonBox width={70} height={24} borderRadius={4} />
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <SkeletonBox width={24} height={24} borderRadius={12} style={{ marginRight: 6 }} />
                <SkeletonBox width={60} height={12} />
            </View>
        </View>
    </View>
);

// Full Dashboard Skeleton
export const DashboardSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <DashboardHeaderSkeleton />
        <FilterBarSkeleton />
        <View style={{ padding: 20 }}>
            {/* Section Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <SkeletonBox width={120} height={18} />
                <SkeletonBox width={60} height={14} />
            </View>
            <TaskCardSkeleton />
            <TaskCardSkeleton />
            <TaskCardSkeleton />
        </View>
    </View>
);

// Full Calendar Skeleton
export const CalendarSkeleton = () => (
    <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <CalendarHeaderSkeleton />
        <CalendarGridSkeleton />
        {/* Legend */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 24, paddingHorizontal: 16, marginBottom: 16 }}>
            <SkeletonBox width={60} height={16} />
            <SkeletonBox width={70} height={16} />
            <SkeletonBox width={65} height={16} />
        </View>
        {/* Upcoming Tasks */}
        <View style={{ paddingHorizontal: 16 }}>
            <SkeletonBox width={130} height={18} style={{ marginBottom: 12 }} />
            <TaskItemSkeleton />
            <TaskItemSkeleton />
        </View>
    </View>
);
