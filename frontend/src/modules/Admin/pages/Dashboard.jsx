import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiUserCheck, FiPackage, FiHome, FiZap, FiImage,
  FiTrendingUp, FiTrendingDown, FiPhone, FiMessageCircle,
  FiAlertCircle, FiCheckCircle, FiClock, FiXCircle, FiUserPlus, FiVideo, FiBriefcase
} from 'react-icons/fi';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
// import { dashboardMockData } from '../config/dashboardMockData';
import api from "../../../shared/utils/api";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    summary: [],
    vendorDistribution: [],
    subscriptions: {
      product: { active: 0, expiringSoon: 0, expired: 0 },
      property: { active: 0, expiringSoon: 0, expired: 0 },
      banner: { active: 0, expiringSoon: 0, expired: 0 },
      lotSlot: { active: 0, expiringSoon: 0, expired: 0 }
    },
    listingHealth: {
      products: { total: 0, approved: 0, pending: 0, disabled: 0 },
      properties: { total: 0, approved: 0, pending: 0, disabled: 0 },
      lotSlots: { total: 0, approved: 0, pending: 0, disabled: 0 }
    },
    banners: { productBanners: 0, propertyBanners: 0, expiring7Days: 0 },
    interactions: { totalCalls: 0, totalWhatsApp: 0, topVendors: [] },
    performance: { topCategories: [], topLocations: [] }
  });

  const iconMap = {
    FiUsers: <FiUsers />,
    FiUserCheck: <FiUserCheck />,
    FiPackage: <FiPackage />,
    FiHome: <FiHome />,
    FiZap: <FiZap />,
    FiImage: <FiImage />,
    FiUserPlus: <FiUserPlus />,
    FiTrendingUp: <FiTrendingUp />,
    FiVideo: <FiVideo />,
    FiBriefcase: <FiBriefcase />,
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/admin/reports/dashboard-summary');
        if (response.success && response.data) {
          const apiData = response.data.summary;
          const vendorDist = response.data.vendorDistribution;

          setDashboardData({
            summary: [
              { label: 'Total Revenue', value: apiData.totalRevenue || 0, trend: '+24%', trendType: 'up', icon: 'FiTrendingUp', color: 'emerald', prefix: '₹', link: '/admin/transactions' },
              { label: 'Total Users', value: apiData.totalCustomers || 0, trend: '+15%', trendType: 'up', icon: 'FiUserPlus', color: 'indigo', link: '/admin/users' },
              { label: 'Total Vendors', value: apiData.totalVendors, trend: '+12%', trendType: 'up', icon: 'FiUsers', color: 'blue', link: '/admin/b2b-vendors/manage' },
              { label: 'Active Vendors', value: apiData.activeVendors, trend: '+5%', trendType: 'up', icon: 'FiUserCheck', color: 'green', link: '/admin/b2b-vendors/manage' },
              { label: 'Total Products', value: apiData.totalProducts, trend: '+18%', trendType: 'up', icon: 'FiPackage', color: 'purple', link: '/admin/b2b-vendors/products' },
              { label: 'Total Properties', value: apiData.totalProperties, trend: '+8%', trendType: 'up', icon: 'FiHome', color: 'orange', link: '/admin/b2b-vendors/properties' },
              { label: 'Lot Slots', value: apiData.totalLotSlots || 0, trend: '+15%', trendType: 'up', icon: 'FiZap', color: 'indigo', link: '/admin/b2b-vendors/lot-slots' },
              { label: 'Total Reels', value: apiData.totalReels || 0, trend: '+10%', trendType: 'up', icon: 'FiVideo', color: 'rose', link: '/admin/reels' },
              { label: 'Total Jobs', value: apiData.totalJobs || 0, trend: '+12%', trendType: 'up', icon: 'FiBriefcase', color: 'teal', link: '/admin/b2b-vendors/job-listings' },
              { label: 'Live Banners', value: apiData.activeBanners, trend: '-3%', trendType: 'down', icon: 'FiImage', color: 'pink', link: '/admin/b2b-vendors/banner-bookings' }
            ],
            vendorDistribution: vendorDist || [],
            paymentHistory: response.data.paymentHistory || [],
            revenueData: response.data.revenueData || [],
            subscriptions: {
              product: { active: apiData.activeProducts || 0 },
              property: { active: apiData.activeProperties || 0 },
              banner: { active: apiData.activeBanners || 0 },
              lotSlot: { active: apiData.activeLotSlots || 0 }
            },
            listingHealth: {
              products: { total: apiData.totalProducts, approved: apiData.activeProducts, pending: apiData.totalProducts - apiData.activeProducts, disabled: 0 },
              properties: { total: apiData.totalProperties, approved: apiData.activeProperties, pending: apiData.totalProperties - apiData.activeProperties, disabled: 0 },
              lotSlots: { total: apiData.totalLotSlots || 0, approved: apiData.activeLotSlots || 0, pending: (apiData.totalLotSlots || 0) - (apiData.activeLotSlots || 0), disabled: 0 },
              reels: { total: apiData.totalReels || 0, approved: apiData.activeReels || 0, pending: (apiData.totalReels || 0) - (apiData.activeReels || 0), disabled: 0 }
            },
            banners: {
              productBanners: Math.floor(apiData.activeBanners / 2),
              propertyBanners: Math.ceil(apiData.activeBanners / 2),
              expiring7Days: 5
            },
            interactions: {
              totalCalls: 1240,
              totalWhatsApp: 856,
              topVendors: [
                { name: 'RK Builders', calls: 120, wp: 45 },
                { name: 'Metro Real Estate', calls: 98, wp: 62 },
                { name: 'Global Traders', calls: 85, wp: 30 }
              ]
            },
            performance: {
              topCategories: response.data.performance?.topCategories || [],
              topLocations: response.data.performance?.topLocations || []
            }
          });
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const {
    summary, vendorDistribution, subscriptions,
    listingHealth,
    performance,
    paymentHistory,
    revenueData
  } = dashboardData;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8 p-2 lg:p-6 bg-gray-50/30 min-h-screen"
    >
      {/* Section 1: Top Summary Cards */}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summary.map((item, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => item.link && navigate(item.link)}
            className="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-100/50 cursor-pointer hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl mb-4 bg-${item.color}-50 text-${item.color}-600 group-hover:scale-110 transition-transform`}>
              {iconMap[item.icon]}
            </div>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{item.label}</p>
            <div className="flex items-end justify-between">
              <h3 className="text-2xl font-black text-gray-900">{item.prefix || ''}{item.value.toLocaleString()}</h3>
              <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full ${item.trendType === 'up' ? 'text-green-600 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {item.trendType === 'up' ? <FiTrendingUp /> : <FiTrendingDown />}
                {item.trend}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Section 2: Vendor Distribution */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 lg:col-span-1">
          <h3 className="text-lg font-black text-gray-900 mb-6">Vendor Distribution</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vendorDistribution}
                  innerRadius={70}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {vendorDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
            <div className="grid grid-cols-2 gap-3 mt-4 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
            {vendorDistribution.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || COLORS[i % COLORS.length] }}></div>
                <span className="text-xs font-bold text-gray-600 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Subscription Overview */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { title: 'Products', data: subscriptions.product, icon: <FiPackage />, color: 'blue' },
            { title: 'Properties', data: subscriptions.property, icon: <FiHome />, color: 'orange' },
            { title: 'Lot Slots', data: subscriptions.lotSlot, icon: <FiZap />, color: 'purple' },
            { title: 'Banners', data: subscriptions.banner, icon: <FiImage />, color: 'pink' },
          ].map((sub, i) => (
            <div key={i} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-2xl bg-${sub.color}-50 text-${sub.color}-600 text-lg`}>
                  {sub.icon}
                </div>
                <h4 className="font-black text-gray-800">{sub.title}</h4>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm font-bold">Active</span>
                  <span className="text-green-600 font-black">{sub.data?.active || 0}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Section 4: Listing Health */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 col-span-full">
          <h3 className="text-xl font-black text-gray-900 mb-8 border-b border-gray-50 pb-4">Listing Health Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Products */}
            <div className="space-y-6">
              <h4 
                onClick={() => navigate('/admin/b2b-vendors/products')}
                className="flex items-center gap-2 text-primary-600 font-black uppercase text-xs tracking-widest cursor-pointer hover:underline"
              >
                <FiPackage /> Products
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-blue-50/50 border border-blue-100">
                  <div className="text-blue-600 text-xs font-bold uppercase mb-1">Items</div>
                  <div className="text-xl font-black text-blue-900">{listingHealth.products.total.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-3xl bg-green-50/50 border border-green-100">
                  <div className="text-green-600 text-xs font-bold uppercase mb-1">Live</div>
                  <div className="text-xl font-black text-green-900">{listingHealth.products.approved.toLocaleString()}</div>
                </div>
              </div>
            </div>
            {/* Properties */}
            <div className="space-y-6">
              <h4 
                onClick={() => navigate('/admin/b2b-vendors/properties')}
                className="flex items-center gap-2 text-indigo-600 font-black uppercase text-xs tracking-widest cursor-pointer hover:underline"
              >
                <FiHome /> Properties
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100">
                  <div className="text-indigo-600 text-xs font-bold uppercase mb-1">Assets</div>
                  <div className="text-xl font-black text-indigo-900">{listingHealth.properties.total.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-3xl bg-green-50/50 border border-green-100">
                  <div className="text-green-600 text-xs font-bold uppercase mb-1">Live</div>
                  <div className="text-xl font-black text-green-900">{listingHealth.properties.approved.toLocaleString()}</div>
                </div>
              </div>
            </div>
            {/* Lot Slots */}
            <div className="space-y-6">
              <h4 
                onClick={() => navigate('/admin/b2b-vendors/lot-slots')}
                className="flex items-center gap-2 text-purple-600 font-black uppercase text-xs tracking-widest cursor-pointer hover:underline"
              >
                <FiZap /> Lot Slots
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-purple-50/50 border border-purple-100">
                  <div className="text-purple-600 text-xs font-bold uppercase mb-1">Listings</div>
                  <div className="text-xl font-black text-purple-900">{listingHealth.lotSlots.total.toLocaleString()}</div>
                </div>
                <div className="p-4 rounded-3xl bg-green-50/50 border border-green-100">
                  <div className="text-green-600 text-xs font-bold uppercase mb-1">Live</div>
                  <div className="text-xl font-black text-green-900">{listingHealth.lotSlots.approved.toLocaleString()}</div>
                </div>
              </div>
            </div>
            {/* Reels */}
            <div className="space-y-6">
              <h4 
                onClick={() => navigate('/admin/reels')}
                className="flex items-center gap-2 text-rose-600 font-black uppercase text-xs tracking-widest cursor-pointer hover:underline"
              >
                <FiVideo /> Reels
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-3xl bg-rose-50/50 border border-rose-100">
                  <div className="text-rose-600 text-xs font-bold uppercase mb-1">Total</div>
                  <div className="text-xl font-black text-rose-900">{listingHealth.reels?.total?.toLocaleString() || 0}</div>
                </div>
                <div className="p-4 rounded-3xl bg-green-50/50 border border-green-100">
                  <div className="text-green-600 text-xs font-bold uppercase mb-1">Approved</div>
                  <div className="text-xl font-black text-green-900">{listingHealth.reels?.approved?.toLocaleString() || 0}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Section 7: Performance Charts */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-gray-900 mb-6">Top Product Categories</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance.topCategories} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="views" fill="#3B82F6" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <h3 className="text-lg font-black text-gray-900 mb-6">Top Property Locations</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performance.topLocations} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#F9FAFB' }} />
                <Bar dataKey="views" fill="#8B5CF6" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue Performance Chart */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 col-span-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900">Revenue Performance</h3>
            <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-black uppercase tracking-wider">
              Last 6 Months
            </div>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 500 }}
                  tickFormatter={(value) => `₹${value.toLocaleString()}`}
                />
                <Tooltip
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`₹${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar
                  dataKey="revenue"
                  fill="#10B981"
                  radius={[8, 8, 0, 0]}
                  barSize={40}
                  animationBegin={200}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment History Table */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 col-span-full">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-black text-gray-900">Recent Payment History</h3>
            <button
              onClick={() => navigate('/admin/transactions')}
              className="text-primary-600 hover:text-primary-700 font-bold text-sm transition-colors"
            >
              View All Transactions
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest px-4">User/Vendor</th>
                  <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest px-4">Amount</th>
                  <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest px-4">Method</th>
                  <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest px-4">Date</th>
                  <th className="pb-4 text-xs font-black text-gray-400 uppercase tracking-widest px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory && paymentHistory.length > 0 ? (
                  paymentHistory.map((payment, idx) => (
                    <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="py-5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{payment.user}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{payment.userEmail}</span>
                        </div>
                      </td>
                      <td className="py-5 px-4">
                        <span className="font-black text-gray-900">₹{payment.amount?.toLocaleString()}</span>
                      </td>
                      <td className="py-5 px-4 text-sm text-gray-500 font-medium capitalize">
                        <span className={`px-2 py-1 rounded-xl text-[10px] font-black uppercase tracking-wide ${payment.type === 'subscription' ? 'bg-indigo-50 text-indigo-600' :
                            payment.type === 'banner' ? 'bg-amber-50 text-amber-600' :
                              'bg-rose-50 text-rose-600'
                          }`}>{payment.type}</span>
                      </td>
                      <td className="py-5 px-4 text-sm text-gray-500 font-medium">
                        {new Date(payment.date).toLocaleDateString()}
                      </td>
                      <td className="py-5 px-4 text-right">
                        <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-600">
                          Paid
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-gray-400 font-bold">No payment history found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;

