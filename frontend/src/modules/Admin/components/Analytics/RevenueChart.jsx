import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { formatCurrency, formatDate, getDateRange, filterByDateRange } from '../../utils/adminHelpers';

const RevenueChart = ({ data = [], period = 'month' }) => {
  const filteredData = useMemo(() => {
    if (!Array.isArray(data)) return [];
    const range = getDateRange(period);
    return filterByDateRange(data, range.start, range.end);
  }, [data, period]);

  const maxRevenue = Math.max(...filteredData.map((d) => d.revenue), 1);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-bold text-gray-800">Revenue Trend</h3>
          <p className="text-xs text-gray-500 font-medium">Monthly performance overview</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">Revenue</span>
          </div>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto scrollbar-hide md:pr-2">
        <div className="space-y-6">
          {filteredData.map((item, index) => {
            const percentage = (item.revenue / maxRevenue) * 100;

            return (
              <div key={index} className="group">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    {formatDate(item.date, { month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold text-blue-600">{formatCurrency(item.revenue)}</span>
                    <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors">
                      {item.orders} ORDERS
                    </span>
                  </div>
                </div>
                <div className="relative h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: index * 0.05 }}
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RevenueChart;

