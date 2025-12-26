import { Link, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, PlusCircle, Wallet, LogOut } from 'lucide-react';
import { Button } from './ui/Button';

const Navbar = () => {
    const navigate = useNavigate();
    const token = localStorage.getItem('token');

    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    return (
        <nav className="sticky top-0 z-50 w-full bg-[#e0e5ec]/80 backdrop-blur-md border-b border-white/20">
            <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/')}>
                    <div className="w-12 h-12 rounded-sm bg-[#e0e5ec] flex items-center justify-center text-[#6d5dfc] neu-flat group-hover:neu-pressed transition-all duration-300">
                        <span className="font-bold text-2xl">G</span>
                    </div>
                    <span className="text-2xl font-bold tracking-tight text-slate-700 neu-text">
                        GeoFund
                    </span>
                </div>
                <div className="flex items-center gap-6">
                    <Link to="/" className="flex items-center gap-3 text-slate-600 hover:text-[#6d5dfc] px-4 py-2 rounded-md transition-all font-semibold hover:neu-flat">
                        <LayoutDashboard size={20} />
                        <span>Projects</span>
                    </Link>
                    <Link to="/create" className="flex items-center gap-3 text-slate-600 hover:text-[#6d5dfc] px-4 py-2 rounded-md transition-all font-semibold hover:neu-flat">
                        <PlusCircle size={20} />
                        <span>Create</span>
                    </Link>
                    <div className="h-8 w-[2px] bg-slate-300/50 rounded-sm"></div>
                    <Button variant="default" size="default" className="gap-2 text-[#6d5dfc]">
                        <Wallet size={20} />
                        <span>Connect Wallet</span>
                    </Button>
                    {token && (
                        <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-red-400 hover:text-red-500 rounded-sm">
                            <LogOut size={20} />
                        </Button>
                    )}
                </div>
            </div>
        </nav>
    );
};

export const Layout = () => {
    return (
        <div className="min-h-screen bg-[#e0e5ec]">
            <Navbar />
            <main className="max-w-7xl mx-auto px-6 py-12">
                <Outlet />
            </main>
        </div>
    );
};
