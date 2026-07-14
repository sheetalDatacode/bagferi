import { FiShoppingBag, FiUsers } from 'react-icons/fi';
import { IndianRupee } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatPrice } from '../../../../shared/utils/helpers';

const StatsCards = ({ stats }) => {
  // Helper to find stat by label
  const getStat = (label) => {
    // If stats is an array (new backend format), find by label
    if (Array.isArray(stats)) {
      return stats.find(s => s.label === label) || {};
    }
    // Fallback for object format (if any legacy code remains)
    return {};
  };

  const revenueStat = getStat('Total Revenue');
  const ordersStat = getStat('Total Orders');
  const customersStat = getStat('Total Customers');
  const platformStat = getStat('Platform Earnings');

  const cards = [
    {
      title: 'Total Revenue',
      value: formatPrice(revenueStat.value || 0),
      change: revenueStat.trend || 0,
      icon: IndianRupee,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-green-500 to-emerald-600',
      cardBg: 'bg-gradient-to-br from-green-50 to-emerald-50',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Total Orders',
      value: (ordersStat.value || 0).toLocaleString(),
      change: ordersStat.trend || 0,
      icon: FiShoppingBag,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-blue-500 to-indigo-600',
      cardBg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Total Customers',
      value: (customersStat.value || 0).toLocaleString(),
      change: customersStat.trend || 0,
      icon: FiUsers,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-orange-500 to-amber-600',
      cardBg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      iconBg: 'bg-white/20',
    },
    {
      title: 'Platform Earnings',
      value: formatPrice(platformStat.value || 0),
      change: platformStat.trend || 0,
      icon: IndianRupee,
      color: 'text-white',
      bgColor: 'bg-gradient-to-br from-purple-500 to-violet-600',
      cardBg: 'bg-gradient-to-br from-purple-50 to-violet-50',
      iconBg: 'bg-white/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        const isPositive = card.change >= 0;

        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className={`${card.cardBg} rounded-2xl p-5 lg:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 relative overflow-hidden group`}
          >
            {/* Decorative gradient overlay */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${card.bgColor} opacity-[0.03] rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-500`}></div>

            <div className="flex items-start justify-between relative z-10 mb-4">
              <div className={`${card.bgColor} p-3 rounded-xl shadow-lg shadow-blue-500/10`}>
                <Icon className="text-white text-xl" />
              </div>
              <div
                className={`text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
              >
                {isPositive ? '↑' : '↓'}
                {Math.abs(card.change)}%
              </div>
            </div>

            <div className="relative z-10">
              <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">{card.title}</h3>
              <div className="flex items-baseline gap-2">
                <p className="text-gray-900 text-2xl font-extrabold tracking-tight">{card.value}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default StatsCards;

