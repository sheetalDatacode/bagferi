import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useStaffAuthStore } from '../store/staffAuthStore';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export default function StaffLogin() {
    const [mobile, setMobile] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useStaffAuthStore();

    const handleLogin = async (e) => {
        e.preventDefault();
        if (mobile.length !== 10) {
            toast.error("Please enter a valid 10-digit mobile number");
            return;
        }

        setLoading(true);
        try {
            const response = await axios.post(`${API_BASE}/staff-auth/login`, { mobile });
            if (response.data.success) {
                const { user, token } = response.data;
                login(user, token);
                toast.success("Login successful!");
                navigate('/staff/dashboard');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Login failed. Check your mobile number.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div style={{ maxWidth: '400px', width: '100%', background: 'white', borderRadius: '1.5rem', padding: '2rem', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', fontSize: '1.75rem' }}>
                        📦
                    </div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1a202c', margin: 0 }}>Delivery Partner</h1>
                    <p style={{ color: '#718096', marginTop: '0.5rem', fontSize: '0.9rem' }}>Login to manage your deliveries</p>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#4a5568', marginBottom: '0.5rem' }}>
                            Registered Mobile Number
                        </label>
                        <input
                            type="tel"
                            maxLength="10"
                            placeholder="Enter your 10-digit number"
                            style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                            value={mobile}
                            onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                            required
                            onFocus={(e) => e.target.style.borderColor = '#667eea'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || mobile.length !== 10}
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            background: loading || mobile.length !== 10 ? '#a0aec0' : 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white',
                            fontWeight: '700',
                            fontSize: '1rem',
                            border: 'none',
                            borderRadius: '0.75rem',
                            cursor: loading || mobile.length !== 10 ? 'not-allowed' : 'pointer',
                            transition: 'opacity 0.2s',
                        }}
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', borderTop: '1px solid #edf2f7', paddingTop: '1.25rem', textAlign: 'center' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/b2b-vendor/login')}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            background: '#f7fafc',
                            color: '#4a5568',
                            border: '1px solid #e2e8f0',
                            borderRadius: '0.5rem',
                            padding: '0.5rem 1rem',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        💼 Login as Vendor
                    </button>
                </div>
            </div>
        </div>
    );
}
