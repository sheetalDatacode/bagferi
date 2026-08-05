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

        const isExchangeOrderSelected = selectedOrder?.exchangeRequest?.status === 'Accepted';

        setVerifying(true);
        try {
            const endpoint = isExchangeOrderSelected
                ? `${API_BASE}/staff/orders/${selectedOrder._id}/verify-exchange`
                : `${API_BASE}/staff/orders/${selectedOrder._id}/verify-delivery`;

            const response = await axios.post(
                endpoint,
                { otp },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (response.data.success) {
                toast.success(isExchangeOrderSelected ? "✅ Exchange completed successfully!" : "✅ Order delivered successfully!");
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
    const exchangeDeliveries = orders.filter(o => o.exchangeRequest?.status === 'Accepted');
    const completedDeliveries = orders.filter(o => o.status === 'Completed' && (!o.exchangeRequest || o.exchangeRequest.status !== 'Accepted'));

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
                <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', background: 'white', marginBottom: '2rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                        <thead>
                            <tr style={{ background: '#f7fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase' }}>Order Info</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase' }}>Customer & Address</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase' }}>Collect</th>
                                <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingDeliveries.map(order => (
                                <tr 
                                    key={order._id} 
                                    style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }}
                                    onClick={() => { setSelectedOrder(order); setOtp(''); }}
                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                >
                                    <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                        <p style={{ margin: 0, fontWeight: '750', color: '#1a202c', fontSize: '0.875rem' }}>#{order.orderNumber}</p>
                                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#718096' }}>{order.items?.length || 0} item(s)</p>
                                    </td>
                                    <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                        <p style={{ margin: 0, fontWeight: '700', color: '#2d3748', fontSize: '0.875rem' }}>{order.shippingAddress?.fullName}</p>
                                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#718096', lineHeight: '1.4' }}>
                                            📍 {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city}
                                        </p>
                                    </td>
                                    <td style={{ padding: '1rem', verticalAlign: 'middle', fontWeight: '800', color: '#667eea', fontSize: '1rem' }}>
                                        ₹{order.remainingBalance !== undefined ? order.remainingBalance.toLocaleString('en-IN') : (order.totalAmount - (order.advancePayment || 0)).toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                                            {(order.shippingAddress?.phone || order.user?.phone) && (
                                                <a 
                                                    href={`tel:${order.shippingAddress?.phone || order.user?.phone}`}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '0.35rem',
                                                        background: '#ebf8ff',
                                                        color: '#2b6cb0',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '0.5rem',
                                                        textDecoration: 'none',
                                                        border: '1px solid #bee3f8'
                                                    }}
                                                >
                                                    📞 Call Customer
                                                </a>
                                            )}
                                            <button
                                                style={{
                                                    background: 'linear-gradient(135deg, #667eea, #764ba2)',
                                                    color: 'white',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '700',
                                                    padding: '0.4rem 0.8rem',
                                                    borderRadius: '0.5rem',
                                                    border: 'none',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Deliver
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Exchange Section */}
            {exchangeDeliveries.length > 0 && (
                <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#4c51bf', marginBottom: '1rem' }}>
                        🔄 Assigned Exchanges ({exchangeDeliveries.length})
                    </h2>
                    <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', background: 'white' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
                            <thead>
                                <tr style={{ background: '#f7fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase' }}>Order Info</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase' }}>Customer & Address</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase' }}>Exchange Details</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase', textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {exchangeDeliveries.map(order => (
                                    <tr 
                                        key={order._id} 
                                        style={{ borderBottom: '1px solid #e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }}
                                        onClick={() => { setSelectedOrder(order); setOtp(''); }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                            <p style={{ margin: 0, fontWeight: '750', color: '#1a202c', fontSize: '0.875rem' }}>#{order.orderNumber}</p>
                                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#718096' }}>{order.items?.length || 0} item(s)</p>
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                                            <p style={{ margin: 0, fontWeight: '700', color: '#2d3748', fontSize: '0.875rem' }}>{order.shippingAddress?.fullName}</p>
                                            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#718096', lineHeight: '1.4' }}>
                                                📍 {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city}
                                            </p>
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'middle', fontSize: '0.8rem', color: '#4a5568' }}>
                                            <div style={{ lineHeight: '1.4' }}>
                                                <p style={{ margin: 0 }}><strong>Current:</strong> {order.exchangeRequest?.currentSize} / {order.exchangeRequest?.currentColor}</p>
                                                <p style={{ margin: '0.2rem 0 0', color: '#4c51bf' }}><strong>New:</strong> {order.exchangeRequest?.expectedSize} / {order.exchangeRequest?.expectedColor}</p>
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', alignItems: 'center' }}>
                                                {(order.shippingAddress?.phone || order.user?.phone) && (
                                                    <a 
                                                        href={`tel:${order.shippingAddress?.phone || order.user?.phone}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '0.35rem',
                                                            background: '#ebf8ff',
                                                            color: '#2b6cb0',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '700',
                                                            padding: '0.4rem 0.8rem',
                                                            borderRadius: '0.5rem',
                                                            textDecoration: 'none',
                                                            border: '1px solid #bee3f8'
                                                        }}
                                                    >
                                                        📞 Call Customer
                                                    </a>
                                                )}
                                                <button
                                                    style={{
                                                        background: 'linear-gradient(135deg, #4c51bf, #667eea)',
                                                        color: 'white',
                                                        fontSize: '0.75rem',
                                                        fontWeight: '700',
                                                        padding: '0.4rem 0.8rem',
                                                        borderRadius: '0.5rem',
                                                        border: 'none',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Verify Exchange
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {completedDeliveries.length > 0 && (
                <div style={{ marginTop: '2rem' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1a202c', marginBottom: '1rem' }}>
                        ✅ Completed Today
                    </h2>
                    <div style={{ overflowX: 'auto', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', background: 'white' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '400px' }}>
                            <thead>
                                <tr style={{ background: '#f7fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase' }}>Order Number</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase' }}>Completed Time</th>
                                    <th style={{ padding: '0.75rem 1rem', fontSize: '0.8rem', fontWeight: '800', color: '#4a5568', textTransform: 'uppercase', textAlign: 'center' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {completedDeliveries.map(order => (
                                    <tr key={order._id} style={{ borderBottom: '1px solid #e2e8f0', opacity: 0.8 }}>
                                        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', fontWeight: '700', color: '#4a5568' }}>
                                            #{order.orderNumber}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', fontSize: '0.8rem', color: '#718096' }}>
                                            {new Date(order.updatedAt).toLocaleDateString('en-IN')} {new Date(order.updatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle', textAlign: 'center', color: '#38a169', fontWeight: '750', fontSize: '0.8rem' }}>
                                            ✓ Delivered
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* OTP Verification Modal */}
            {selectedOrder && (() => {
                const isExchangeOrderSelected = selectedOrder.exchangeRequest?.status === 'Accepted';
                return (
                    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem' }}>
                        <div style={{ background: 'white', width: '100%', maxWidth: '480px', borderRadius: '1.5rem 1.5rem 1rem 1rem', padding: '1.5rem', boxShadow: '0 -10px 40px rgba(0,0,0,0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1a202c' }}>
                                    {isExchangeOrderSelected ? 'Complete Product Exchange' : 'Complete Delivery'}
                                </h3>
                                <button onClick={() => setSelectedOrder(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#718096' }}>✕</button>
                            </div>

                            <div style={{ background: '#ebf8ff', border: '1px solid #bee3f8', borderRadius: '0.75rem', padding: '1rem', marginBottom: '1rem' }}>
                                <a 
                                    href={`tel:${selectedOrder?.shippingAddress?.phone || selectedOrder.user?.phone}`}
                                    style={{ margin: 0, fontWeight: '850', color: '#2b6cb0', fontSize: '1rem', textDecoration: 'underline', display: 'block' }}
                                >
                                    📞 Call Customer
                                </a>
                                <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#2c5282' }}>
                                    {isExchangeOrderSelected ? 'Ask the customer for their 4-digit Exchange OTP' : 'Ask the customer for their 4-digit Delivery OTP'}
                                </p>
                            </div>

                            {!isExchangeOrderSelected && (
                                <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <span style={{ fontWeight: '600', color: '#4a5568' }}>Collect from customer:</span>
                                    <span style={{ fontWeight: '800', fontSize: '1.25rem', color: '#667eea' }}>
                                        ₹{selectedOrder.remainingBalance !== undefined ? selectedOrder.remainingBalance.toLocaleString('en-IN') : (selectedOrder.totalAmount - (selectedOrder.advancePayment || 0)).toLocaleString('en-IN')}
                                    </span>
                                </div>
                            )}

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
                                    {verifying ? 'Verifying...' : (isExchangeOrderSelected ? '✓ Verify & Complete Exchange' : '✓ Verify & Complete Delivery')}
                                </button>
                            </form>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
}
