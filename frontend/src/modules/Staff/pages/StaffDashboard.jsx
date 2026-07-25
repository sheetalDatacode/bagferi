import { useState, useEffect } from 'react';
import axios from 'axios';
import { useStaffAuthStore } from '../store/staffAuthStore';
import toast from 'react-hot-toast';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export default function StaffDashboard() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [otp, setOtp] = useState('');
    const [verifying, setVerifying] = useState(false);
    const { token } = useStaffAuthStore();

    const fetchOrders = async () => {
        try {
            const response = await axios.get(`${API_BASE}/staff/orders`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.data.success) {
                setOrders(response.data.data);
            }
        } catch (error) {
            toast.error("Failed to fetch assigned orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 4) {
            toast.error("Please enter the 4-digit OTP");
            return;
        }

        setVerifying(true);
        try {
            const response = await axios.post(
                `${API_BASE}/staff/orders/${selectedOrder._id}/verify-delivery`,
                { otp },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                toast.success("✅ Order delivered successfully!");
                setSelectedOrder(null);
                setOtp('');
                fetchOrders();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "Invalid OTP. Please try again.");
        } finally {
            setVerifying(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTop: '4px solid #667eea', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const pendingDeliveries = orders.filter(o => o.status === 'Dispatched');
    const completedDeliveries = orders.filter(o => o.status === 'Completed');

    const card = { background: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', padding: '1rem', marginBottom: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

    return (
        <div style={{ paddingBottom: '5rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1a202c', marginBottom: '1rem' }}>
                📦 Pending Deliveries ({pendingDeliveries.length})
            </h2>

            {pendingDeliveries.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', padding: '2rem', borderStyle: 'dashed' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🎉</div>
                    <p style={{ color: '#718096', margin: 0 }}>No pending deliveries assigned to you.</p>
                </div>
            ) : (
                pendingDeliveries.map(order => (
                    <div
                        key={order._id}
                        style={{ ...card, cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                        onClick={() => { setSelectedOrder(order); setOtp(''); }}
                        onMouseEnter={(e) => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.12)'}
                        onMouseLeave={(e) => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.06)'}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                                <p style={{ margin: 0, fontWeight: '700', color: '#1a202c' }}>Order #{order.orderNumber}</p>
                                <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096', marginTop: '0.2rem' }}>{order.items?.length || 0} item(s)</p>
                            </div>
                            <span style={{ background: '#ebf8ff', color: '#2b6cb0', fontSize: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '999px', fontWeight: '700' }}>
                                To Deliver
                            </span>
                        </div>

                        <div style={{ fontSize: '0.875rem', color: '#4a5568', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                                <span>📍</span>
                                <span>
                                    {order.shippingAddress?.fullName} — {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city}
                                </span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.875rem', color: '#718096', fontWeight: '600' }}>Collect:</span>
                            <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#667eea' }}>
                                ₹{order.paymentMethod === 'COD' ? order.totalAmount?.toLocaleString('en-IN') : 0}
                            </span>
                        </div>
                    </div>
                ))
            )}

            {completedDeliveries.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1a202c', marginBottom: '1rem' }}>
                        ✅ Completed Today
                    </h2>
                    {completedDeliveries.map(order => (
                        <div key={order._id} style={{ ...card, opacity: 0.65 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '700', color: '#4a5568' }}>Order #{order.orderNumber}</p>
                                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#718096' }}>{new Date(order.updatedAt).toLocaleDateString('en-IN')}</p>
                                </div>
                                <span style={{ color: '#38a169', fontWeight: '700', fontSize: '0.875rem' }}>✓ Delivered</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* OTP Verification Modal */}
            {selectedOrder && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem' }}>
                    <div style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '1.5rem 1.5rem 1rem 1rem', padding: '1.5rem', boxShadow: '0 -10px 40px rgba(0,0,0,0.2)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1a202c' }}>Complete Delivery</h3>
                            <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#718096' }}>✕</button>
                        </div>

                        <div style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem' }}>
                            <p style={{ margin: 0, fontWeight: '700', color: '#2b6cb0', fontSize: '0.9rem' }}>
                                📞 {selectedOrder?.shippingAddress?.phone || selectedOrder.user?.phone}
                            </p>
                            <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#2c5282' }}>
                                Ask the customer for their 4-digit Delivery OTP
                            </p>
                        </div>

                        <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <span style={{ fontWeight: '600', color: '#4a5568' }}>Collect from customer:</span>
                            <span style={{ fontWeight: '800', fontSize: '1.25rem', color: '#667eea' }}>
                                ₹{selectedOrder.paymentMethod === 'COD' ? selectedOrder.totalAmount?.toLocaleString('en-IN') : 0}
                            </span>
                        </div>

                        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#4a5568', marginBottom: '0.5rem', textAlign: 'center' }}>
                                    Enter 4-Digit OTP
                                </label>
                                <input
                                    type="text"
                                    maxLength="4"
                                    placeholder="- - - -"
                                    style={{
                                        width: '100%',
                                        textAlign: 'center',
                                        fontSize: '2.5rem',
                                        letterSpacing: '0.5rem',
                                        fontWeight: '900',
                                        padding: '1rem',
                                        borderRadius: '0.75rem',
                                        border: '2px solid #e2e8f0',
                                        outline: 'none',
                                        boxSizing: 'border-box',
                                        color: '#1a202c'
                                    }}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    autoFocus
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={verifying || otp.length !== 4}
                                style={{
                                    width: '100%',
                                    padding: '1rem',
                                    background: verifying || otp.length !== 4 ? '#a0aec0' : 'linear-gradient(135deg, #667eea, #764ba2)',
                                    color: 'white',
                                    fontWeight: '800',
                                    fontSize: '1rem',
                                    border: 'none',
                                    borderRadius: '0.75rem',
                                    cursor: verifying || otp.length !== 4 ? 'not-allowed' : 'pointer',
                                }}
                            >
                                {verifying ? 'Verifying...' : '✓ Verify & Complete Delivery'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
