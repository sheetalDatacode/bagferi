import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import { createPortal } from 'react-dom';
import Button from './Button';
import { useScrollLock } from '../../../shared/hooks/useScrollLock';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', type = 'danger' }) => {
  useScrollLock(isOpen);
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');
  
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: 'text-red-600',
      variant: 'danger',
    },
    warning: {
      icon: 'text-orange-600',
      variant: 'danger', // Using danger variant for warning as well
    },
    info: {
      icon: 'text-blue-600',
      variant: 'primary',
    },
  };

  const styles = typeStyles[type] || typeStyles.danger;
  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center pointer-events-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 pointer-events-auto"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-[2.5rem] shadow-2xl max-w-[90%] w-[400px] p-8 sm:p-10 relative pointer-events-auto border border-gray-100 m-4"
          >
            {/* Close Button */}
            <Button
              onClick={onClose}
              variant="icon"
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <FiX className="text-xl" />
            </Button>

            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
                type === 'danger' ? 'bg-red-50' : type === 'warning' ? 'bg-orange-50' : 'bg-blue-50'
              }`}>
                <FiAlertTriangle className={`text-3xl ${styles.icon}`} />
              </div>
            </div>

            {/* Title */}
            {title && (
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 text-center mb-3 uppercase tracking-tight leading-tight">
                {title}
              </h3>
            )}

            {/* Message */}
            <p className="text-sm sm:text-base text-gray-500 font-bold text-center mb-10 leading-relaxed">
              {message}
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={onClose}
                variant="secondary"
                className="flex-1 py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] border-2 border-gray-100"
              >
                {cancelText}
              </Button>
              <Button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                variant={styles.variant}
                className="flex-1 py-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-red-200"
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmModal;

