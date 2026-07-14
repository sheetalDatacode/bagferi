import B2BAddonPlan from '../models/B2BAddonPlan.model.js';

class B2BAddonPlanService {
  /**
   * Get all add-on plans
   * @param {Object} query - Filter query
   * @returns {Promise<Array>} List of plans
   */
  async getAllPlans(query = {}) {
    try {
      const plans = await B2BAddonPlan.find(query)
        .sort({ price: 1 })
        .lean();
      return plans;
    } catch (error) {
      console.error('Error fetching all B2B addon plans:', error);
      throw error;
    }
  }


  /**
   * Create a new add-on plan
   * @param {Object} planData - Data of the new plan
   * @param {string} adminId - ID of creator
   * @returns {Promise<Object>} Created plan
   */
  async createPlan(planData, adminId) {
    try {
      const plan = await B2BAddonPlan.create({
        ...planData,
        createdBy: adminId,
        updatedBy: adminId,
      });
      return plan;
    } catch (error) {
      console.error('Error creating B2B addon plan:', error);
      throw error;
    }
  }

  /**
   * Update an existing add-on plan
   * @param {string} planId - ID of the plan to update
   * @param {Object} updateData - Data to update
   * @param {string} adminId - ID of updater
   * @returns {Promise<Object>} Updated plan
   */
  async updatePlan(planId, updateData, adminId) {
    try {
      const plan = await B2BAddonPlan.findByIdAndUpdate(
        planId,
        {
          ...updateData,
          updatedBy: adminId,
        },
        { new: true, runValidators: true }
      );

      if (!plan) {
        throw new Error('B2B addon plan not found');
      }

      return plan;
    } catch (error) {
      console.error('Error updating B2B addon plan:', error);
      throw error;
    }
  }

  /**
   * Soft delete or deactivate a plan
   * @param {string} planId - ID of the plan to toggle
   * @param {boolean} isActive - New status
   * @param {string} adminId - ID of updater
   * @returns {Promise<Object>} Updated plan
   */
  async togglePlanStatus(planId, isActive, adminId) {
    return this.updatePlan(planId, { isActive }, adminId);
  }

  /**
   * Permanent delete a plan
   * @param {string} planId - ID of the plan
   * @returns {Promise<Object>} Deleted plan
   */
  async deletePlan(planId) {
    try {
      const plan = await B2BAddonPlan.findByIdAndDelete(planId);
      return plan;
    } catch (error) {
      console.error('Error deleting B2B addon plan:', error);
      throw error;
    }
  }
}

export default new B2BAddonPlanService();
