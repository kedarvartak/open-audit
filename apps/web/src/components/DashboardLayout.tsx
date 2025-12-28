import { type ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Home,
    LayoutDashboard,
    CalendarDays,
    FileText,
    Trophy,
    Users,
    Printer,
    Share2,
    Settings,
    LogOut,
    Sun,
    Moon,
    ChevronDown
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface DashboardLayoutProps {
    children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName') || 'User';
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const { theme, toggleTheme } = useTheme();
    const profileRef = useRef<HTMLDivElement>(null);

    // Get user initials from name/email
    const getUserInitials = (name: string) => {
        const parts = name.split(/[@\s]/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const menuItems = [
        { icon: Home, path: '/dashboard', label: 'Dashboard' },
        { icon: LayoutDashboard, path: '/my-tasks', label: 'My Tasks' },
        { icon: CalendarDays, path: '/calendar', label: 'Calendar' },
        { icon: FileText, path: '/documents', label: 'Documents' },
        { icon: Trophy, path: '/achievements', label: 'Achievements' },
        { icon: Users, path: '/team', label: 'Team' },
        { icon: Printer, path: '/reports', label: 'Reports' },
        { icon: Share2, path: '/share', label: 'Share' },
    ];

    return (
        <div className={`flex h-screen ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
            {/* Sidebar */}
            <aside
                className={`${theme === 'dark' ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-200'} border-r flex flex-col py-6 transition-all duration-300 ease-in-out ${isSidebarExpanded ? 'w-56' : 'w-16'
                    }`}
                onMouseEnter={() => setIsSidebarExpanded(true)}
                onMouseLeave={() => setIsSidebarExpanded(false)}
            >
                {/* Logo */}
                <div className={`flex items-center mb-6 px-3 ${isSidebarExpanded ? 'justify-start gap-3' : 'justify-center'}`}>
                    <img
                        src="/logo.svg"
                        alt="Logo"
                        className="flex-shrink-0"
                        style={{ width: '40px', height: '40px' }}
                    />
                    {isSidebarExpanded && (
                        <span className={`text-lg font-bold ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'} whitespace-nowrap`}>Open Audit</span>
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
                                    ? 'bg-[#464ace] text-white'
                                    : theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
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
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
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
                        className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md transition-all ${theme === 'dark' ? 'text-slate-400 hover:text-slate-100 hover:bg-slate-800' : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200'
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
                    <h1 className={`text-xl font-medium ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                        Welcome <span className={theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}>{userName.split('@')[0]}</span>
                    </h1>

                    {/* Profile Dropdown */}
                    <div ref={profileRef} className="relative">
                        <button
                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-full transition-colors ${theme === 'dark'
                                ? 'hover:bg-slate-800'
                                : 'hover:bg-slate-100'
                                }`}
                        >
                            <div className="w-9 h-9 rounded-full bg-[#464ace] flex items-center justify-center text-white font-semibold text-sm">
                                {getUserInitials(userName)}
                            </div>
                            <ChevronDown size={16} className={`transition-transform ${isProfileOpen ? 'rotate-180' : ''} ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isProfileOpen && (
                            <div className={`absolute right-0 top-full mt-2 w-64 rounded-xl shadow-lg border py-2 z-50 ${theme === 'dark'
                                ? 'bg-slate-800 border-slate-700'
                                : 'bg-white border-slate-200'
                                }`}>
                                {/* User Info */}
                                <div className="px-4 py-3 flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#464ace] flex items-center justify-center text-white font-semibold">
                                        {getUserInitials(userName)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-semibold truncate ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                            {userName.includes('@') ? userName.split('@')[0] : userName}
                                        </p>
                                        <p className={`text-sm truncate ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                            {userName.includes('@') ? userName : ''}
                                        </p>
                                    </div>
                                </div>

                                {/* Divider */}
                                <div className={`my-2 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`} />

                                {/* Logout */}
                                {token && (
                                    <button
                                        onClick={handleLogout}
                                        className={`w-full px-4 py-2.5 flex items-center gap-3 transition-colors ${theme === 'dark'
                                            ? 'text-red-400 hover:bg-slate-700'
                                            : 'text-red-600 hover:bg-red-50'
                                            }`}
                                    >
                                        <LogOut size={18} />
                                        <span className="font-medium">Log Out</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className={`flex-1 overflow-auto ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    {children}
                </main>
            </div>
        </div >
    );
};
