/**
 * Manager Analytics Socket Handler
 * Emits real-time updates to manager dashboard
 * 
 * USAGE IN EXISTING CODE:
 * Import this module and call emit functions after DB updates:
 * 
 * const managerAnalytics = require('./sockets/manager.analytics.socket');
 * 
 * // After task update:
 * managerAnalytics.emitTaskUpdate(io, taskData);
 * 
 * // After lead update:
 * managerAnalytics.emitLeadUpdate(io, leadData);
 */

const analyticsService = require('../modules/manager-analytics/analytics.service');

class ManagerAnalyticsSocket {
  /**
   * Initialize socket listeners (called once on server start)
   */
  initialize(io) {
    console.log('[MANAGER_ANALYTICS_SOCKET] Initialized');
    
    io.on('connection', (socket) => {
      // Check if connected user is a manager
      if (socket.user && socket.user.role === 'manager') {
        console.log(`[MANAGER_ANALYTICS_SOCKET] Manager ${socket.user._id} connected`);
        
        // Join manager-specific room
        socket.join('managers');
        
        // Handle manual refresh request
        socket.on('manager:analytics:refresh', async (chartType) => {
          console.log(`[MANAGER_ANALYTICS_SOCKET] Refresh requested for: ${chartType}`);
          await this.handleRefreshRequest(socket, chartType);
        });
        
        socket.on('disconnect', () => {
          console.log(`[MANAGER_ANALYTICS_SOCKET] Manager ${socket.user._id} disconnected`);
        });
      }
    });
  }

  /**
   * Handle refresh request from manager
   */
  async handleRefreshRequest(socket, chartType) {
    try {
      let data;
      
      switch (chartType) {
        case 'taskStatus':
          data = await analyticsService.getTaskStatusOverview();
          socket.emit('manager:analytics:taskStatus', data);
          break;
        case 'employeeLoad':
          data = await analyticsService.getEmployeeTaskLoad();
          socket.emit('manager:analytics:employeeLoad', data);
          break;
        case 'leadsFunnel':
          data = await analyticsService.getLeadsFunnel();
          socket.emit('manager:analytics:leadsFunnel', data);
          break;
        case 'leadSources':
          data = await analyticsService.getLeadSourceAnalysis();
          socket.emit('manager:analytics:leadSources', data);
          break;
        case 'inventory':
          data = await analyticsService.getInventoryStatus();
          socket.emit('manager:analytics:inventory', data);
          break;
        case 'callActivity':
          data = await analyticsService.getCallActivity();
          socket.emit('manager:analytics:callActivity', data);
          break;
        case 'kpis':
          data = await analyticsService.getPerformanceKPIs();
          socket.emit('manager:analytics:kpis', data);
          break;
        case 'alerts':
          data = await analyticsService.getAlertsAndExceptions();
          socket.emit('manager:analytics:alerts', data);
          break;
        case 'all':
          data = await analyticsService.getAllAnalytics();
          socket.emit('manager:analytics:all', data);
          break;
        default:
          socket.emit('manager:analytics:error', { message: 'Unknown chart type' });
      }
    } catch (error) {
      console.error('[MANAGER_ANALYTICS_SOCKET] Refresh error:', error);
      socket.emit('manager:analytics:error', { message: 'Refresh failed' });
    }
  }

  /**
   * Emit task update to managers (call after task create/update/delete)
   */
  async emitTaskUpdate(io, taskData) {
    try {
      // Fetch updated task status and employee load
      const taskStatus = await analyticsService.getTaskStatusOverview();
      const employeeLoad = await analyticsService.getEmployeeTaskLoad();
      const kpis = await analyticsService.getPerformanceKPIs();
      const alerts = await analyticsService.getAlertsAndExceptions();
      
      // Emit to all managers
      io.to('managers').emit('manager:analytics:taskStatus', taskStatus);
      io.to('managers').emit('manager:analytics:employeeLoad', employeeLoad);
      io.to('managers').emit('manager:analytics:kpis', kpis);
      io.to('managers').emit('manager:analytics:alerts', alerts);
      
      console.log('[MANAGER_ANALYTICS_SOCKET] Task update emitted to managers');
    } catch (error) {
      console.error('[MANAGER_ANALYTICS_SOCKET] emitTaskUpdate error:', error);
    }
  }

  /**
   * Emit lead update to managers (call after lead create/update/delete)
   */
  async emitLeadUpdate(io, leadData) {
    try {
      // Fetch updated lead analytics
      const leadsFunnel = await analyticsService.getLeadsFunnel();
      const leadSources = await analyticsService.getLeadSourceAnalysis();
      const kpis = await analyticsService.getPerformanceKPIs();
      const alerts = await analyticsService.getAlertsAndExceptions();
      
      // Emit to all managers
      io.to('managers').emit('manager:analytics:leadsFunnel', leadsFunnel);
      io.to('managers').emit('manager:analytics:leadSources', leadSources);
      io.to('managers').emit('manager:analytics:kpis', kpis);
      io.to('managers').emit('manager:analytics:alerts', alerts);
      
      console.log('[MANAGER_ANALYTICS_SOCKET] Lead update emitted to managers');
    } catch (error) {
      console.error('[MANAGER_ANALYTICS_SOCKET] emitLeadUpdate error:', error);
    }
  }

  /**
   * Emit inventory update to managers (call after inventory create/update/delete)
   */
  async emitInventoryUpdate(io, inventoryData) {
    try {
      // Fetch updated inventory status
      const inventory = await analyticsService.getInventoryStatus();
      const kpis = await analyticsService.getPerformanceKPIs();
      const alerts = await analyticsService.getAlertsAndExceptions();
      
      // Emit to all managers
      io.to('managers').emit('manager:analytics:inventory', inventory);
      io.to('managers').emit('manager:analytics:kpis', kpis);
      io.to('managers').emit('manager:analytics:alerts', alerts);
      
      console.log('[MANAGER_ANALYTICS_SOCKET] Inventory update emitted to managers');
    } catch (error) {
      console.error('[MANAGER_ANALYTICS_SOCKET] emitInventoryUpdate error:', error);
    }
  }

  /**
   * Emit call activity update to managers (call after call create/update)
   */
  async emitCallUpdate(io, callData) {
    try {
      // Fetch updated call activity
      const callActivity = await analyticsService.getCallActivity();
      const kpis = await analyticsService.getPerformanceKPIs();
      
      // Emit to all managers
      io.to('managers').emit('manager:analytics:callActivity', callActivity);
      io.to('managers').emit('manager:analytics:kpis', kpis);
      
      console.log('[MANAGER_ANALYTICS_SOCKET] Call update emitted to managers');
    } catch (error) {
      console.error('[MANAGER_ANALYTICS_SOCKET] emitCallUpdate error:', error);
    }
  }

  /**
   * Emit attendance update to managers (call after attendance create/update)
   */
  async emitAttendanceUpdate(io, attendanceData) {
    try {
      // Fetch updated KPIs and alerts
      const kpis = await analyticsService.getPerformanceKPIs();
      const alerts = await analyticsService.getAlertsAndExceptions();
      
      // Emit to all managers
      io.to('managers').emit('manager:analytics:kpis', kpis);
      io.to('managers').emit('manager:analytics:alerts', alerts);
      
      console.log('[MANAGER_ANALYTICS_SOCKET] Attendance update emitted to managers');
    } catch (error) {
      console.error('[MANAGER_ANALYTICS_SOCKET] emitAttendanceUpdate error:', error);
    }
  }

  /**
   * Emit a specific alert to managers
   */
  emitAlert(io, alertData) {
    try {
      io.to('managers').emit('manager:analytics:newAlert', {
        success: true,
        data: alertData
      });
      
      console.log('[MANAGER_ANALYTICS_SOCKET] Alert emitted to managers:', alertData);
    } catch (error) {
      console.error('[MANAGER_ANALYTICS_SOCKET] emitAlert error:', error);
    }
  }
}

module.exports = new ManagerAnalyticsSocket();
