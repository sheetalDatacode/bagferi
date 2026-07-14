import b2bSubscriptionPlanService from '../services/b2bSubscriptionPlan.service.js';
import redisService from '../services/redis.service.js';

class AdminB2BSubscriptionPlanController {
  constructor() {
    this.getPlans = this.getPlans.bind(this);
    this.getActivePlans = this.getActivePlans.bind(this);
    this.getPlanById = this.getPlanById.bind(this);
    this.createPlan = this.createPlan.bind(this);
    this.updatePlan = this.updatePlan.bind(this);
    this.deletePlan = this.deletePlan.bind(this);
    this.initializeDefaultPlans = this.initializeDefaultPlans.bind(this);
    this.clearPlanCache = this.clearPlanCache.bind(this);
  }

  /**
   * Helper to clear B2B plan cache
   */
  async clearPlanCache(planId = null) {
    try {
      const patterns = ['public:b2b-plans:*'];
      if (planId) {
        patterns.push(`b2b-plan:details:*${planId}*`);
      } else {
        patterns.push('b2b-plan:details:*');
      }
      await Promise.all(patterns.map(pattern => redisService.clearPattern(pattern)));
    } catch (error) {
      console.error('Error clearing B2B plan cache:', error);
    }
  }

  /**
   * Get all B2B subscription plans
   * GET /admin/b2b-subscription-plans
   */
  async getPlans(req, res) {
    try {
      const { includeInactive = 'false', businessType } = req.query;
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      const plans = await b2bSubscriptionPlanService.getAllPlans({
        includeInactive: includeInactive === 'true',
        businessType,
        vendorId
      });

      res.status(200).json({
        success: true,
        data: plans,
        message: 'B2B subscription plans fetched successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch B2B subscription plans',
      });
    }
  }

  /**
   * Get active B2B subscription plans only
   * GET /admin/b2b-subscription-plans/active
   */
  async getActivePlans(req, res) {
    try {
      const { businessType } = req.query;
      const vendorId = req.user?.vendorId || req.userDoc?._id || req.user?.id;
      const plans = await b2bSubscriptionPlanService.getAllPlans({
        includeInactive: false,
        businessType,
        vendorId
      });

      res.status(200).json({
        success: true,
        data: plans,
        message: 'Active B2B subscription plans fetched successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to fetch active plans',
      });
    }
  }

  /**
   * Get plan by ID
   * GET /admin/b2b-subscription-plans/:id
   */
  async getPlanById(req, res) {
    try {
      const { id } = req.params;
      const plan = await b2bSubscriptionPlanService.getPlanById(id);

      res.status(200).json({
        success: true,
        data: plan,
        message: 'Plan fetched successfully',
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to fetch plan',
      });
    }
  }

  /**
   * Create a new B2B subscription plan
   * POST /admin/b2b-subscription-plans
   */
  async createPlan(req, res) {
    try {
      const adminId = req.userDoc?._id || req.user?.adminId;
      const plan = await b2bSubscriptionPlanService.createPlan(req.body, adminId);

      // Clear cache
      await this.clearPlanCache();

      res.status(201).json({
        success: true,
        data: plan,
        message: 'B2B subscription plan created successfully',
      });
    } catch (error) {
      const statusCode = error.message.includes('already exists') ? 409 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to create plan',
      });
    }
  }

  /**
   * Update an existing B2B subscription plan
   * PUT /admin/b2b-subscription-plans/:id
   */
  async updatePlan(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.userDoc?._id || req.user?.adminId;
      const plan = await b2bSubscriptionPlanService.updatePlan(id, req.body, adminId);

      // Clear cache
      await this.clearPlanCache(id);

      res.status(200).json({
        success: true,
        data: plan,
        message: 'Plan updated successfully',
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to update plan',
      });
    }
  }

  /**
   * Delete a plan (soft delete)
   * DELETE /admin/b2b-subscription-plans/:id
   */
  async deletePlan(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.userDoc?._id || req.user?.adminId;
      const plan = await b2bSubscriptionPlanService.deletePlan(id, adminId);

      // Clear cache
      await this.clearPlanCache(id);

      res.status(200).json({
        success: true,
        data: plan,
        message: 'Plan deleted successfully',
      });
    } catch (error) {
      const statusCode = error.message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Failed to delete plan',
      });
    }
  }

  /**
   * Initialize default plans (3, 6, 12 months) if they don't exist
   * POST /admin/b2b-subscription-plans/initialize
   */
  async initializeDefaultPlans(req, res) {
    try {
      const adminId = req.userDoc?._id || req.user?.adminId;
      const plans = await b2bSubscriptionPlanService.ensureDefaultPlans(adminId);

      // Clear cache
      await this.clearPlanCache();

      res.status(200).json({
        success: true,
        data: plans,
        message: 'Default plans initialized successfully',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to initialize default plans',
      });
    }
  }
}

export default new AdminB2BSubscriptionPlanController();
