import { jsPDF } from 'jspdf';

export function downloadPayslipPDF(payslip, employee, company) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Primary Header Banner
  doc.setFillColor(14, 56, 76); // Dark navy #0e384c
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(company?.company_name || 'Saylani Tech Solutions', 14, 20);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('OFFICIAL SALARY DISBURSEMENT STATEMENT', 14, 28);
  doc.text(`PAYROLL PERIOD: ${String(payslip.month).padStart(2, '0')}/${payslip.year}`, pageWidth - 14, 28, { align: 'right' });

  // Status Badge
  doc.setFillColor(11, 99, 229); // Saylani Blue
  doc.roundedRect(pageWidth - 45, 12, 31, 8, 2, 2, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('FINALIZED', pageWidth - 29.5, 17.5, { align: 'center' });

  // Employee Information Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, 48, pageWidth - 28, 36, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Employee Information', 20, 56);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Name:', 20, 65);
  doc.text('Employee Code:', 20, 73);
  doc.text('Department:', 110, 65);
  doc.text('Designation:', 110, 73);

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.text(employee?.name || payslip.employee_name || 'N/A', 55, 65);
  doc.text(employee?.code || payslip.employee_code || 'N/A', 55, 73);
  doc.text(employee?.department || payslip.department_name || 'N/A', 145, 65);
  doc.text(employee?.designation || 'Staff', 145, 73);

  // Attendance Statistics Row
  let y = 92;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Attendance & Working Days Breakdown', 14, y);

  y += 6;
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, pageWidth - 28, 14, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Working Days', 20, y + 6);
  doc.text('Present', 55, y + 6);
  doc.text('Late Arrivals', 85, y + 6);
  doc.text('Half Days', 120, y + 6);
  doc.text('Absent Days', 150, y + 6);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`${payslip.working_days_in_month || 22} days`, 20, y + 11);
  doc.text(`${payslip.present_days || 0} days`, 55, y + 11);
  doc.text(`${payslip.late_days || 0}`, 85, y + 11);
  doc.text(`${payslip.half_days || 0}`, 120, y + 11);
  doc.text(`${payslip.absent_days || 0} days`, 150, y + 11);

  // Earnings and Deductions Table
  y += 24;
  const colWidth = (pageWidth - 32) / 2;

  // Earnings Header
  doc.setFillColor(236, 253, 245);
  doc.rect(14, y, colWidth, 8, 'F');
  doc.setTextColor(6, 95, 70);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Earnings (Allowances)', 20, y + 5.5);
  doc.text('Amount (PKR)', 14 + colWidth - 6, y + 5.5, { align: 'right' });

  // Deductions Header
  doc.setFillColor(254, 242, 242);
  doc.rect(18 + colWidth, y, colWidth, 8, 'F');
  doc.setTextColor(153, 27, 27);
  doc.text('Deductions & Taxes', 24 + colWidth, y + 5.5);
  doc.text('Amount (PKR)', pageWidth - 20, y + 5.5, { align: 'right' });

  // Rows
  const earnings = [
    { label: 'Basic Salary', amount: payslip.basic_salary },
    { label: 'House Rent Allowance (HRA 40%)', amount: payslip.hra },
    { label: 'Medical Allowance (10%)', amount: payslip.medical_allowance },
    { label: 'Other Special Allowances', amount: payslip.other_allowances || 0 }
  ];

  const deductions = [
    { label: 'Attendance / Absence Deduction', amount: payslip.attendance_deduction },
    { label: 'Income Tax (Statutory Slab)', amount: payslip.tax_deduction },
    { label: 'Late Penalty Deduction', amount: Math.round((payslip.late_penalty_days || 0) * (payslip.per_day_rate || 0)) },
    { label: 'Other Deductions', amount: 0 }
  ];

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  let curY = y + 15;
  for (let i = 0; i < 4; i++) {
    const earn = earnings[i];
    const ded = deductions[i];

    // Left: Earnings
    doc.text(earn.label, 20, curY);
    doc.text(`Rs. ${(earn.amount || 0).toLocaleString()}`, 14 + colWidth - 6, curY, { align: 'right' });

    // Right: Deductions
    doc.text(ded.label, 24 + colWidth, curY);
    doc.text(`Rs. ${(ded.amount || 0).toLocaleString()}`, pageWidth - 20, curY, { align: 'right' });

    curY += 8;
  }

  // Subtotals
  curY += 2;
  doc.setDrawColor(203, 213, 225);
  doc.line(14, curY, 14 + colWidth, curY);
  doc.line(18 + colWidth, curY, pageWidth - 14, curY);

  curY += 7;
  doc.setFont('helvetica', 'bold');
  doc.text('Gross Earnings', 20, curY);
  doc.text(`Rs. ${(payslip.gross_salary || 0).toLocaleString()}`, 14 + colWidth - 6, curY, { align: 'right' });

  const totalDeductions = (payslip.attendance_deduction || 0) + (payslip.tax_deduction || 0);
  doc.text('Total Deductions', 24 + colWidth, curY);
  doc.text(`Rs. ${totalDeductions.toLocaleString()}`, pageWidth - 20, curY, { align: 'right' });

  // Net Pay Highlight Box
  curY += 16;
  doc.setFillColor(14, 56, 76);
  doc.roundedRect(14, curY, pageWidth - 28, 24, 3, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('NET SALARY PAYABLE:', 24, curY + 15);

  doc.setFontSize(18);
  doc.setTextColor(56, 189, 248); // Cyan highlight
  doc.text(`Rs. ${(payslip.net_salary || 0).toLocaleString()}`, pageWidth - 24, curY + 16, { align: 'right' });

  // Footer / Verification
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated on ${new Date().toLocaleDateString()} · HCM Lite by Saylani Hackathon`, 14, curY + 36);
  doc.text('This is a computer-generated payroll advice and requires no physical signature.', pageWidth - 14, curY + 36, { align: 'right' });

  // Download trigger
  const fileName = `Payslip_${payslip.employee_code || 'EMP'}_${payslip.month}_${payslip.year}.pdf`;
  doc.save(fileName);
}
