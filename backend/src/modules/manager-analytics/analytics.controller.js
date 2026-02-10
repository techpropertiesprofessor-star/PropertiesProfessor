/**
 * Manager Analytics Controller
 * Handles HTTP requests for manager analytics dashboard
 */

const analyticsService = require('./analytics.service');

class AnalyticsController {
  /**
   * GET /api/manager-analytics/task-status
   * Get task status overview (for donut chart)
   */
  async getTaskStatus(req, res) {
    try {
      const result = await analyticsService.getTaskStatusOverview();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ANALYTICS_CTRL] getTaskStatus error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch task status data'
      });
    }
  }

  /**
   * GET /api/manager-analytics/employee-load
   * Get employee-wise task load (for horizontal bar chart)
   */
  async getEmployeeLoad(req, res) {
    try {
      const result = await analyticsService.getEmployeeTaskLoad();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ANALYTICS_CTRL] getEmployeeLoad error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch employee load data'
      });
    }
  }

  /**
   * GET /api/manager-analytics/leads-funnel
   * Get leads funnel data
   */
  async getLeadsFunnel(req, res) {
    try {
      const result = await analyticsService.getLeadsFunnel();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ANALYTICS_CTRL] getLeadsFunnel error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch leads funnel data'
      });
    }
  }

  /**
   * GET /api/manager-analytics/lead-sources
   * Get lead source analysis
   */
  async getLeadSources(req, res) {
    try {
      const result = await analyticsService.getLeadSourceAnalysis();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ANALYTICS_CTRL] getLeadSources error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch lead sources data'
      });
    }
  }

  /**
   * GET /api/manager-analytics/inventory-status
   * Get inventory status overview
   */
  async getInventoryStatus(req, res) {
    try {
      const result = await analyticsService.getInventoryStatus();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ANALYTICS_CTRL] getInventoryStatus error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch inventory status data'
      });
    }
  }

  /**
   * GET /api/manager-analytics/call-activity
   * Get call activity analysis
   */
  async getCallActivity(req, res) {
    try {
      const result = await analyticsService.getCallActivity();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ANALYTICS_CTRL] getCallActivity error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch call activity data'
      });
    }
  }

  /**
   * GET /api/manager-analytics/kpis
   * Get performance KPI cards data
   */
  async getPerformanceKPIs(req, res) {
    try {
      const result = await analyticsService.getPerformanceKPIs();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ANALYTICS_CTRL] getPerformanceKPIs error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch KPIs data'
      });
    }
  }

  /**
   * GET /api/manager-analytics/alerts
   * Get alerts and exceptions
   */
  async getAlerts(req, res) {
    try {
      const result = await analyticsService.getAlertsAndExceptions();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ANALYTICS_CTRL] getAlerts error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch alerts data'
      });
    }
  }

  /**
   * GET /api/manager-analytics/all
   * Get all analytics data at once (initial load)
   */
  async getAllAnalytics(req, res) {
    try {
      const result = await analyticsService.getAllAnalytics();
      
      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json(result);
      }
    } catch (error) {
      console.error('[ANALYTICS_CTRL] getAllAnalytics error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch analytics data'
      });
    }
  }
}

module.exports = new AnalyticsController();
