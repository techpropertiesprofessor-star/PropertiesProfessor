/**
 * ============================================================
 * EXCEL EXPORT SERVICE — Professional Payroll Excel Report
 * ============================================================
 * Generates a styled Excel file with:
 *   • Header row with bold styling
 *   • Auto column widths
 *   • Number formatting (₹)
 *   • Grand total row
 *   • Downloadable as .xlsx
 *
 * Uses "exceljs" package.
 * ============================================================
 */
const ExcelJS = require('exceljs');

/**
 * generatePayrollExcel(payrolls)
 *
 * @param {Array} payrolls — Array of populated Payroll documents
 * @param {String} month   — "YYYY-MM"
 * @returns {Buffer}        — Excel file buffer
 */
async function generatePayrollExcel(payrolls, month) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Properties Professor CRM';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(`Payroll ${month}`, {
    properties: { tabColor: { argb: '4472C4' } },
  });

  // ── Define Columns ──
  sheet.columns = [
    { header: 'Employee Name',       key: 'name',                width: 25 },
    { header: 'Designation',          key: 'designation',         width: 18 },
    { header: 'Gross Salary',         key: 'grossSalary',         width: 16 },
    { header: 'PF Deduction',         key: 'pfDeduction',         width: 15 },
    { header: 'Tax Deduction',        key: 'taxDeduction',        width: 15 },
    { header: 'Attendance Deduction', key: 'attendanceDeduction', width: 22 },
    { header: 'Bonus',               key: 'bonus',               width: 12 },
    { header: 'Incentives',          key: 'incentives',           width: 14 },
    { header: 'Total Deduction',     key: 'totalDeductions',      width: 18 },
    { header: 'Net Salary',          key: 'netSalary',            width: 16 },
    { header: 'Status',              key: 'status',               width: 12 },
  ];

  // ── Style Header Row ──
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFF' }, size: 11 };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: '4472C4' },
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 24;
  headerRow.border = {
    bottom: { style: 'medium', color: { argb: '2F5496' } },
  };

  // ── Add Data Rows ──
  const totals = {
    grossSalary: 0, pfDeduction: 0, taxDeduction: 0,
    attendanceDeduction: 0, bonus: 0, incentives: 0,
    totalDeductions: 0, netSalary: 0,
  };

  if (payrolls.length === 0) {
    const emptyRow = sheet.addRow({ name: `No payroll records for ${month}` });
    emptyRow.font = { italic: true, color: { argb: '888888' } };
    sheet.mergeCells(`A${emptyRow.number}:K${emptyRow.number}`);
    emptyRow.getCell(1).alignment = { horizontal: 'center' };
  }

  payrolls.forEach((p) => {
    const emp = p.employeeId || {};
    const row = sheet.addRow({
      name:                emp.name || 'N/A',
      designation:         emp.designation || emp.role || 'N/A',
      grossSalary:         p.grossSalary || 0,
      pfDeduction:         p.pfDeduction || 0,
      taxDeduction:        p.taxDeduction || 0,
      attendanceDeduction: p.attendanceDeduction || 0,
      bonus:               p.bonus || 0,
      incentives:          p.incentives || 0,
      totalDeductions:     p.totalDeductions || 0,
      netSalary:           p.netSalary || 0,
      status:              p.status || 'N/A',
    });

    // Number format for currency columns
    [3, 4, 5, 6, 7, 8, 9, 10].forEach(col => {
      row.getCell(col).numFmt = '₹#,##0.00';
    });

    // Accumulate totals
    totals.grossSalary += p.grossSalary || 0;
    totals.pfDeduction += p.pfDeduction || 0;
    totals.taxDeduction += p.taxDeduction || 0;
    totals.attendanceDeduction += p.attendanceDeduction || 0;
    totals.bonus += p.bonus || 0;
    totals.incentives += p.incentives || 0;
    totals.totalDeductions += p.totalDeductions || 0;
    totals.netSalary += p.netSalary || 0;

    // Alternate row color
    if (sheet.rowCount % 2 === 0) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'D6E4F0' },
      };
    }
  });

  // ── Grand Total Row (only if there are records) ──
  if (payrolls.length > 0) {
  const totalRow = sheet.addRow({
    name: 'GRAND TOTAL',
    designation: '',
    grossSalary: totals.grossSalary,
    pfDeduction: totals.pfDeduction,
    taxDeduction: totals.taxDeduction,
    attendanceDeduction: totals.attendanceDeduction,
    bonus: totals.bonus,
    incentives: totals.incentives,
    totalDeductions: totals.totalDeductions,
    netSalary: totals.netSalary,
    status: '',
  });

  totalRow.font = { bold: true, size: 11 };
  totalRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC000' },
  };
  [3, 4, 5, 6, 7, 8, 9, 10].forEach(col => {
    totalRow.getCell(col).numFmt = '₹#,##0.00';
  });
  totalRow.border = {
    top: { style: 'double', color: { argb: '000000' } },
  };
  } // end if payrolls.length > 0

  // ── Generate Buffer ──
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = { generatePayrollExcel };
