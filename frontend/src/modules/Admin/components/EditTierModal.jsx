import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import Button from './Button';
import toast from 'react-hot-toast';
import api from '../../../shared/utils/api';

const EditTierModal = ({ isOpen, onClose, tier, onSuccess }) => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith('/app');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceMonthly: 0,
    reelLimit: 0,
    extraReelPrice: 10,
    isActive: true,
    features: [],
  });

  const [loading, setLoading] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  useEffect(() => {
    if (isOpen && tier) {
      // Handle both backend format (features as objects) and frontend format (features as strings)
      const features = tier.features?.map(f => 
        typeof f === 'string' ? f : f.name || ''
      ) || [];
      
      setFormData({
        name: tier.name || '',
        description: tier.description || '',
        priceMonthly: tier.priceMonthly || 0,
        reelLimit: tier.reelLimit ?? 0,
        extraReelPrice: tier.extraReelPrice || 10,
        isActive: tier.isActive !== undefined ? tier.isActive : true,
        features: features,
      });
      setNewFeature('');
    }
  }, [isOpen, tier]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'priceMonthly' || name === 'reelLimit' || name === 'extraReelPrice' ? parseFloat(value) || 0 : value)
    }));
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Tier name is required');
      return;
    }

    if (formData.priceMonthly < 0) {
      toast.error('Price cannot be negative');
      return;
    }

    if (formData.features.length === 0) {
      toast.error('At least one feature is required');
      return;
    }

    try {
      setLoading(true);
      
      // Convert features array to backend format (array of objects)
      const featuresForBackend = formData.features.map(feature => ({
        name: feature,
        included: true,
        limit: -1
      }));

      const updateData = {
        name: formData.name,
        description: formData.description,
        priceMonthly: formData.priceMonthly,
        reelLimit: formData.reelLimit === '' ? 0 : formData.reelLimit,
        extraReelPrice: formData.extraReelPrice,
        isActive: formData.isActive,
        features: featuresForBackend,
      };

      const tierId = tier._id || tier.id;
      const response = await api.put(`/admin/subscriptions/tiers/${tierId}`, updateData);

      if (response.success) {
        toast.success('Tier updated successfully!');
        onSuccess?.(response.data);
        onClose();
      } else {
        throw new Error(response.message || 'Failed to update tier');
      }
    } catch (error) {
      console.error('Error updating tier:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update tier');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[10000]"
          />
          
          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[10000] flex ${isAppRoute ? 'items-start pt-[10px]' : 'items-end'} sm:items-center justify-center p-4 pointer-events-none`}
          >
            <motion.div
              variants={{
                hidden: { 
                  y: isAppRoute ? '-100%' : '100%',
                  scale: 0.95,
                  opacity: 0
                },
                visible: { 
                  y: 0,
                  scale: 1,
                  opacity: 1,
                  transition: { 
                    type: 'spring',
                    damping: 22,
                    stiffness: 350,
                    mass: 0.7
                  }
                },
                exit: { 
                  y: isAppRoute ? '-100%' : '100%',
                  scale: 0.95,
                  opacity: 0,
                  transition: { 
                    type: 'spring',
                    damping: 30,
                    stiffness: 400
                  }
                }
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`bg-white ${isAppRoute ? 'rounded-b-3xl' : 'rounded-t-3xl'} sm:rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto scrollbar-admin pointer-events-auto`}
              style={{ willChange: 'transform' }}
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between z-10">
                <h2 className="text-2xl font-bold text-gray-800">Edit Plan Details</h2>
                <Button
                  onClick={onClose}
                  variant="icon"
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FiX className="text-xl" />
                </Button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Tier Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tier Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="e.g., Starter, Professional"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Description *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                    placeholder="Describe this subscription tier..."
                  />
                </div>

                {/* Price and Limits */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Monthly Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="priceMonthly"
                      value={formData.priceMonthly}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Reel Limit *
                    </label>
                    <input
                      type="number"
                      name="reelLimit"
                      value={formData.reelLimit}
                      onChange={handleInputChange}
                      min="-1"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="-1 for unlimited"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use -1 for unlimited</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Extra Reel Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="extraReelPrice"
                      value={formData.extraReelPrice}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                  </div>
                </div>

                {/* Active Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    name="isActive"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="text-sm font-semibold text-gray-700">
                    Plan is Active
                  </label>
                </div>

                {/* Features */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Features *
                  </label>
                  
                  {/* Feature List */}
                  <div className="space-y-2 mb-3">
                    {formData.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <span className="flex-1 text-sm text-gray-700">{feature}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(index)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <FiTrash2 className="text-sm" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Feature */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddFeature();
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      placeholder="Add a feature..."
                    />
                    <Button
                      type="button"
                      onClick={handleAddFeature}
                      variant="secondary"
                      className="px-4"
                    >
                      <FiPlus className="text-lg" />
                    </Button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                  <Button
                    type="button"
                    onClick={onClose}
                    variant="secondary"
                    className="flex-1"
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1"
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EditTierModal;

