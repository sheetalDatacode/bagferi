import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';

const B2BTransactionVolumeChart = ({ data = [], period = 'month' }) => {
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      // Generate empty data for the period
      const days = period === 'year' ? 12 : period === 'month' ? 30 : 7;
      return Array.from({ length: days }, (_, i) => ({
        date: `Day ${i + 1}`,
        volume: 0
      }));
    }
    
    return data.map(item => ({
      date: item.date || item._id || '',
      volume: item.volume || item.value || 0
    }));
  }, [data, period]);

  const formatCurrency = (value) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(1)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (value >= 1000) {
      return `₹${(value / 1000).toFixed(1)}K`;
    }
    return `₹${value}`;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="text-sm font-semibold text-gray-800 mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">Volume:</span> {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasData = chartData.some(item => item.volume > 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-200 h-full flex flex-col"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-gray-800">B2B Transaction Volume</h3>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Revenue generated over time</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"></div>
          <span className="text-xs text-gray-600">Volume</span>
        </div>
      </div>
      <div className="flex-1 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%" minHeight={250}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.8} />
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
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="volume"
                fill="url(#colorVolume)"
                radius={[8, 8, 0, 0]}
                name="Volume"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p className="text-sm">No transaction data available</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default B2BTransactionVolumeChart;
