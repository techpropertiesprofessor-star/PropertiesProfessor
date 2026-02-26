/**
 * ============================================================
 * PDF PAYSLIP GENERATION SERVICE — pdfkit Implementation
 * ============================================================
 * Generates a professional payslip PDF matching the reference template.
 *
 * Layout:
 *   1. Header   — Company logo + company name (blue banner)
 *   2. Company Details  (left)  | Employee Details (right)
 *   3. Earnings & Deductions table (4-column layout)
 *   4. Attendance summary
 *   5. Director signature + footer note
 * ============================================================
 */

const PDFDocument = require('pdfkit');
const path = require('path');
const fs   = require('fs');

const LOGO_PATH = path.join(__dirname, '../../uploads/logo.png');
const SIG_PATH  = path.join(__dirname, '../../uploads/directorsignature.png');

const COMPANY = {
  name:    process.env.COMPANY_NAME    || 'Properties Professor',
  address: process.env.COMPANY_ADDRESS || 'Noida, Uttar Pradesh, India',
  pan:     process.env.COMPANY_PAN     || 'AAACB1234C',
};

// ── Helpers ──────────────────────────────────────────────────────────
const fmt = (n) =>
  `Rs.${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function getMonthLabel(monthStr) {
  if (!monthStr) return '';
  const [y, m] = monthStr.split('-');
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

function safeImg(doc, imgPath, x, y, opts) {
  if (fs.existsSync(imgPath)) {
    try { doc.image(imgPath, x, y, opts); return true; } catch (_) {}
  }
  return false;
}

/** Draw a labelled section box. Returns the height used. */
function drawSectionBox(doc, x, y, width, title, fields) {
  const ROW_H  = 20;
  const HEAD_H = 26;
  const boxH   = HEAD_H + fields.length * ROW_H + 6;

  doc.rect(x, y, width, boxH).fillAndStroke('#ffffff', '#cccccc');
  doc.rect(x, y, width, HEAD_H).fillAndStroke('#f0f4ff', '#cccccc');
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor('#1e3a8a')
     .text(title, x + 8, y + 8, { width: width - 16, lineBreak: false });

  let ry = y + HEAD_H;
  fields.forEach(([label, value], i) => {
    const bg = i % 2 === 0 ? '#fafafa' : '#ffffff';
    doc.rect(x, ry, width, ROW_H).fillAndStroke(bg, '#eeeeee');
    doc.font('Helvetica').fontSize(8).fillColor('#666666')
       .text(label + ':', x + 8, ry + 5, { width: width * 0.44, lineBreak: false });
    const valX = x + width * 0.45;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#333333')
       .text(String(value || '—'), valX, ry + 5, {
         width: width - (valX - x) - 6, lineBreak: false,
       });
    ry += ROW_H;
  });
  return boxH;
}

/** Draw the 4-column Earnings & Deductions table. Returns new y after table. */
function drawEarningsDeductionsTable(doc, x, y, totalW, payroll) {
  const c1 = Math.floor(totalW * 0.365);
  const c2 = Math.floor(totalW * 0.135);
  const c3 = Math.floor(totalW * 0.345);
  const c4 = totalW - c1 - c2 - c3;

  const HEADER_H = 26;
  const ROW_H    = 22;

  // column headers
  const headers = [
    { x: x,               w: c1, text: 'EARNINGS'   },
    { x: x + c1,          w: c2, text: 'AMOUNT'     },
    { x: x + c1 + c2,     w: c3, text: 'DEDUCTIONS' },
    { x: x + c1 + c2 + c3,w: c4, text: 'AMOUNT'     },
  ];
  headers.forEach(h => {
    doc.rect(h.x, y, h.w, HEADER_H).fillAndStroke('#cccccc', '#999999');
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#222222')
       .text(h.text, h.x + 4, y + 8, { width: h.w - 8, align: 'center', lineBreak: false });
  });
  y += HEADER_H;

  // data rows
  const earningsRows = [
    ['Basic Salary',      payroll.basic             || 0],
    ['HRA',               payroll.hra               || 0],
    ['Conveyance',        payroll.conveyance        || 0],
    ['Special Allowance', payroll.specialAllowance  || 0],
    ['Bonus/Incentive',  (payroll.bonus||0)+(payroll.incentives||0)],
    ['Other Allowance',   0],
  ];
  const deductionRows = [
    ['PF (12%)',        payroll.pfDeduction         || 0],
    ['ESI',             0],
    ['Professional Tax',payroll.taxDeduction        || 0],
    ['TDS',             0],
    ['Loan/Advance',    payroll.attendanceDeduction || 0],
    ['',                null],
  ];

  for (let i = 0; i < earningsRows.length; i++) {
    const [eLabel, eAmt] = earningsRows[i];
    const [dLabel, dAmt] = deductionRows[i];
    const bg = i % 2 === 0 ? '#ffffff' : '#f9f9f9';

    doc.rect(x,                y, c1, ROW_H).fillAndStroke(bg, '#dddddd');
    doc.rect(x + c1,           y, c2, ROW_H).fillAndStroke(bg, '#dddddd');
    doc.rect(x + c1 + c2,      y, c3, ROW_H).fillAndStroke(bg, '#dddddd');
    doc.rect(x + c1 + c2 + c3, y, c4, ROW_H).fillAndStroke(bg, '#dddddd');

    doc.font('Helvetica').fontSize(8.5).fillColor('#333333')
       .text(eLabel, x + 6, y + 6, { width: c1 - 12, lineBreak: false });
    if (eAmt > 0)
      doc.font('Helvetica').fontSize(8.5).fillColor('#333333')
         .text(fmt(eAmt), x + c1 + 3, y + 6, { width: c2 - 6, align: 'right', lineBreak: false });

    if (dLabel)
      doc.font('Helvetica').fontSize(8.5).fillColor('#333333')
         .text(dLabel, x + c1 + c2 + 6, y + 6, { width: c3 - 12, lineBreak: false });
    if (dAmt !== null && dAmt > 0)
      doc.font('Helvetica').fontSize(8.5).fillColor('#333333')
         .text(fmt(dAmt), x + c1+c2+c3 + 3, y + 6, { width: c4 - 6, align: 'right', lineBreak: false });

    y += ROW_H;
  }

  // Gross salary / total deductions summary row
  doc.rect(x,               y, c1, ROW_H).fillAndStroke('#e2e8f0', '#999999');
  doc.rect(x + c1,          y, c2, ROW_H).fillAndStroke('#e2e8f0', '#999999');
  doc.rect(x + c1 + c2,     y, c3, ROW_H).fillAndStroke('#e2e8f0', '#999999');
  doc.rect(x + c1 + c2 + c3,y, c4, ROW_H).fillAndStroke('#e2e8f0', '#999999');

  doc.font('Helvetica-Bold').fontSize(9).fillColor('#111111')
     .text('GROSS SALARY', x + 6, y + 6, { width: c1 - 12, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#111111')
     .text(fmt(payroll.grossSalary || 0), x + c1 + 3, y + 6, { width: c2 - 6, align: 'right', lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#111111')
     .text('TOTAL DEDUCTION', x + c1 + c2 + 6, y + 6, { width: c3 - 12, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#111111')
     .text(fmt(payroll.totalDeductions || 0), x + c1+c2+c3 + 3, y + 6, { width: c4 - 6, align: 'right', lineBreak: false });
  y += ROW_H;

  // Net salary row (green)
  const NET_H = 28;
  doc.rect(x, y, totalW, NET_H).fillAndStroke('#15803d', '#0f5d2f');
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('white')
     .text('NET SALARY', x + 8, y + 8, { width: c1 - 12, lineBreak: false });
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor('white')
     .text(fmt(payroll.netSalary || 0), x + c1 + 4, y + 8, {
       width: totalW - c1 - 14, align: 'right', lineBreak: false,
     });
  y += NET_H;
  return y;
}

/** Main payslip content builder */
function buildPayslip(doc, payroll, employee) {
  const margin   = 40;
  const pageW    = 595.28;
  const contentW = pageW - margin * 2;
  let   y        = margin;

  // 1. HEADER BANNER
  const BANNER_H = 85;
  doc.rect(margin, y, contentW, BANNER_H).fill('#1e3a8a');

  let logoW = 0;
  if (safeImg(doc, LOGO_PATH, margin + 10, y + 8, { width: 66, height: 66, fit: [66, 66] })) {
    logoW = 76;
  }
  const textStartX = margin + logoW + 8;
  const textAreaW  = contentW - logoW - 16;

  doc.fillColor('white').font('Helvetica-Bold').fontSize(17)
     .text(COMPANY.name, textStartX, y + 12, { width: textAreaW, lineBreak: false });
  doc.fillColor('#bfdbfe').font('Helvetica').fontSize(9)
     .text('Professional Payroll System', textStartX, y + 36, { width: textAreaW, lineBreak: false });
  doc.fillColor('#facc15').font('Helvetica-Bold').fontSize(10)
     .text(`PAYSLIP — ${getMonthLabel(payroll.month)}`, textStartX, y + 58, { width: textAreaW, lineBreak: false });

  y += BANNER_H + 14;

  // 2. COMPANY DETAILS + EMPLOYEE DETAILS (two columns)
  const colW     = Math.floor((contentW - 10) / 2);
  const payslipNo = payroll.payslipNumber || `PP-${(payroll.month || '').replace('-', '')}-${String(payroll._id || '').slice(-4).toUpperCase()}`;

  const companyFields = [
    ['Company Name',  COMPANY.name],
    ['Address',       COMPANY.address],
    ['Payslip Month', getMonthLabel(payroll.month)],
    ['Payslip No',    payslipNo],
  ];

  const empId    = String(employee?._id || payroll.employeeId || '').slice(-12).toUpperCase();
  const dateJoin = employee?.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
      })
    : 'N/A';

  const employeeFields = [
    ['Employee Name',           employee?.name           || 'N/A'],
    ['Employee ID',             empId],
    ['Designation',             employee?.designation    || employee?.role || 'N/A'],
    ['Department',              employee?.department     || employee?.role || 'General'],
    ['Date of Joining',         dateJoin],
    ['UAN / PF No',             employee?.uanNumber      || 'N/A'],
    ['Bank A/c Last 4 Digits',  employee?.bankAccountLast4 || 'XXXX'],
  ];

  const leftH  = drawSectionBox(doc, margin,              y, colW, 'Company Details',  companyFields);
  const rightH = drawSectionBox(doc, margin + colW + 10,  y, colW, 'Employee Details', employeeFields);
  y += Math.max(leftH, rightH) + 16;

  // 3. EARNINGS & DEDUCTIONS TABLE
  y = drawEarningsDeductionsTable(doc, margin, y, contentW, payroll) + 12;

  // 4. ATTENDANCE SUMMARY BAR
  doc.rect(margin, y, contentW, 22).fillAndStroke('#f1f5f9', '#cccccc');
  doc.font('Helvetica').fontSize(8).fillColor('#444444')
     .text(
       `Attendance — Working: ${payroll.totalWorkingDays||0}  |  Present: ${payroll.presentDays||0}` +
       `  |  Absent: ${payroll.absentDays||0}  |  Half-Day: ${payroll.halfDays||0}  |  Leave: ${payroll.leaveDays||0}`,
       margin + 8, y + 7, { width: contentW - 16, lineBreak: false },
     );
  y += 32;

  // 5. DIRECTOR SIGNATURE
  const sigX = margin + contentW - 145;
  safeImg(doc, SIG_PATH, sigX, y, { width: 135, height: 62, fit: [135, 62] });
  doc.moveTo(sigX, y + 68).lineTo(sigX + 135, y + 68).strokeColor('#333333').lineWidth(0.5).stroke();
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#333333')
     .text('Director / Authorized Signatory', sigX, y + 72, { width: 135, align: 'center', lineBreak: false });
  y += 90;

  // 6. FOOTER
  doc.moveTo(margin, y).lineTo(margin + contentW, y).strokeColor('#cccccc').lineWidth(0.5).stroke();
  y += 8;
  doc.font('Helvetica').fontSize(8).fillColor('#555555')
     .text(
       'This is a system generated payslip and does not require signature.',
       margin, y, { width: contentW, align: 'center', lineBreak: false },
     );
  y += 14;
  doc.font('Helvetica').fontSize(7.5).fillColor('#999999')
     .text(
       `Generated on: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`,
       margin, y, { width: contentW, align: 'center', lineBreak: false },
     );
}

// ── Exported function ─────────────────────────────────────────────────

/**
 * generatePayslipPDF(payroll, employee)
 * Returns a Promise<Buffer> containing the PDF bytes.
 */
async function generatePayslipPDF(payroll, employee) {
  /* pdfkit-based implementation — see buildPayslip() above */
  const monthName = getMonthLabel(payroll.month); // kept for any legacy callers

  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ size: 'A4', margin: 0, bufferPages: true });
    const chunks = [];
    doc.on('data',  (chunk) => chunks.push(chunk));
    doc.on('end',   ()      => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    try {
      buildPayslip(doc, payroll, employee);
    } catch (err) {
      reject(err);
      return;
    }
    doc.end();
  });
}

module.exports = { generatePayslipPDF };
