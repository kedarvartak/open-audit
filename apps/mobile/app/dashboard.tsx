import { View, Text } from 'react-native';
import { AuthLayout } from '../components/AuthLayout';

export default function Dashboard() {
    return (
        <AuthLayout title="Dashboard" subtitle="Welcome to your dashboard">
            <View>
                <Text className="text-center text-slate-500">
                    Dashboard content coming soon...
                </Text>
            </View>
        </AuthLayout>
    );
}
