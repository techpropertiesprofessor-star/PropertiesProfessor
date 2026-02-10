/**
 * Manager Analytics Service
 * Aggregates data from various collections for manager dashboard
 * All methods assume caller is verified as manager
 */

const mongoose = require('mongoose');

class AnalyticsService {
  constructor() {
    // Get models - will be initialized when models are available
    this.Task = null;
    this.Lead = null;
    this.Inventory = null;
    this.Call = null;
    this.Attendance = null;
    this.User = null;
    this.Employee = null;
  }

  // Initialize models safely
  _initModels() {
    try {
      if (!this.Task) this.Task = mongoose.model('Task');
      if (!this.Lead) this.Lead = mongoose.model('Lead');
      if (!this.Inventory) this.Inventory = mongoose.model('Inventory');
      if (!this.Call) this.Call = mongoose.model('Call');
      if (!this.Attendance) this.Attendance = mongoose.model('Attendance');
      if (!this.User) this.User = mongoose.model('User');
      if (!this.Employee) this.Employee = mongoose.model('Employee');
    } catch (error) {
      console.warn('[ANALYTICS] Some models not available:', error.message);
    }
  }

  /**
   * Task Status Overview - For Donut Chart
   * Returns count of tasks by status
   */
  async getTaskStatusOverview() {
    this._initModels();
    if (!this.Task) return { success: false, message: 'Task model not available' };

    try {
      const tasksByStatus = await this.Task.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);

      return {
        success: true,
        data: tasksByStatus
      };
    } catch (error) {
      console.error('[ANALYTICS] getTaskStatusOverview error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Employee-wise Task Load - For Horizontal Bar Chart
   * Returns task count per employee
   */
  async getEmployeeTaskLoad() {
    this._initModels();
    if (!this.Task) return { success: false, message: 'Task model not available' };

    try {
      const tasksByEmployee = await this.Task.aggregate([
        {
          $match: {
            assignedTo: { $exists: true, $ne: null }
          }
        },
        {
          $group: {
            _id: '$assignedTo',
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            inProgressTasks: {
              $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] }
            },
            pendingTasks: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'userInfo'
          }
        },
        {
          $unwind: {
            path: '$userInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            employeeId: '$_id',
            employeeName: {
              $concat: ['$userInfo.firstName', ' ', '$userInfo.lastName']
            },
            totalTasks: 1,
            completedTasks: 1,
            inProgressTasks: 1,
            pendingTasks: 1,
            _id: 0
          }
        },
        {
          $sort: { totalTasks: -1 }
        }
      ]);

      return {
        success: true,
        data: tasksByEmployee
      };
    } catch (error) {
      console.error('[ANALYTICS] getEmployeeTaskLoad error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Leads Funnel - Shows conversion through stages
   */
  async getLeadsFunnel() {
    this._initModels();
    if (!this.Lead) return { success: false, message: 'Lead model not available' };

    try {
      const funnel = await this.Lead.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            stage: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]);

      // Define funnel order
      const stageOrder = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
      const orderedFunnel = stageOrder.map(stage => {
        const found = funnel.find(f => f.stage === stage);
        return {
          stage,
          count: found ? found.count : 0
        };
      });

      return {
        success: true,
        data: orderedFunnel
      };
    } catch (error) {
      console.error('[ANALYTICS] getLeadsFunnel error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Lead Source Analysis
   */
  async getLeadSourceAnalysis() {
    this._initModels();
    if (!this.Lead) return { success: false, message: 'Lead model not available' };

    try {
      const sourceAnalysis = await this.Lead.aggregate([
        {
          $group: {
            _id: '$source',
            count: { $sum: 1 },
            wonCount: {
              $sum: { $cond: [{ $eq: ['$status', 'won'] }, 1, 0] }
            }
          }
        },
        {
          $project: {
            source: { $ifNull: ['$_id', 'Unknown'] },
            count: 1,
            wonCount: 1,
            conversionRate: {
              $cond: [
                { $gt: ['$count', 0] },
                { $multiply: [{ $divide: ['$wonCount', '$count'] }, 100] },
                0
              ]
            },
            _id: 0
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      return {
        success: true,
        data: sourceAnalysis
      };
    } catch (error) {
      console.error('[ANALYTICS] getLeadSourceAnalysis error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Inventory Status Overview
   */
  async getInventoryStatus() {
    this._initModels();
    if (!this.Inventory) return { success: false, message: 'Inventory model not available' };

    try {
      const inventoryStats = await this.Inventory.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalValue: { $sum: '$price' }
          }
        },
        {
          $project: {
            status: '$_id',
            count: 1,
            totalValue: 1,
            _id: 0
          }
        }
      ]);

      // Get low stock items (quantity < 10)
      const lowStockCount = await this.Inventory.countDocuments({
        quantity: { $lt: 10 }
      });

      return {
        success: true,
        data: {
          byStatus: inventoryStats,
          lowStockCount
        }
      };
    } catch (error) {
      console.error('[ANALYTICS] getInventoryStatus error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Call Activity Analysis
   */
  async getCallActivity() {
    this._initModels();
    if (!this.Call) return { success: false, message: 'Call model not available' };

    try {
      const now = new Date();
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const callStats = await this.Call.aggregate([
        {
          $match: {
            createdAt: { $gte: last7Days }
          }
        },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              callType: '$callType'
            },
            count: { $sum: 1 }
          }
        },
        {
          $group: {
            _id: '$_id.date',
            callTypes: {
              $push: {
                type: '$_id.callType',
                count: '$count'
              }
            },
            totalCalls: { $sum: '$count' }
          }
        },
        {
          $sort: { _id: 1 }
        },
        {
          $project: {
            date: '$_id',
            callTypes: 1,
            totalCalls: 1,
            _id: 0
          }
        }
      ]);

      return {
        success: true,
        data: callStats
      };
    } catch (error) {
      console.error('[ANALYTICS] getCallActivity error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Performance KPI Cards
   */
  async getPerformanceKPIs() {
    this._initModels();

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Total active employees
      const totalActiveEmployees = this.Employee 
        ? await this.Employee.countDocuments({ status: 'active' })
        : 0;

      // Total tasks
      const totalTasks = this.Task 
        ? await this.Task.countDocuments()
        : 0;

      // Completed tasks (today)
      const completedTasksToday = this.Task
        ? await this.Task.countDocuments({
            status: 'completed',
            updatedAt: { $gte: today }
          })
        : 0;

      // Total leads
      const totalLeads = this.Lead
        ? await this.Lead.countDocuments()
        : 0;

      // Won leads (this month)
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const wonLeadsThisMonth = this.Lead
        ? await this.Lead.countDocuments({
            status: 'won',
            updatedAt: { $gte: firstDayOfMonth }
          })
        : 0;

      // Total inventory items
      const totalInventoryItems = this.Inventory
        ? await this.Inventory.countDocuments()
        : 0;

      // Low stock items
      const lowStockItems = this.Inventory
        ? await this.Inventory.countDocuments({ quantity: { $lt: 10 } })
        : 0;

      // Total calls (today)
      const callsToday = this.Call
        ? await this.Call.countDocuments({ createdAt: { $gte: today } })
        : 0;

      // Present employees (today)
      const presentToday = this.Attendance
        ? await this.Attendance.countDocuments({
            date: { $gte: today },
            status: 'present'
          })
        : 0;

      return {
        success: true,
        data: {
          employees: {
            total: totalActiveEmployees,
            presentToday
          },
          tasks: {
            total: totalTasks,
            completedToday: completedTasksToday
          },
          leads: {
            total: totalLeads,
            wonThisMonth: wonLeadsThisMonth
          },
          inventory: {
            total: totalInventoryItems,
            lowStock: lowStockItems
          },
          calls: {
            today: callsToday
          }
        }
      };
    } catch (error) {
      console.error('[ANALYTICS] getPerformanceKPIs error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Alerts & Exceptions
   */
  async getAlertsAndExceptions() {
    this._initModels();

    try {
      const alerts = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Check for overdue tasks
      if (this.Task) {
        const overdueTasks = await this.Task.countDocuments({
          dueDate: { $lt: today },
          status: { $nin: ['completed', 'cancelled'] }
        });

        if (overdueTasks > 0) {
          alerts.push({
            type: 'warning',
            category: 'Tasks',
            message: `${overdueTasks} overdue task(s)`,
            count: overdueTasks,
            priority: 'high'
          });
        }
      }

      // Check for low stock items
      if (this.Inventory) {
        const lowStock = await this.Inventory.countDocuments({
          quantity: { $lt: 10 }
        });

        if (lowStock > 0) {
          alerts.push({
            type: 'warning',
            category: 'Inventory',
            message: `${lowStock} item(s) low on stock`,
            count: lowStock,
            priority: 'medium'
          });
        }
      }

      // Check for uncontacted leads (older than 2 days)
      if (this.Lead) {
        const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
        const uncontactedLeads = await this.Lead.countDocuments({
          status: 'new',
          createdAt: { $lt: twoDaysAgo }
        });

        if (uncontactedLeads > 0) {
          alerts.push({
            type: 'info',
            category: 'Leads',
            message: `${uncontactedLeads} uncontacted lead(s) older than 2 days`,
            count: uncontactedLeads,
            priority: 'medium'
          });
        }
      }

      // Check for absent employees (if attendance exists)
      if (this.Attendance && this.Employee) {
        const totalActive = await this.Employee.countDocuments({ status: 'active' });
        const presentToday = await this.Attendance.countDocuments({
          date: { $gte: today },
          status: 'present'
        });
        const absentees = totalActive - presentToday;

        if (absentees > 0) {
          alerts.push({
            type: 'info',
            category: 'Attendance',
            message: `${absentees} employee(s) absent today`,
            count: absentees,
            priority: 'low'
          });
        }
      }

      return {
        success: true,
        data: alerts.sort((a, b) => {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return priorityOrder[b.priority] - priorityOrder[a.priority];
        })
      };
    } catch (error) {
      console.error('[ANALYTICS] getAlertsAndExceptions error:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get all analytics data at once (for initial load)
   */
  async getAllAnalytics() {
    try {
      const [
        taskStatus,
        employeeLoad,
        leadsFunnel,
        leadSources,
        inventory,
        callActivity,
        kpis,
        alerts
      ] = await Promise.all([
        this.getTaskStatusOverview(),
        this.getEmployeeTaskLoad(),
        this.getLeadsFunnel(),
        this.getLeadSourceAnalysis(),
        this.getInventoryStatus(),
        this.getCallActivity(),
        this.getPerformanceKPIs(),
        this.getAlertsAndExceptions()
      ]);

      return {
        success: true,
        data: {
          taskStatus: taskStatus.data,
          employeeLoad: employeeLoad.data,
          leadsFunnel: leadsFunnel.data,
          leadSources: leadSources.data,
          inventory: inventory.data,
          callActivity: callActivity.data,
          kpis: kpis.data,
          alerts: alerts.data
        }
      };
    } catch (error) {
      console.error('[ANALYTICS] getAllAnalytics error:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new AnalyticsService();
