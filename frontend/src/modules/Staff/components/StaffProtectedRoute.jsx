import { Navigate, Outlet } from 'react-router-dom';
import { useStaffAuthStore } from '../store/staffAuthStore';

export default function StaffProtectedRoute({ children }) {
    const { isAuthenticated } = useStaffAuthStore();

    if (!isAuthenticated) {
        return <Navigate to="/staff/login" replace />;
    }

    return children ? children : <Outlet />;
}
