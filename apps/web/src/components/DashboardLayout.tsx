import { type ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Home,
    LayoutDashboard,
    Grid3x3,
    FileText,
    Trophy,
    Users,
    Printer,
    Share2,
    Settings,
    LogOut,
    User,
    Sparkles,
    Sun,
    Moon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardLayoutProps {
    children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const { theme, toggleTheme } = useTheme();

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const menuItems = [
        { icon: Home, path: '/dashboard', label: 'Dashboard' },
        { icon: LayoutDashboard, path: '/my-tasks', label: 'My Tasks' },
        { icon: Grid3x3, path: '/projects', label: 'Projects' },
        { icon: FileText, path: '/documents', label: 'Documents' },
        { icon: Trophy, path: '/achievements', label: 'Achievements' },
        { icon: Users, path: '/team', label: 'Team' },
        { icon: Printer, path: '/reports', label: 'Reports' },
        { icon: Share2, path: '/share', label: 'Share' },
    ];

    return (
        <div className={`flex h-screen ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'}`}>
            {/* Sidebar */}
            <aside
                className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-r flex flex-col py-6 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-56' : 'w-16'
                    }`}
                onMouseEnter={() => setIsSidebarExpanded(true)}
                onMouseLeave={() => setIsSidebarExpanded(false)}
            >
                {/* Logo */}
                <div className={`flex items-center mb-6 px-3 ${isSidebarExpanded ? 'justify-start gap-3' : 'justify-center'}`}>
                    <Sparkles size={24} className={`${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'} flex-shrink-0`} />
                    {isSidebarExpanded && (
                        <span className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} whitespace-nowrap`}>Open-Audit</span>
                    )}
                </div>

                {/* Menu Items */}
                <nav className="flex flex-col gap-2 flex-1 px-3">
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all ${isActive
                                    ? theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                                    : theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                                    } ${!isSidebarExpanded ? 'justify-center' : ''}`}
                            >
                                <Icon size={20} className="flex-shrink-0" />
                                {isSidebarExpanded && (
                                    <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Theme Toggle & Settings */}
                <div className="px-3 space-y-2">
                    <button
                        onClick={toggleTheme}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            } ${!isSidebarExpanded ? 'justify-center' : ''}`}
                    >
                        {theme === 'dark' ? <Sun size={20} className="flex-shrink-0" /> : <Moon size={20} className="flex-shrink-0" />}
                        {isSidebarExpanded && (
                            <span className="text-sm font-medium whitespace-nowrap">
                                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                            </span>
                        )}
                    </button>
                    <button
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            } ${!isSidebarExpanded ? 'justify-center' : ''}`}
                    >
                        <Settings size={20} className="flex-shrink-0" />
                        {isSidebarExpanded && (
                            <span className="text-sm font-medium whitespace-nowrap">Settings</span>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className={`h-16 ${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-b px-8 flex items-center justify-between`}>
                    <h1 className={`text-xl font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        Welcome <span className={theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}>Super_admin</span>
                    </h1>

                    <div className="flex items-center gap-4">
                        <span className={`px-4 py-1.5 ${theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'} rounded-md text-sm font-semibold`}>
                            Super Admin
                        </span>

                        <button className={`w-9 h-9 rounded-sm ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-200 hover:bg-slate-300'} flex items-center justify-center transition-colors`}>
                            <User size={18} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} />
                        </button>

                        {token && (
                            <button
                                onClick={handleLogout}
                                className={`p-2 ${theme === 'dark' ? 'text-slate-400 hover:text-red-400' : 'text-slate-500 hover:text-red-600'} transition-colors`}
                                title="Logout"
                            >
                                <LogOut size={20} />
                            </button>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
};
