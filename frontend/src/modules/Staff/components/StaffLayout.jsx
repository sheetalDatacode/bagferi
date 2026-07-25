import { Outlet, useNavigate } from 'react-router-dom';
import { useStaffAuthStore } from '../store/staffAuthStore';

export default function StaffLayout() {
    const { staff, logout } = useStaffAuthStore();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/staff/login');
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f7fafc', display: 'flex', flexDirection: 'column' }}>
            {/* Header */}
            <header style={{
                background: 'white',
                borderBottom: '1px solid #e2e8f0',
                padding: '0.75rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: '700', fontSize: '1rem'
                    }}>
                        {staff?.name?.charAt(0) || 'S'}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: '700', color: '#1a202c', lineHeight: 1.2 }}>
                            {staff?.name || 'Staff'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#718096' }}>Delivery Partner</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: '0.5rem 1rem',
                        background: '#fff5f5',
                        color: '#e53e3e',
                        border: '1px solid #fed7d7',
                        borderRadius: '0.5rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                    }}
                >
                    Logout
                </button>
            </header>

            {/* Main Content */}
            <main style={{ flex: 1, overflowY: 'auto', padding: '1rem', maxWidth: '480px', margin: '0 auto', width: '100%' }}>
                <Outlet />
            </main>
        </div>
    );
}
