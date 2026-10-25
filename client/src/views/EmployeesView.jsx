import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  FileSpreadsheet,
  Download,
  Eye,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '../utils/api';
import Employee360Modal from './Employee360Modal';
import CsvImportModal from './CsvImportModal';

export default function EmployeesView({ currentRole }) {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedEmp360Id, setSelectedEmp360Id] = useState(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState(null);

  // Register Form State
  const [regForm, setRegForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    address: '',
    department_id: '',
    designation_id: '',
    hire_date: new Date().toISOString().split('T')[0],
    status: 'active',
    gender: 'male',
    gross_salary: 80000
  });
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState(null);

  useEffect(() => {
    fetchEmployees();
    fetchSetupData();
  }, [page, search, selectedDept, selectedStatus]);

  const fetchSetupData = async () => {
    try {
      const [depts, desigs] = await Promise.all([
        apiRequest('/setup/departments'),
        apiRequest('/setup/designations')
      ]);
      setDepartments(depts);
      setDesignations(desigs);
      if (depts.length > 0 && !regForm.department_id) {
        setRegForm(prev => ({ ...prev, department_id: depts[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: 10,
        ...(search ? { search } : {}),
        ...(selectedDept ? { department_id: selectedDept } : {}),
        ...(selectedStatus ? { status: selectedStatus } : {})
      });
      const res = await apiRequest(`/employees?${params.toString()}`);
      setEmployees(res.employees || []);
      setTotal(res.total || 0);
      setPages(res.pages || 1);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError(null);

    try {
      const res = await apiRequest('/employees', {
        method: 'POST',
        body: JSON.stringify(regForm)
      });
      setCreatedCredentials(res.login_credentials);
      setIsRegisterModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setRegError(err.message || 'Registration failed');
    } finally {
      setRegLoading(false);
    }
  };

  const handleExportCSV = () => {
    const token = localStorage.getItem('hcm_token');
    window.open(`/api/employees/export/csv?token=${token}`, '_blank');
  };

  // Salary breakdown preview
  const basic = Math.round((regForm.gross_salary || 0) / 1.5);
  const hra = Math.round(basic * 0.40);
  const med = Math.round(basic * 0.10);

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            Employee Directory & Operations
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage profiles, salary allocations, CSV imports, and 360-degree views.
          </p>
        </div>

        {(currentRole === 'admin' || currentRole === 'hr') && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCsvModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              CSV Import
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-500" />
              Export
            </button>
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Register Employee
            </button>
          </div>
        )}
      </div>

      {/* Temporary Password Alert banner after registration */}
      {createdCredentials && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 flex items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs text-emerald-900 dark:text-emerald-200">
                Employee Registered & Login Created!
              </div>
              <div className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Email: <strong>{createdCredentials.email}</strong> · Temporary Password: <code className="bg-emerald-200/60 dark:bg-emerald-900 px-1.5 py-0.5 rounded font-bold font-mono">{createdCredentials.temporary_password}</code>
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Employee will be required to change their temporary password upon first sign-in.
              </div>
            </div>
          </div>
          <button
            onClick={() => setCreatedCredentials(null)}
            className="p-1 rounded-lg text-emerald-600 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by employee name, code, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none"
          >
            <option value="">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-semibold outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="resigned">Resigned</option>
            <option value="terminated">Terminated</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
              <tr>
                <th className="p-3.5">Employee</th>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Designation</th>
                <th className="p-3.5">Hire Date</th>
                <th className="p-3.5">Gross Salary</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No employees matching criteria.
                  </td>
                </tr>
              ) : (
                employees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={emp.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=user'}
                          alt=""
                          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-700 object-cover shrink-0"
                        />
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white">
                            {emp.first_name} {emp.last_name}
                          </div>
                          <div className="text-[10px] text-slate-400">{emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-600 dark:text-slate-300">
                      {emp.employee_code}
                    </td>
                    <td className="p-3.5 font-medium text-slate-700 dark:text-slate-300">
                      {emp.department_name}
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400">
                      {emp.designation_title}
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {emp.hire_date}
                    </td>
                    <td className="p-3.5 font-semibold text-slate-800 dark:text-slate-200">
                      Rs. {(emp.gross_salary || 0).toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        emp.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : emp.status === 'probation'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => setSelectedEmp360Id(emp.id)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        360 View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {employees.length} of {total} employees</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 font-bold">{page} / {pages}</span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page >= pages}
                className="p-1 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Register Employee Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">Register New Employee</h3>
                  <p className="text-xs text-slate-500">Creates profile, salary structure & auto-generates temporary login.</p>
                </div>
              </div>
              <button onClick={() => setIsRegisterModalOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {regError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 text-rose-700 text-xs">
                {regError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={regForm.first_name}
                    onChange={(e) => setRegForm({ ...regForm, first_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={regForm.last_name}
                    onChange={(e) => setRegForm({ ...regForm, last_name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={regForm.email}
                    onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={regForm.phone}
                    onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Department</label>
                  <select
                    required
                    value={regForm.department_id}
                    onChange={(e) => setRegForm({ ...regForm, department_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none font-semibold"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Designation</label>
                  <select
                    value={regForm.designation_id}
                    onChange={(e) => setRegForm({ ...regForm, designation_id: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  >
                    <option value="">Select Designation</option>
                    {designations.map(d => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Hire Date</label>
                  <input
                    type="date"
                    required
                    value={regForm.hire_date}
                    onChange={(e) => setRegForm({ ...regForm, hire_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">Status & Gender</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={regForm.status}
                      onChange={(e) => setRegForm({ ...regForm, status: e.target.value })}
                      className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    >
                      <option value="active">Active</option>
                      <option value="probation">Probation</option>
                    </select>
                    <select
                      value={regForm.gender}
                      onChange={(e) => setRegForm({ ...regForm, gender: e.target.value })}
                      className="px-2 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-xs"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Salary Section & Formula Breakdown (Gross = 1.5 * Basic) */}
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 space-y-2">
                <label className="block text-xs font-bold text-blue-900 dark:text-blue-200">
                  Gross Monthly Salary (PKR)
                </label>
                <input
                  type="number"
                  min="10000"
                  step="1000"
                  required
                  value={regForm.gross_salary}
                  onChange={(e) => setRegForm({ ...regForm, gross_salary: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-blue-300 dark:border-blue-800 bg-white dark:bg-slate-900 text-sm font-bold text-blue-900 dark:text-blue-200 outline-none"
                />

                <div className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                  <div>Basic (Gross / 1.5): <strong>Rs. {basic.toLocaleString()}</strong></div>
                  <div>HRA (40% Basic): <strong>Rs. {hra.toLocaleString()}</strong></div>
                  <div>Medical (10% Basic): <strong>Rs. {med.toLocaleString()}</strong></div>
                </div>
              </div>

              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer"
              >
                {regLoading ? 'Registering & Generating Login...' : 'Complete Employee Registration'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 360 Profile Modal */}
      <Employee360Modal
        employeeId={selectedEmp360Id}
        isOpen={!!selectedEmp360Id}
        onClose={() => setSelectedEmp360Id(null)}
        currentRole={currentRole}
        onUpdated={fetchEmployees}
      />

      {/* CSV Import Modal */}
      <CsvImportModal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        onSuccess={(msg) => {
          fetchEmployees();
        }}
      />
    </div>
  );
}
