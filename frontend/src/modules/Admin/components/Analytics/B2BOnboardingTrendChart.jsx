import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { motion } from 'framer-motion';

const B2BOnboardingTrendChart = ({ data = [], period = 'month' }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate empty data for the period
      const days = period === 'year' ? 12 : period === 'month' ? 30 : 7;
      return Array.from({ length: days }, (_, i) => ({
        date: `Day ${i + 1}`,
        value: 0
      }));
    }
    
    return data.map(item => ({
      date: item.date || item._id || '',
      value: item.value || item.count || 0
    }));
  }, [data, period]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">Vendors:</span> {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasData = chartData.some(item => item.value > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800">B2B Vendor Onboarding Trend</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">New vendor registrations over time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"></div>
          <span className="text-xs text-gray-600">Vendors</span>
        </div>
      </div>
      <div className="flex-1 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={250}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVendors" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                stroke="#6b7280"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="url(#colorVendors)"
                name="Vendors"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">No onboarding data available</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default B2BOnboardingTrendChart;
