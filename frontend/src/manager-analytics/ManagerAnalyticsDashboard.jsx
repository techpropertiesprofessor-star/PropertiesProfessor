/**
 * Manager Analytics Dashboard
 * Main dashboard component for managers only
 * 
 * USAGE:
 * Import and use this component in your routing:
 * 
 * import ManagerAnalyticsDashboard from './manager-analytics/ManagerAnalyticsDashboard';
 * 
 * // In your route configuration:
 * {user.role === 'manager' && (
 *   <Route path="/manager/analytics" element={<ManagerAnalyticsDashboard />} />
 * )}
 */

import React, { useEffect, useContext, useRef, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useManagerAnalytics } from './hooks/useManagerAnalytics';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import TaskStatusChart from './charts/TaskStatusChart';
import EmployeeTaskLoadChart from './charts/EmployeeTaskLoadChart';
import LeadsFunnelChart from './charts/LeadsFunnelChart';
import LeadSourceChart from './charts/LeadSourceChart';
import InventoryStatusChart from './charts/InventoryStatusChart';
import CallActivityChart from './charts/CallActivityChart';
import PerformanceKPICards from './components/PerformanceKPICards';
import AlertsComponent from './components/AlertsComponent';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ManagerAnalyticsDashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const { data, loading, error, isConnected, refreshChart, reload } = useManagerAnalytics();
  const dashboardRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);

  // Handle alert click
  const handleAlertClick = (alert) => {
    setSelectedAlert(alert);
  };

  // Close alert modal
  const closeAlertModal = () => {
    setSelectedAlert(null);
  };

  // Professional PDF generation with clear visibility of all data
  const handleDownloadPDF = async () => {
    if (!dashboardRef.current) return;
    
    setIsDownloading(true);
    
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: false // Don't compress for better quality
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const contentWidth = pageWidth - (2 * margin);
      let currentY = margin;
      let pageNum = 1;

      // Helper to add styled header
      const addHeader = (title, pageNumber) => {
        pdf.setFillColor(59, 130, 246);
        pdf.rect(0, 0, pageWidth, 30, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(18);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, pageWidth / 2, 12, { align: 'center' });
        
        pdf.setFontSize(9);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth / 2, 20, { align: 'center' });
        pdf.text(`Page ${pageNumber}`, pageWidth - margin - 5, 25, { align: 'right' });
        
        pdf.setTextColor(0, 0, 0);
        return 35;
      };

      // Helper to add footer
      const addFooter = () => {
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text('Confidential - Manager Analytics Report', pageWidth / 2, pageHeight - 5, { align: 'center' });
        pdf.setTextColor(0, 0, 0);
      };

      // Helper to capture element as high-quality image
      const captureChartImage = async (selector) => {
        const element = document.querySelector(selector);
        if (!element) {
          console.warn('Element not found:', selector);
          return null;
        }

        // Temporarily hide buttons and live indicators
        const buttons = element.querySelectorAll('button');
        const liveIndicators = element.querySelectorAll('[class*="animate-pulse"]');
        
        buttons.forEach(btn => btn.style.display = 'none');
        liveIndicators.forEach(ind => ind.style.display = 'none');

        try {
          const canvas = await html2canvas(element, {
            scale: 4, // Very high quality
            useCORS: true,
            allowTaint: false,
            logging: false,
            backgroundColor: '#ffffff',
            width: element.offsetWidth,
            height: element.offsetHeight,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
            imageTimeout: 0,
            removeContainer: false
          });

          // Restore hidden elements
          buttons.forEach(btn => btn.style.display = '');
          liveIndicators.forEach(ind => ind.style.display = '');

          return canvas.toDataURL('image/png', 1.0);
        } catch (err) {
          console.error('Capture error:', err);
          buttons.forEach(btn => btn.style.display = '');
          liveIndicators.forEach(ind => ind.style.display = '');
          return null;
        }
      };

      // PAGE 1: Title and Manager Info
      currentY = addHeader('Manager Analytics Dashboard', pageNum);
      
      // Manager Info Box
      pdf.setFillColor(243, 244, 246);
      pdf.roundedRect(margin, currentY, contentWidth, 40, 3, 3, 'F');
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Report Summary', margin + 5, currentY + 8);
      
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Manager: ${user?.username || 'N/A'}`, margin + 5, currentY + 16);
      pdf.text(`Email: ${user?.email || 'N/A'}`, margin + 5, currentY + 23);
      pdf.text(`Role: ${user?.role || 'MANAGER'}`, margin + 5, currentY + 30);
      pdf.text(`Report Date: ${new Date().toLocaleDateString('en-US', { 
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
      })}`, margin + 5, currentY + 37);
      
      currentY += 50;

      // KPIs Section
      if (data.kpis && data.kpis.length > 0) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('📊 Key Performance Indicators', margin, currentY);
        currentY += 8;

        pdf.setFontSize(10);
        
        data.kpis.forEach((kpi, index) => {
          if (currentY > pageHeight - 40) {
            addFooter();
            pdf.addPage();
            pageNum++;
            currentY = addHeader('Manager Analytics Dashboard', pageNum);
          }
          
          // KPI Box
          const boxHeight = 18;
          pdf.setFillColor(index % 2 === 0 ? 245 : 250, index % 2 === 0 ? 247 : 251, 252);
          pdf.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'F');
          
          // Draw border
          pdf.setDrawColor(59, 130, 246);
          pdf.setLineWidth(0.3);
          pdf.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'S');
          
          // Label
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(30, 64, 175);
          pdf.text(kpi.label || 'N/A', margin + 3, currentY + 7);
          
          // Value
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(14);
          pdf.setTextColor(0, 0, 0);
          const valueText = `${kpi.value || 0}${kpi.unit || ''}`;
          pdf.text(valueText, pageWidth - margin - 3, currentY + 10, { align: 'right' });
          
          // Change indicator
          if (kpi.change) {
            pdf.setFontSize(9);
            const isPositive = kpi.change.includes('+') || kpi.change.includes('↑');
            pdf.setTextColor(isPositive ? 22 : 185, isPositive ? 163 : 28, isPositive ? 74 : 28);
            pdf.text(kpi.change, pageWidth - margin - 3, currentY + 15, { align: 'right' });
            pdf.setTextColor(0, 0, 0);
          }
          
          currentY += boxHeight + 2;
        });
        
        currentY += 5;
      }

      // Alerts Section
      if (data.alerts && data.alerts.length > 0) {
        if (currentY > pageHeight - 50) {
          addFooter();
          pdf.addPage();
          pageNum++;
          currentY = addHeader('Manager Analytics Dashboard', pageNum);
        }
        
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('⚠️ Active Alerts & Actions Required', margin, currentY);
        currentY += 8;

        data.alerts.forEach((alert, index) => {
          if (currentY > pageHeight - 35) {
            addFooter();
            pdf.addPage();
            pageNum++;
            currentY = addHeader('Manager Analytics Dashboard', pageNum);
          }
          
          const boxHeight = 20;
          
          // Color based on priority
          let bgColor, borderColor, textColor;
          if (alert.priority === 'high') {
            bgColor = [254, 242, 242];
            borderColor = [239, 68, 68];
            textColor = [185, 28, 28];
          } else if (alert.priority === 'medium') {
            bgColor = [254, 249, 195];
            borderColor = [245, 158, 11];
            textColor = [146, 64, 14];
          } else {
            bgColor = [239, 246, 255];
            borderColor = [59, 130, 246];
            textColor = [29, 78, 216];
          }
          
          pdf.setFillColor(...bgColor);
          pdf.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'F');
          
          pdf.setDrawColor(...borderColor);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(margin, currentY, contentWidth, boxHeight, 2, 2, 'S');
          
          // Content
          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(...textColor);
          pdf.text(alert.category, margin + 3, currentY + 7);
          
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.text(alert.message || '', margin + 3, currentY + 13);
          
          // Priority badge
          pdf.setFontSize(8);
          pdf.text(`[${(alert.priority || 'low').toUpperCase()}]`, margin + 3, currentY + 17);
          
          // Count
          if (alert.count) {
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(16);
            pdf.text(String(alert.count), pageWidth - margin - 8, currentY + 13, { align: 'right' });
          }
          
          pdf.setTextColor(0, 0, 0);
          currentY += boxHeight + 3;
        });
      }

      addFooter();

      // CHARTS PAGES - Each chart on separate page with title
      const charts = [
        { selector: '[data-chart="task-status"]', title: 'Task Status Overview', description: 'Distribution of tasks by status' },
        { selector: '[data-chart="leads-funnel"]', title: 'Leads Funnel Analysis', description: 'Lead progression through sales stages' },
        { selector: '[data-chart="employee-load"]', title: 'Employee Task Load Distribution', description: 'Task workload across team members' },
        { selector: '[data-chart="lead-sources"]', title: 'Lead Source Analysis', description: 'Lead generation by source and conversion rates' },
        { selector: '[data-chart="inventory"]', title: 'Inventory Status Breakdown', description: 'Property inventory by status' },
        { selector: '[data-chart="call-activity"]', title: 'Call Activity Trends', description: 'Call volume and patterns over last 7 days' }
      ];

      for (const chart of charts) {
        pdf.addPage();
        pageNum++;
        currentY = addHeader(chart.title, pageNum);
        
        // Chart description
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.setTextColor(100, 100, 100);
        pdf.text(chart.description, margin, currentY);
        pdf.setTextColor(0, 0, 0);
        currentY += 8;
        
        // Capture and add chart
        const chartImage = await captureChartImage(chart.selector);
        
        if (chartImage) {
          // Calculate dimensions to fit chart nicely
          const maxHeight = pageHeight - currentY - 20;
          const imgHeight = Math.min(maxHeight, 160);
          const imgWidth = contentWidth;
          
          pdf.addImage(chartImage, 'PNG', margin, currentY, imgWidth, imgHeight, undefined, 'FAST');
          
          // Add chart details box if available
          currentY += imgHeight + 5;
          
        } else {
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(150, 150, 150);
          pdf.text('Chart data not available or failed to render', pageWidth / 2, currentY + 50, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
        }
        
        addFooter();
      }

      // Final Summary Page
      pdf.addPage();
      pageNum++;
      currentY = addHeader('Report Summary', pageNum);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Report Generation Complete', margin, currentY);
      currentY += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Pages: ${pageNum}`, margin, currentY);
      currentY += 7;
      pdf.text(`Data Timestamp: ${new Date().toLocaleString()}`, margin, currentY);
      currentY += 7;
      pdf.text(`Generated By: ${user?.username || 'System'}`, margin, currentY);
      currentY += 15;
      
      pdf.setFontSize(9);
      pdf.setTextColor(100, 100, 100);
      pdf.text('This report contains confidential business information.', margin, currentY);
      pdf.text('Unauthorized distribution or copying is strictly prohibited.', margin, currentY + 7);
      
      addFooter();

      // Save with timestamp
      const timestamp = new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-');
      pdf.save(`Analytics-Report-${timestamp}.pdf`);
      
      console.log('✅ PDF generated successfully with', pageNum, 'pages');
      
    } catch (error) {
      console.error('❌ PDF Generation Error:', error);
      alert(`Failed to generate PDF: ${error.message}\n\nPlease ensure all charts are loaded and try again.`);
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    document.title = 'Manager Analytics - Dashboard';
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} onLogout={logout} />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="relative">
                <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 mx-auto"></div>
                <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-blue-600 absolute top-0 left-1/2 transform -translate-x-1/2"></div>
              </div>
              <p className="text-gray-600 mt-6 text-lg font-medium">Loading analytics dashboard...</p>
              <p className="text-gray-400 mt-2 text-sm">Fetching real-time data</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    // Debug logging
    console.error('🔴 Manager Analytics Error:', error);
    console.log('📋 Current token:', localStorage.getItem('token'));
    console.log('👤 User data:', JSON.parse(localStorage.getItem('user') || '{}'));
    
    return (
      <div className="flex h-screen overflow-hidden bg-gradient-to-br from-red-50 via-pink-50 to-orange-50">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header user={user} onLogout={logout} />
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl p-10 max-w-md border border-red-100">
              <div className="bg-gradient-to-br from-red-500 to-pink-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3 text-center">Access Error</h2>
              <p className="text-gray-600 mb-6 text-center leading-relaxed">{error}</p>
              <button
                onClick={reload}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar - Fixed */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Fixed */}
        <Header user={user} onLogout={logout} />

        {/* Dashboard Content - Scrollable */}
        <div className="flex-1 overflow-y-auto bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6">
          {/* Dashboard Header with Modern Design */}
          <div className="mb-8 bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-4 rounded-xl shadow-lg">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Manager Analytics Dashboard
                  </h1>
                  <p className="text-gray-500 mt-1 flex items-center gap-2">
                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                    Real-time insights and performance metrics
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Connection Status with Pulse Animation */}
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${isConnected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className={`text-sm font-medium ${isConnected ? 'text-green-700' : 'text-red-700'}`}>
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
                
                {/* Download PDF Button */}
                <button
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-5 py-2.5 rounded-xl hover:from-purple-700 hover:to-pink-700 text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDownloading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download PDF
                    </>
                  )}
                </button>
                
                {/* Reload Button */}
                <button
                  onClick={reload}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 text-sm font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Downloadable Content Wrapper */}
          <div ref={dashboardRef} data-pdf-content="true">
            {/* KPIs Section with Animation */}
            <div className="mb-8 animate-fadeIn">
              <PerformanceKPICards data={data.kpis} onRefresh={refreshChart} />
            </div>

            {/* Alerts Section with Modern Card */}
            <div className="mb-8 animate-fadeIn" style={{animationDelay: '0.1s'}}>
              <AlertsComponent data={data.alerts} onRefresh={refreshChart} onAlertClick={handleAlertClick} />
            </div>

            {/* Charts Grid with Staggered Animation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Task Status Overview */}
              <div className="animate-fadeIn" style={{animationDelay: '0.2s'}} data-chart="task-status">
                <TaskStatusChart data={data.taskStatus} onRefresh={refreshChart} />
              </div>

              {/* Leads Funnel */}
              <div className="animate-fadeIn" style={{animationDelay: '0.3s'}} data-chart="leads-funnel">
                <LeadsFunnelChart data={data.leadsFunnel} onRefresh={refreshChart} />
              </div>

              {/* Employee Task Load */}
              <div className="lg:col-span-2 animate-fadeIn" style={{animationDelay: '0.4s'}} data-chart="employee-load">
                <EmployeeTaskLoadChart data={data.employeeLoad} onRefresh={refreshChart} />
              </div>

              {/* Lead Source Analysis */}
              <div className="animate-fadeIn" style={{animationDelay: '0.5s'}} data-chart="lead-sources">
                <LeadSourceChart data={data.leadSources} onRefresh={refreshChart} />
              </div>

              {/* Inventory Status */}
              <div className="animate-fadeIn" style={{animationDelay: '0.6s'}} data-chart="inventory">
                <InventoryStatusChart data={data.inventory} onRefresh={refreshChart} />
              </div>

              {/* Call Activity */}
              <div className="lg:col-span-2 animate-fadeIn" style={{animationDelay: '0.7s'}} data-chart="call-activity">
                <CallActivityChart data={data.callActivity} onRefresh={refreshChart} />
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white rounded-2xl shadow-lg p-6 text-center border border-gray-100">
              <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
                <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-medium">Dashboard updates automatically when data changes</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert Detail Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                🚨 Alert Details
              </h3>
              <button
                onClick={closeAlertModal}
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                  <div className="text-lg font-bold text-gray-900">{selectedAlert.category}</div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Message</label>
                  <div className="text-gray-800">{selectedAlert.message}</div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                  <span className={`inline-flex px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedAlert.priority === 'high' 
                      ? 'bg-red-100 text-red-800' 
                      : selectedAlert.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedAlert.priority?.toUpperCase() || 'LOW'}
                  </span>
                </div>
                {selectedAlert.count && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Count</label>
                    <div className="text-2xl font-bold text-indigo-600">{selectedAlert.count}</div>
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    // Navigate to relevant page based on category
                    switch (selectedAlert.category.toLowerCase()) {
                      case 'tasks':
                        window.open('/tasks', '_blank');
                        break;
                      case 'leads':
                        window.open('/leads', '_blank');
                        break;
                      case 'inventory':
                        window.open('/inventory', '_blank');
                        break;
                      default:
                        console.log('Alert action:', selectedAlert);
                    }
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all"
                >
                  View Details
                </button>
                <button
                  onClick={closeAlertModal}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerAnalyticsDashboard;
