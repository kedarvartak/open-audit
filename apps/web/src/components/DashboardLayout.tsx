import { type ReactNode, useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    Home,
    LayoutDashboard,
    CalendarDays,
    Users,
    Settings,
    LogOut,
    Sun,
    Moon,
    ChevronDown,
    Building2,
    Check
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { workspacesAPI, type Workspace } from '../services/api';
import { PendingInvitationsModal } from './modals/PendingInvitationsModal';

interface DashboardLayoutProps {
    children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const location = useLocation();
    const navigate = useNavigate();
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName') || 'User';
    const userRole = localStorage.getItem('userRole') as 'CLIENT' | 'WORKER';
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);
    const { theme, toggleTheme } = useTheme();
    const profileRef = useRef<HTMLDivElement>(null);
    const workspaceRef = useRef<HTMLDivElement>(null);
    const [showInvitationsModal, setShowInvitationsModal] = useState(false);
    const [hasCheckedInvitations, setHasCheckedInvitations] = useState(false);

    // Get user initials from name/email
    const getUserInitials = (name: string) => {
        const parts = name.split(/[@\s]/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    // Fetch workspaces on mount (only for WORKER users)
    useEffect(() => {
        const fetchWorkspaces = async () => {
            try {
                const response = await workspacesAPI.getMyWorkspaces();
                setWorkspaces(response.data);
                // Set active workspace
                const activeId = localStorage.getItem('activeWorkspaceId');
                if (activeId) {
                    const active = response.data.find((w: Workspace) => w.id === activeId);
                    if (active) setActiveWorkspace(active);
                } else if (response.data.length > 0) {
                    setActiveWorkspace(response.data[0]);
                    localStorage.setItem('activeWorkspaceId', response.data[0].id);
                }
            } catch (error) {
                console.error('Failed to fetch workspaces:', error);
            }
        };
        if (token && userRole === 'WORKER') fetchWorkspaces();
    }, [token, userRole]);

    // Check for pending invitations on mount (once per session) - only for WORKER users
    useEffect(() => {
        const checkInvitations = async () => {
            if (hasCheckedInvitations) return;
            try {
                const response = await workspacesAPI.getPendingInvitations();
                if (response.data.length > 0) {
                    setShowInvitationsModal(true);
                }
            } catch (error) {
                console.error('Failed to check invitations:', error);
            } finally {
                setHasCheckedInvitations(true);
            }
        };
        if (token && userRole === 'WORKER') checkInvitations();
    }, [token, userRole, hasCheckedInvitations]);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
            if (workspaceRef.current && !workspaceRef.current.contains(event.target as Node)) {
                setIsWorkspaceOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('activeWorkspaceId');
        navigate('/login');
    };

    const handleSwitchWorkspace = async (workspace: Workspace) => {
        try {
            await workspacesAPI.setActiveWorkspace(workspace.id);
            setActiveWorkspace(workspace);
            localStorage.setItem('activeWorkspaceId', workspace.id);
            setIsWorkspaceOpen(false);
        } catch (error) {
            console.error('Failed to switch workspace:', error);
        }
    };

    // Filter menu items based on user role - Workspaces only for WORKER users
    const allMenuItems = [
        { icon: Home, path: '/dashboard', label: 'Dashboard' },
        { icon: LayoutDashboard, path: '/my-tasks', label: 'Team Tasks' },
        { icon: CalendarDays, path: '/calendar', label: 'Calendar' },
        { icon: Users, path: '/workspaces', label: 'Workspaces', workerOnly: true },
    ];

    const menuItems = allMenuItems.filter(item => !item.workerOnly || userRole === 'WORKER');

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

                    <div className="flex items-center gap-3">
                        {/* Workspace Dropdown - Only for WORKER users */}
                        {userRole === 'WORKER' && (
                            <div ref={workspaceRef} className="relative">
                                <button
                                    onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${theme === 'dark'
                                        ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <Building2 size={18} className="text-[#464ace]" />
                                    <span className="text-sm font-medium max-w-[150px] truncate">
                                        {activeWorkspace?.name || 'Select Workspace'}
                                    </span>
                                    <ChevronDown size={14} className={`transition-transform ${isWorkspaceOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Workspace Dropdown Menu */}
                                {isWorkspaceOpen && (
                                    <div className={`absolute right-0 top-full mt-2 w-72 rounded-xl shadow-lg border py-2 z-50 ${theme === 'dark'
                                        ? 'bg-slate-800 border-slate-700'
                                        : 'bg-white border-slate-200'
                                        }`}>
                                        <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wider ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                                            Switch Workspace
                                        </div>
                                        <div className="max-h-64 overflow-auto">
                                            {workspaces.map(workspace => (
                                                <button
                                                    key={workspace.id}
                                                    onClick={() => handleSwitchWorkspace(workspace)}
                                                    className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors ${theme === 'dark'
                                                        ? 'hover:bg-slate-700'
                                                        : 'hover:bg-slate-50'
                                                        }`}
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-[#464ace] flex items-center justify-center text-white font-bold text-sm">
                                                        {workspace.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="flex-1 text-left min-w-0">
                                                        <p className={`font-medium truncate ${theme === 'dark' ? 'text-slate-100' : 'text-slate-900'}`}>
                                                            {workspace.name}
                                                        </p>
                                                        <p className={`text-xs ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                                                            {workspace._count?.members || workspace.members?.length || 1} members
                                                        </p>
                                                    </div>
                                                    {activeWorkspace?.id === workspace.id && (
                                                        <Check size={16} className="text-[#464ace]" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                        <div className={`border-t mt-2 pt-2 ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'}`}>
                                            <Link
                                                to="/workspaces"
                                                onClick={() => setIsWorkspaceOpen(false)}
                                                className={`w-full px-3 py-2.5 flex items-center gap-3 transition-colors ${theme === 'dark'
                                                    ? 'text-[#464ace] hover:bg-slate-700'
                                                    : 'text-[#464ace] hover:bg-slate-50'
                                                    }`}
                                            >
                                                <Users size={16} />
                                                <span className="font-medium text-sm">Manage Workspaces</span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

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
                    </div>
                </header>

                {/* Page Content */}
                <main className={`flex-1 overflow-auto ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'}`}>
                    {children}
                </main>
            </div>

            {/* Pending Invitations Modal */}
            {showInvitationsModal && (
                <PendingInvitationsModal onClose={() => setShowInvitationsModal(false)} />
            )}
        </div >
    );
};
