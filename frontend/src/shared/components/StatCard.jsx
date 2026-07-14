import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { FiArrowRight } from "react-icons/fi";

const StatCard = ({
  icon: Icon,
  label,
  value,
  color = "bg-blue-500",
  bgColor = "bg-blue-50",
  textColor = "text-blue-700",
  link,
  onClick
}) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (link) {
      navigate(link);
    }
  };

  // Check if we are using the vibrant style (gradient background)
  const isVibrant = bgColor.includes('gradient');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className={`relative overflow-hidden ${bgColor} rounded-2xl p-5 shadow-sm border border-black/5 cursor-pointer transition-all duration-300 ${link || onClick ? 'hover:shadow-lg' : ''
        }`}>

      {/* Background Decorative Circle */}
      {isVibrant && (
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
      )}

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className={`${color === 'white/20' ? 'bg-white/20' : color} p-2.5 rounded-xl shadow-sm backdrop-blur-sm`}>
          <Icon className="text-white text-xl" />
        </div>
        {(link || onClick) && (
          <div className={`p-1.5 rounded-full ${isVibrant ? 'bg-white/20' : 'bg-gray-100'}`}>
            <FiArrowRight className={isVibrant ? 'text-white' : textColor} size={14} />
          </div>
        )}
      </div>

      <div className="relative z-10">
        <h3 className={`${isVibrant ? 'text-blue-900/70 font-bold' : textColor + ' opacity-70'} text-[11px] uppercase tracking-wider mb-1`}>
          {label}
        </h3>
        <p className={`${isVibrant ? 'text-blue-950' : textColor} text-2xl font-black tracking-tight`}>
          {value}
        </p>
      </div>
    </motion.div>
  );
};

export default StatCard;

