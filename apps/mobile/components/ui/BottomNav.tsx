import { View, Text, TouchableOpacity } from 'react-native';
import {
    Home,
    LayoutGrid,
    Calendar,
    Users,
    Settings,
} from 'lucide-react-native';

interface BottomNavProps {
    activeTab: 'dashboard' | 'tasks' | 'calendar' | 'workspaces' | 'settings';
    onTabPress: (tab: 'dashboard' | 'tasks' | 'calendar' | 'workspaces' | 'settings') => void;
    userRole?: 'CLIENT' | 'WORKER';
}

interface NavItem {
    id: 'dashboard' | 'tasks' | 'calendar' | 'workspaces' | 'settings';
    label: string;
    icon: typeof Home;
    workerOnly?: boolean;
}

export const BottomNav = ({ activeTab, onTabPress, userRole = 'WORKER' }: BottomNavProps) => {
    const navItems: NavItem[] = [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'tasks', label: 'Tasks', icon: LayoutGrid },
        { id: 'calendar', label: 'Calendar', icon: Calendar },
        { id: 'workspaces', label: 'Workspaces', icon: Users, workerOnly: true },
        { id: 'settings', label: 'Settings', icon: Settings },
    ];

    // Filter items based on user role
    const filteredItems = navItems.filter(item => !item.workerOnly || userRole === 'WORKER');

    return (
        <View style={{
            flexDirection: 'row',
            backgroundColor: '#1e3a8a',
            paddingVertical: 8,
            paddingHorizontal: 8,
            borderTopWidth: 0,
        }}>
            {filteredItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                    <TouchableOpacity
                        key={item.id}
                        onPress={() => onTabPress(item.id)}
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                            paddingVertical: 8,
                            borderRadius: 8,
                            backgroundColor: isActive ? '#ffffff' : 'transparent',
                        }}
                        activeOpacity={0.7}
                    >
                        <Icon
                            size={22}
                            color={isActive ? '#1e3a8a' : '#ffffff'}
                        />
                        <Text style={{
                            fontSize: 10,
                            fontWeight: '600',
                            marginTop: 4,
                            color: isActive ? '#1e3a8a' : '#ffffff',
                        }}>
                            {item.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};
