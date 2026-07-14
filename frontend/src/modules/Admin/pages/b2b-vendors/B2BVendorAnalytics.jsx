import { useState, useEffect } from "react";
import { FiTrendingUp, FiUsers, FiPackage, FiDownload, FiMessageCircle, FiHome, FiLayers } from "react-icons/fi";
import { motion } from "framer-motion";
import TimePeriodFilter from "../../components/Analytics/TimePeriodFilter";
import B2BOnboardingTrendChart from "../../components/Analytics/B2BOnboardingTrendChart";
import B2BTransactionVolumeChart from "../../components/Analytics/B2BTransactionVolumeChart";
import api from "../../../../shared/utils/api";
import toast from "react-hot-toast";

const AdminB2BVendorAnalytics = () => {
    const [period, setPeriod] = useState("month");
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState([
        { label: "Total B2B Vendors", value: "0", trend: "0", icon: FiUsers, color: "blue" },
        { label: "Total Properties", value: "0", trend: "0%", icon: FiHome, color: "green" },
        { label: "Product Listings", value: "0", trend: "0", icon: FiPackage, color: "purple" },
        { label: "Lot Slots", value: "0", trend: "0%", icon: FiLayers, color: "orange" },
    ]);
    const [chartData, setChartData] = useState({
        onboardingTrend: [],
        transactionVolumeTrend: []
    });

    useEffect(() => {
        fetchAnalyticsData();
    }, [period]);

    const fetchAnalyticsData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/analytics/b2b-vendors', {
                params: { period }
            });

            if (response.success && response.data) {
                const { formatted, trends, charts } = response.data;

                const periodName = period === 'today' ? 'Today' : (period === 'week' ? 'this Week' : (period === 'year' ? 'this Year' : 'this Month'));

                setMetrics([
                    {
                        label: `B2B Vendors (${periodName})`,
                        value: formatted?.totalB2BVendors || "0",
                        trend: trends?.vendors || "0",
                        icon: FiUsers,
                        color: "blue"
                    },
                    {
                        label: `Properties Added (${periodName})`,
                        value: formatted?.totalProperties || "0",
                        trend: trends?.properties || "0",
                        icon: FiHome,
                        color: "green"
                    },
                    {
                        label: `Products Listed (${periodName})`,
                        value: formatted?.totalB2BProducts || "0",
                        trend: trends?.products || "0",
                        icon: FiPackage,
                        color: "purple"
                    },
                    {
                        label: `Lot Slots Booked (${periodName})`,
                        value: formatted?.totalLotSlots || "0",
                        trend: trends?.lotSlots || "0",
                        icon: FiLayers,
                        color: "orange"
                    },
                ]);

                // Set chart data
                setChartData({
                    onboardingTrend: charts?.onboardingTrend || [],
                    transactionVolumeTrend: charts?.transactionVolumeTrend || []
                });
            }
        } catch (error) {
            console.error('Error fetching B2B vendor analytics:', error);
            toast.error('Failed to load B2B vendor analytics');
        } finally {
            setLoading(false);
        }
    };

    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div></div>

                <div className="flex items-center gap-3">
                    <TimePeriodFilter selectedPeriod={period} onPeriodChange={setPeriod} isLoading={loading} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="animate-pulse">
                                <div className="h-10 bg-gray-200 rounded mb-4"></div>
                                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                                <div className="h-8 bg-gray-200 rounded"></div>
                            </div>
                        </div>
                    ))
                ) : (
                    metrics.map((m, i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <div className={`p-3 rounded-xl bg-${m.color}-50 text-${m.color}-600`}>
                                    <m.icon className="text-xl" />
                                </div>
                                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">{m.trend}</span>
                            </div>
                            <h3 className="text-gray-500 text-sm font-medium">{m.label}</h3>
                            <p className="text-2xl font-bold text-gray-800 mt-1">{m.value}</p>
                        </div>
                    ))
                )}
            </div>

            <div className="grid grid-cols-1 gap-6">
                {/* Made full width since we removed the volume chart for now */}
                <B2BOnboardingTrendChart data={chartData.onboardingTrend} period={period} />
                {/* 
                // Hidden until we have transaction data
                <B2BTransactionVolumeChart data={chartData.transactionVolumeTrend} period={period} /> 
                */}
            </div>
        </motion.div>
    );
};

export default AdminB2BVendorAnalytics;
