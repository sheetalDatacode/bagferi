import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { FiHome, FiGrid, FiBriefcase, FiVideo, FiUser } from 'react-icons/fi';
import { useAuthStore } from '../../../../shared/store/authStore';

const B2BBottomNav = () => {
    const { isAuthenticated } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { icon: FiHome, label: 'Home', path: '/b2b/landing', requireAuth: false },
        { icon: FiVideo, label: 'Reels', path: '/b2b/reels', requireAuth: false },
        { icon: FiGrid, label: 'Browse', path: '/b2b/catalog?open=categories', requireAuth: false },
        { icon: FiBriefcase, label: 'Business', path: '/b2b/catalog?open=business', requireAuth: false },
        { icon: FiUser, label: 'Profile', path: '/b2b/profile', requireAuth: true },
    ];

    const handleNavClick = (e, item) => {
        if (item.requireAuth && !isAuthenticated) {
            e.preventDefault();
            navigate('/b2b/login', { state: { from: { pathname: item.path } } });
        }
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-[100] lg:hidden pb-safe shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
            <div className="flex justify-around items-center h-16">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path.split('?')[0] &&
                        (item.path.includes('?') ? location.search.includes(item.path.split('?')[1]) : location.search === '');
                    const isReels = item.label === 'Reels';

                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/b2b/landing'}
                            onClick={(e) => handleNavClick(e, item)}
                            className={`
                                flex flex-col items-center gap-1 transition-all flex-1 py-2 relative group
                                ${isActive ? 'text-primary-600' : (isReels ? 'text-primary-500' : 'text-gray-400')}
                            `}
                        >
                            {/* Special background for Reels to make it stand out - More colorful gradient */}
                            {isReels && (
                                <div className={`
                                    absolute inset-x-1 inset-y-1 rounded-xl -z-10 transition-all duration-500
                                    ${isActive
                                        ? 'bg-gradient-to-br from-primary-100 via-purple-100 to-pink-100 shadow-[0_0_20px_rgba(124,58,237,0.2)]'
                                        : 'bg-gradient-to-br from-primary-50 via-purple-50 to-pink-50 group-hover:from-primary-100 group-hover:via-purple-100 group-hover:to-pink-100 shadow-[0_0_15px_rgba(124,58,237,0.1)]'}
                                `} />
                            )}

                            <item.icon className={`
                                text-xl transition-all duration-300
                                ${isActive ? 'scale-110 text-primary-600' : (isReels ? 'scale-110 text-indigo-600 group-hover:scale-125 drop-shadow-[0_0_8px_rgba(124,58,237,0.4)]' : 'group-hover:scale-110')}
                                ${isReels && !isActive ? 'animate-pulse text-purple-600' : ''}
                            `} />

                            <span className={`
                                text-[10px] font-black uppercase tracking-tight text-center transition-all duration-300
                                ${isActive ? 'text-primary-700 opacity-100' : (isReels ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-100' : 'opacity-70 group-hover:opacity-100')}
                            `}>
                                {item.label}
                            </span>

                            {/* Subtle indicator for Reels */}
                            {isReels && !isActive && (
                                <div className="absolute top-2 right-1/2 translate-x-4 w-1 h-1 rounded-full bg-primary-500" />
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
};

export default B2BBottomNav;
