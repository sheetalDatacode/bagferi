import b2bAddonPlanService from '../services/b2bAddonPlan.service.js';

class AdminB2BAddonPlanController {
  /**
   * Get all B2B addon plans
   * GET /admin/b2b-addon-plans
   */
  async getPlans(req, res) {
    try {
      const { includeInactive = 'false', featureType } = req.query;
      const query = {};
      if (includeInactive !== 'true') query.isActive = true;
      if (featureType) query.featureType = featureType;

      const plans = await b2bAddonPlanService.getAllPlans(query);

      res.status(200).json({
        success: true,
        data: plans,
        message: 'B2B addon plans fetched successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch B2B addon plans',
      });
    }
  }

  /**
   * Get plan by ID
   * GET /admin/b2b-addon-plans/:id
   */
  async getPlanById(req, res) {
    try {
      const { id } = req.params;
      const plan = await b2bAddonPlanService.getPlanById(id);

      res.status(200).json({
        success: true,
        data: plan,
        message: 'Add-on plan fetched successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch addon plan',
      });
    }
  }

  /**
   * Create a new B2B addon plan
   * POST /admin/b2b-addon-plans
   */
  async createPlan(req, res) {
    try {
      const adminId = req.userDoc?._id || req.user?.adminId || req.user?.id;
      const planData = req.body;

      if (!planData.name || !planData.featureType || !planData.quantity || !planData.price) {
        return res.status(400).json({
          success: false,
          message: 'All required fields (name, featureType, quantity, price) must be provided'
        });
      }

      const plan = await b2bAddonPlanService.createPlan(planData, adminId);

      res.status(201).json({
        success: true,
        data: plan,
        message: 'B2B addon plan created successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to create B2B addon plan',
      });
    }
  }

  /**
   * Update an existing B2B addon plan
   * PUT /admin/b2b-addon-plans/:id
   */
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.userDoc?._id || req.user?.adminId || req.user?.id;
      const updateData = req.body;

      const plan = await b2bAddonPlanService.updatePlan(id, updateData, adminId);

      res.status(200).json({
        success: true,
        data: plan,
        message: 'Add-on plan updated successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to update addon plan',
      });
    }
  }

  /**
   * Delete a plan
   * DELETE /admin/b2b-addon-plans/:id
   */
  async deletePlan(req, res) {
    try {
      const { id } = req.params;
      const plan = await b2bAddonPlanService.deletePlan(id);

      res.status(200).json({
        success: true,
        data: plan,
        message: 'Add-on plan deleted successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to delete addon plan',
      });
    }
  }
}

export default new AdminB2BAddonPlanController();
