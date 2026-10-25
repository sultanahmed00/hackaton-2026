# HCM Lite — AI-Assisted Human Capital Management
> **Saylani Hackathon · Challenge Brief**  
> **Date & Venue:** 24 October 2026 · Zaitoon Ashraf IT Park  
> **Submission Portal:** [lms.saylaniit.com](https://lms.saylaniit.com)

---

## 🌟 Overview

**HCM Lite** is an enterprise-grade Human Capital Management web application designed for **Admin**, **HR Operations**, and **Employee Self-Service**, integrated with an **AI Assistant** that operates strictly on real database records using tool calling.

The system is designed with a **clean-slate architecture**: it starts completely empty, guides the administrator through the **First-Run Setup**, and records every employee, attendance event, leave request, and payroll cycle in real time.

---

## 🚀 Quick Start (Run in under 2 minutes)

The project is fully pre-built and self-contained with zero native C++ compilation dependencies and zero database daemon configuration.

### 1. Install Dependencies
```bash
npm install
cd client && npm install && npm run build && cd ..
```

### 2. Start the Application
```bash
npm start
```
The application will launch on **http://localhost:5000**.

---

## 🧑‍💻 Credentials & Testing Accounts

When you launch the app, you can either:
1. **Walk through the First-Run Setup Wizard**: As specified in the hackathon demo script, enter your Company Name, Office Rules, and Admin credentials.
2. **Or click "⚡ Seed Demo Data"**: Instantly populates the exact scenario from the challenge brief (Engineering, HR, and Design departments, sample employees, check-ins, leave requests, and payroll records).

### Seeded Test Accounts:
| Role | Email | Password | Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@saylani.org` | `Password@123` | Full company-level control, org setup, payroll locking, audit logs |
| **HR Operations** | `hr@saylani.org` | `Password@123` | Employee registration, attendance corrections, leave approvals, payroll draft |
| **Employee (Active)** | `ali@saylani.org` | `Password@123` | Lead Software Engineer (Rs. 150,000 gross) |
| **Employee (On Leave)** | `fatima@saylani.org` | `Password@123` | Product Designer (Rs. 85,000 gross, casual leave today) |
| **Employee (New / Temp)** | `zubair@saylani.org` | `Password@123` | Junior Developer (Triggers **Force Password Change** on first sign-in) |

> 💡 **Convenience Feature**: A **1-Click Role Switcher** is pinned to the top navigation bar so judges can effortlessly toggle between Admin, HR, and Employee roles with zero typing!

---

## 📋 25 Functionalities Checklist (Across 9 Modules)

| # | Functionality | Admin | HR | Employee | Implemented Status |
| :-: | :--- | :-: | :-: | :-: | :---: |
| **01** | First-run setup: company profile and Admin account | Manage | — | — | ✅ Complete |
| **02** | Login, logout, change password; role-based menus and dashboards | Own | Own | Own | ✅ Complete |
| **03** | Company settings: office hours (09:00), grace (15 min), weekend, geofence | Manage | View | — | ✅ Complete |
| **04** | Departments, designations, leave types and quotas, public holidays | Manage | View | — | ✅ Complete |
| **05** | Create HR logins; deactivate or reset any login | Manage | — | — | ✅ Complete |
| **06** | Register an employee (creates login + temp pass) and edit details | View | Manage | Own phone & address | ✅ Complete |
| **07** | Employee directory with server search/filters; Employee 360 profile | All | All | Own | ✅ Complete |
| **08** | CSV import with dry-run error report; CSV export | — | Manage | — | ✅ Complete |
| **09** | Check in and check out on web and camera | — | Own | Own | ✅ Complete |
| **10** | Attendance calendar and daily attendance board | All | All | Own | ✅ Complete |
| **11** | Attendance correction: request and approve/reject | View | Approve | Request | ✅ Complete |
| **12** | Apply for or cancel leave; see balance and history | — | Own | Own | ✅ Complete |
| **13** | Approve or reject leave with a comment | View | Approve | — | ✅ Complete |
| **14** | Salary structure per employee (Gross = 1.5 × Basic) | View | Manage | — | ✅ Complete |
| **15** | Monthly payroll: create and review the draft | View | Manage | — | ✅ Complete |
| **16** | Finalize payroll (locks the month; Admin only) | Manage | — | — | ✅ Complete |
| **17** | Payslips with formatted PDF download | All | All | Own | ✅ Complete |
| **18** | Dashboards, KPIs, trends and insight lists with filters | Company | HR | Personal | ✅ Complete |
| **19** | AI assistant chat answering strictly from real database | All data | HR data | Own data | ✅ Complete |
| **20** | AI dashboard summary (3-5 insight bullets using only KPI numbers) | Yes | Yes | — | ✅ Complete |
| **21** | Smart leave: type a sentence, get pre-filled leave form | — | Own | Own | ✅ Complete |
| **22** | Policy Q&A on attendance, leave and payroll rules | Yes | Yes | Yes | ✅ Complete |
| **23** | Announcements broadcasting | Post | Post | Read | ✅ Complete |
| **24** | In-app notifications (leave decisions, payslips, corrections) | Own | Own | Own | ✅ Complete |
| **25** | Immutable audit log of create, update, approve and finalize actions | View | — | — | ✅ Complete |

---

## 🏆 Bonus Features Implemented (+10 Bonus Points)

1. **Camera Attendance with Face Detection + GPS Geofencing (Section 5)**:
   - Live front-camera feed using WebRTC.
   - Canvas-based face boundary box tracking.
   - Real-time GPS coordinate acquisition via Browser Geolocation API.
   - Server-side Haversine distance formula check against the company perimeter set by Admin (rejects if accuracy > 100m or distance > radius).
2. **AI Attrition Risk Score**:
   - Calculated for each employee based on tenure, late frequency, and leave volatility.
3. **Absence Anomaly Detection**:
   - Algorithmic detection of clustered absences (e.g., recurring Monday/Friday patterns).
4. **Late Penalty Rule**:
   - Automatic 0.5-day salary deduction for every 3 late arrivals during the payroll month.
5. **Roman Urdu NLP Understanding**:
   - AI assistant recognizes Roman Urdu questions like *"Meri kitni chuttiyan baqi hain?"* or *"Aaj kaun leave par hai?"*.
6. **Dark Mode & Light Mode**:
   - Instant theme toggle in top navigation bar with persistent local storage.
7. **Direct Payslip PDF Generation**:
   - Official company letterhead payslip generated using `jsPDF` with itemized earnings, statutory tax, and attendance deductions.

---

## 🤖 AI Assistant Capabilities & Guardrails (Section 4)

- **Backend-Only Keys**: Browser never contacts third-party AI APIs directly (`AI_API_KEY` stored only in backend `.env`).
- **Resilient Hybrid Engine**: If an external LLM key is not provided, HCM Lite seamlessly uses its built-in tool-calling engine, ensuring **100% reliable evaluation** during hackathon judging.
- **Strict Role Scoping**:
  - If an **Employee** asks *"What is John's salary?"*, the assistant strictly refuses: *"I cannot disclose colleague salary or personal financial information due to company privacy policy and strict role-based access controls."*
  - Employees can only query their own leave balance.
- **7 Server-Side Tools**:
  1. `get_headcount`
  2. `get_attendance_summary`
  3. `get_late_comers`
  4. `get_leave_summary`
  5. `get_my_leave_balance`
  6. `get_payroll_summary`
  7. `search_employees`
- **Smart Leave Extraction**:
  - Natural sentence: *"Need next Monday and Tuesday off for a wedding"* $\to$ Parsed into `{ type: "casual", start_date: "2026-10-26", end_date: "2026-10-27", reason: "Wedding" }` with an interactive 1-click confirmation card in chat!
- **AI-Generated Label**:
  - Every AI response is stamped with the required `AI-Generated` badge.

---

## ⏱️ 5-Minute Judging Demo Flow

1. **Fresh Install / Reset**: Click **"Fresh Install Reset"** in the top bar $\to$ Welcome wizard opens.
2. **Initialize Admin**: Submit company name *"Saylani Tech Solutions"* and Admin credentials $\to$ Launches Admin dashboard.
3. **Create HR & Employees**: Navigate to **Users & Access** or click **"Seed Demo Data"** to load the hackathon test scenario.
4. **Test Employee Check-In**: Switch to Employee (`ali@saylani.org`), open **Attendance**, click **"Camera Check In"** $\to$ Face box activates and logs check-in.
5. **Smart Leave Flow**: Open **AI Assistant**, type *"Need next Monday and Tuesday off for my sister's wedding"*, and click **"Confirm & Submit Leave"**.
6. **HR Approval**: Switch to HR (`hr@saylani.org`), open **Leave Approval Inbox**, click **"Approve"** with comment *"Approved. Enjoy!"*.
7. **Run Payroll & Admin Lock**: As HR, go to **Monthly Payroll**, click **"Generate / Refresh Draft"**. Switch to Admin, review breakdown, and click **"Finalize & Lock Payroll"**.
8. **Security & Guardrail Check**: Switch back to Employee, ask AI Assistant *"What is John's salary?"* $\to$ Assistant refuses. Download employee payslip PDF. Switch to Admin and view the **Audit Log** with before/after state diffs!

---

*Built with passion for Saylani Hackathon 2026 · Zaitoon Ashraf IT Park.*
