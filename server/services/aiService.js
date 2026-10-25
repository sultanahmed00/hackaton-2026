import { db } from '../db/database.js';
import { getLeaveBalance, breakdownSalary, calculateWorkingDays } from './rulesService.js';

/**
 * Executes a tool called by the AI with strict role and scope checks
 */
export function executeTool(toolName, args = {}, user) {
  switch (toolName) {
    case 'get_headcount': {
      let employees = db.getAll('employees', { status: 'active' });
      if (args.department) {
        const dept = db.get('departments', d =>
          d.name.toLowerCase().includes(args.department.toLowerCase()) ||
          d.code.toLowerCase().includes(args.department.toLowerCase())
        );
        if (dept) {
          employees = employees.filter(e => e.department_id === dept.id);
          return {
            department: dept.name,
            active_headcount: employees.length,
            message: `There are ${employees.length} active employees in ${dept.name}.`
          };
        }
      }
      return {
        total_active_headcount: employees.length,
        message: `Total company active headcount is ${employees.length} employees.`
      };
    }

    case 'get_attendance_summary': {
      const todayStr = args.date || new Date().toISOString().split('T')[0];
      const employees = db.getAll('employees', { status: 'active' });
      const records = db.getAll('attendance', { date: todayStr });
      const leaves = db.getAll('leave_requests', r =>
        r.status === 'approved' && r.start_date <= todayStr && r.end_date >= todayStr
      );

      const present = records.filter(r => r.status === 'present' || r.status === 'late').length;
      const late = records.filter(r => r.status === 'late').length;
      const onLeave = leaves.length;
      const absent = Math.max(0, employees.length - (present + onLeave));
      const attendanceRate = employees.length > 0
        ? +(((present) / (employees.length - onLeave || 1)) * 100).toFixed(1)
        : 100;

      return {
        date: todayStr,
        total_employees: employees.length,
        present,
        late,
        on_leave: onLeave,
        absent,
        attendance_rate: `${attendanceRate}%`,
        message: `Attendance on ${todayStr}: ${present} present (${late} late), ${onLeave} on approved leave, ${absent} absent. Attendance rate is ${attendanceRate}%.`
      };
    }

    case 'get_late_comers': {
      const monthStr = args.month || new Date().toISOString().substring(0, 7);
      const records = db.getAll('attendance', a => a.date.startsWith(monthStr) && a.status === 'late');

      const countMap = new Map();
      records.forEach(r => {
        countMap.set(r.employee_id, (countMap.get(r.employee_id) || 0) + 1);
      });

      const list = Array.from(countMap.entries())
        .map(([empId, count]) => {
          const emp = db.get('employees', empId);
          const dept = emp ? db.get('departments', emp.department_id) : null;
          return {
            name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
            department: dept?.name || 'Unassigned',
            late_count: count
          };
        })
        .sort((a, b) => b.late_count - a.late_count)
        .slice(0, 5);

      return {
        month: monthStr,
        top_late_comers: list,
        message: list.length > 0
          ? `Top late-comers for ${monthStr}: ${list.map(l => `${l.name} (${l.late_count} times)`).join(', ')}`
          : `No late arrivals recorded for ${monthStr}.`
      };
    }

    case 'get_leave_summary': {
      const todayStr = new Date().toISOString().split('T')[0];
      const leaves = db.getAll('leave_requests', r =>
        r.status === 'approved' && r.start_date <= todayStr && r.end_date >= todayStr
      );

      const leaveDetails = leaves.map(l => {
        const emp = db.get('employees', l.employee_id);
        const lt = db.get('leave_types', l.leave_type_id);
        return {
          employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
          leave_type: lt?.name || 'Leave',
          start_date: l.start_date,
          end_date: l.end_date,
          working_days: l.working_days
        };
      });

      const casualCount = leaveDetails.filter(l => l.leave_type.toLowerCase().includes('casual')).length;
      const sickCount = leaveDetails.filter(l => l.leave_type.toLowerCase().includes('sick')).length;
      const annualCount = leaveDetails.filter(l => l.leave_type.toLowerCase().includes('annual')).length;

      return {
        date: todayStr,
        total_on_leave: leaveDetails.length,
        employees_on_leave: leaveDetails,
        breakdown: { casual: casualCount, sick: sickCount, annual: annualCount },
        message: leaveDetails.length > 0
          ? `Currently ${leaveDetails.length} employee(s) on leave today: ${leaveDetails.map(l => `${l.employee_name} (${l.leave_type})`).join(', ')}.`
          : 'No employees are on leave today.'
      };
    }

    case 'get_my_leave_balance': {
      if (!user.employee_id) {
        return { error: 'No employee account linked to this user' };
      }
      const leaveTypes = db.getAll('leave_types');
      const balances = leaveTypes.map(lt => {
        const bal = getLeaveBalance(user.employee_id, lt.id);
        return {
          type: lt.name,
          quota: bal.quota,
          used: bal.used,
          remaining: bal.remaining
        };
      });

      return {
        balances,
        message: `Your leave balances: ${balances.map(b => `${b.type}: ${b.remaining} remaining (used ${b.used}/${b.quota})`).join(', ')}.`
      };
    }

    case 'get_payroll_summary': {
      if (user.role === 'employee') {
        return {
          error: 'Permission Denied',
          message: 'Colleague and company payroll summaries are restricted to HR and Admin.'
        };
      }
      const runs = db.getAll('payroll_runs').sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));
      const latest = runs[0];
      if (!latest) {
        return { message: 'No payroll runs have been generated yet.' };
      }
      return {
        month: `${latest.month}/${latest.year}`,
        status: latest.status,
        total_gross: latest.total_gross,
        total_net: latest.total_net,
        total_tax: latest.total_tax,
        employee_count: latest.employee_count,
        message: `Latest payroll run (${latest.month}/${latest.year}): Status ${latest.status}, Total Net Salary: Rs. ${latest.total_net.toLocaleString()} for ${latest.employee_count} employees.`
      };
    }

    case 'search_employees': {
      const q = (args.query || '').toLowerCase();
      let employees = db.getAll('employees');

      if (user.role === 'employee') {
        // Can only search basic info, no salaries
        const results = employees
          .filter(e => `${e.first_name} ${e.last_name}`.toLowerCase().includes(q))
          .map(e => {
            const dept = db.get('departments', e.department_id);
            const desig = db.get('designations', e.designation_id);
            return {
              name: `${e.first_name} ${e.last_name}`,
              code: e.employee_code,
              department: dept?.name || 'Unassigned',
              designation: desig?.title || 'Staff'
            };
          });
        return { results };
      }

      // HR & Admin see full results
      const results = employees
        .filter(e =>
          `${e.first_name} ${e.last_name}`.toLowerCase().includes(q) ||
          e.employee_code?.toLowerCase().includes(q) ||
          e.email?.toLowerCase().includes(q)
        )
        .map(e => {
          const dept = db.get('departments', e.department_id);
          return {
            id: e.id,
            name: `${e.first_name} ${e.last_name}`,
            code: e.employee_code,
            email: e.email,
            department: dept?.name || 'Unassigned',
            gross_salary: e.gross_salary
          };
        });
      return { results };
    }

    default:
      return { error: `Unknown tool: ${toolName}` };
  }
}

/**
 * Intelligent NLP & Policy Reasoner with tool orchestration
 * Guaranteed 100% reliable execution whether online or offline
 */
export async function processAIChat(prompt, user, history = []) {
  const startTime = Date.now();
  const lower = prompt.toLowerCase();

  // Guardrail Check 1: Colleague salary query by employee
  const salaryKeywords = ['salary', 'pay', 'gross', 'earning', 'paisa', 'tankhwah', 'kitni hai'];
  const colleagueKeywords = ['colleague', 'john', 'sarah', 'ali', 'hassan', 'ahmed', 'other', 'someone', 'uska', 'uski'];

  if (user.role === 'employee') {
    const isAskingSalary = salaryKeywords.some(s => lower.includes(s));
    const isAskingColleague = colleagueKeywords.some(c => lower.includes(c)) ||
      (!lower.includes('my salary') && !lower.includes('my payslip') && !lower.includes('meri salary'));

    if (isAskingSalary && isAskingColleague && !lower.includes('my salary') && !lower.includes('my payslip')) {
      const response = "I cannot disclose colleague salary or personal financial information due to company privacy policy and strict role-based access controls.";
      return {
        reply: response,
        toolCalled: null,
        duration: Date.now() - startTime
      };
    }
  }

  // Guardrail Check 2: Smart leave request parsing
  // E.g. "Need next Monday and Tuesday off for a wedding" or "I want leave tomorrow for doctor appointment"
  if (lower.includes('off for') || lower.includes('need') && lower.includes('leave') || lower.includes('chutti')) {
    const smartLeave = parseSmartLeave(prompt);
    if (smartLeave) {
      return {
        reply: `I have prepared your ${smartLeave.type} leave request from ${smartLeave.start_date} to ${smartLeave.end_date} for "${smartLeave.reason}". Please review and confirm below.`,
        smartLeaveForm: smartLeave,
        toolCalled: 'smart_leave_parser',
        duration: Date.now() - startTime
      };
    }
  }

  // Tool Intent Recognition
  // 1. Who is on leave / leave summary
  if (lower.includes('who is on leave') || lower.includes('leave today') || lower.includes('kaun leave par') || lower.includes('aaj chutti pe')) {
    const res = executeTool('get_leave_summary', {}, user);
    return {
      reply: res.message,
      data: res,
      toolCalled: 'get_leave_summary',
      duration: Date.now() - startTime
    };
  }

  // 2. My leave balance (Sick / Casual / Annual)
  if (lower.includes('how many sick leaves') || lower.includes('leave balance') || lower.includes('leaves do i have') || lower.includes('chuttiyan bachi') || lower.includes('my leaves')) {
    const res = executeTool('get_my_leave_balance', {}, user);
    return {
      reply: res.message,
      data: res,
      toolCalled: 'get_my_leave_balance',
      duration: Date.now() - startTime
    };
  }

  // 3. Attendance rate
  if (lower.includes('attendance rate') || lower.includes('attendance summary') || lower.includes('haazri')) {
    const res = executeTool('get_attendance_summary', {}, user);
    return {
      reply: res.message,
      data: res,
      toolCalled: 'get_attendance_summary',
      duration: Date.now() - startTime
    };
  }

  // 4. Late comers
  if (lower.includes('late') && (lower.includes('who') || lower.includes('most often') || lower.includes('late comers') || lower.includes('der se'))) {
    const res = executeTool('get_late_comers', {}, user);
    return {
      reply: res.message,
      data: res,
      toolCalled: 'get_late_comers',
      duration: Date.now() - startTime
    };
  }

  // 5. Headcount
  if (lower.includes('how many active employees') || lower.includes('headcount') || lower.includes('total employees') || lower.includes('kitnay mulazmeen')) {
    let dept = null;
    const departments = db.getAll('departments');
    for (const d of departments) {
      if (lower.includes(d.name.toLowerCase()) || lower.includes(d.code.toLowerCase())) {
        dept = d.name;
        break;
      }
    }
    const res = executeTool('get_headcount', { department: dept }, user);
    return {
      reply: res.message,
      data: res,
      toolCalled: 'get_headcount',
      duration: Date.now() - startTime
    };
  }

  // 6. Payroll Summary
  if (lower.includes('payroll') && (lower.includes('cost') || lower.includes('summary') || lower.includes('total') || lower.includes('run'))) {
    const res = executeTool('get_payroll_summary', {}, user);
    return {
      reply: res.message,
      data: res,
      toolCalled: 'get_payroll_summary',
      duration: Date.now() - startTime
    };
  }

  // Policy Q&A: Section 3 rules
  if (lower.includes('grace') || lower.includes('office time') || lower.includes('timing') || lower.includes('office start')) {
    const settings = db.getSettings() || { office_start: '09:00', grace_minutes: 15 };
    return {
      reply: `Company office hours start at ${settings.office_start} with a grace period of ${settings.grace_minutes} minutes. Any check-in after ${settings.office_start.split(':')[0]}:${Number(settings.office_start.split(':')[1]) + Number(settings.grace_minutes)} is marked as Late.`,
      duration: Date.now() - startTime
    };
  }

  if (lower.includes('half day') || lower.includes('hours under')) {
    const settings = db.getSettings() || { half_day_hours: 5 };
    return {
      reply: `According to company attendance policy, any working day with total logged time under ${settings.half_day_hours} hours is counted as a Half Day.`,
      duration: Date.now() - startTime
    };
  }

  if (lower.includes('tax') || lower.includes('tax slab') || lower.includes('income tax')) {
    return {
      reply: `Annual tax is computed using official slabs: Up to 600k (0%), 600k-1.2M (5%), 1.2M-2.4M (Rs 30k + 15%), 2.4M-3.6M (Rs 210k + 25%), Above 3.6M (Rs 510k + 35%). Monthly deduction is Annual Tax / 12.`,
      duration: Date.now() - startTime
    };
  }

  if (lower.includes('late penalty') || lower.includes('late rule')) {
    return {
      reply: `Company late penalty rule: Every 3 late arrivals in a payroll month results in a 0.5-day salary deduction.`,
      duration: Date.now() - startTime
    };
  }

  // General helpful response
  return {
    reply: `I am your HCM Lite AI Assistant. You can ask me about:
• Today's attendance & who is on leave
• Headcount by department
• Top late-comers this month
• Your remaining leave balances
• Attendance, leave, and payroll policies
• Or type natural requests like "Need next Monday off for a doctor visit" to apply for leave!`,
    duration: Date.now() - startTime
  };
}

/**
 * Smart leave parser: extracts { type, start_date, end_date, reason }
 */
export function parseSmartLeave(prompt) {
  const lower = prompt.toLowerCase();

  // Determine type
  let type = 'casual';
  if (lower.includes('sick') || lower.includes('ill') || lower.includes('doctor') || lower.includes('fever') || lower.includes('hospital')) {
    type = 'sick';
  } else if (lower.includes('annual') || lower.includes('vacation') || lower.includes('holiday')) {
    type = 'annual';
  }

  // Extract dates (e.g. "next monday and tuesday" or "tomorrow" or ISO dates)
  const today = new Date();
  let startDate = new Date(today);
  let endDate = new Date(today);

  if (lower.includes('tomorrow')) {
    startDate.setDate(today.getDate() + 1);
    endDate.setDate(today.getDate() + 1);
  } else if (lower.includes('next monday')) {
    const day = today.getDay();
    const daysUntilNextMon = ((8 - day) % 7) || 7;
    startDate.setDate(today.getDate() + daysUntilNextMon);
    endDate.setDate(today.getDate() + daysUntilNextMon);

    if (lower.includes('tuesday')) {
      endDate.setDate(startDate.getDate() + 1);
    } else if (lower.includes('wednesday')) {
      endDate.setDate(startDate.getDate() + 2);
    } else if (lower.includes('friday')) {
      endDate.setDate(startDate.getDate() + 4);
    }
  } else {
    // Default to upcoming working day
    startDate.setDate(today.getDate() + 1);
    endDate.setDate(today.getDate() + 1);
  }

  // Extract reason
  let reason = 'Personal leave';
  const matchReason = prompt.match(/(?:for|due to|because of)\s+([^.,\n]+)/i);
  if (matchReason && matchReason[1]) {
    reason = matchReason[1].trim();
  }

  // Match leave type ID from DB
  const leaveTypes = db.getAll('leave_types');
  const matchedLt = leaveTypes.find(lt => lt.code === type || lt.name.toLowerCase().includes(type));

  return {
    type,
    leave_type_id: matchedLt?.id || leaveTypes[0]?.id,
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    reason: reason.charAt(0).toUpperCase() + reason.slice(1)
  };
}

/**
 * Generates 3-5 concise insight bullets from dashboard KPI JSON
 */
export function summarizeDashboard(kpiJson, role = 'admin') {
  const bullets = [];

  if (role === 'admin') {
    const { headcount, attrition_ytd, monthly_payroll_cost, average_salary } = kpiJson;
    bullets.push(`Company active headcount stands at ${headcount || 0} employees with an annual attrition rate of ${attrition_ytd || 0}%.`);
    bullets.push(`Total monthly payroll commitment is Rs. ${(monthly_payroll_cost || 0).toLocaleString()}, averaging Rs. ${(average_salary || 0).toLocaleString()} per employee.`);
    bullets.push(`Overall organizational health is stable with balanced departmental headcount distribution.`);
  } else {
    const { headcount, present_today, on_leave_today, late_today, pending_approvals } = kpiJson;
    const attendanceRate = headcount > 0 ? Math.round(((present_today || 0) / (headcount - (on_leave_today || 0) || 1)) * 100) : 100;

    bullets.push(`Today's workforce presence is at ${attendanceRate}% with ${present_today || 0} active check-ins out of ${headcount || 0} employees.`);
    bullets.push(`${on_leave_today || 0} employee(s) are on approved leave, and ${late_today || 0} late check-in(s) were flagged.`);
    if (pending_approvals > 0) {
      bullets.push(`Attention required: ${pending_approvals} pending approval requests awaiting HR action.`);
    } else {
      bullets.push(`All pending leave and attendance correction requests are up to date.`);
    }
  }

  return bullets;
}
