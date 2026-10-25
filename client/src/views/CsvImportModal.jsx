import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, X, FileSpreadsheet, ArrowRight } from 'lucide-react';
import { apiRequest } from '../utils/api';

const SAMPLE_CSV = `first_name,last_name,email,department,gross_salary,hire_date,employee_code
Kamran,Akmal,kamran@saylani.org,Engineering,95000,2025-01-10,EMP-010
Ayesha,Siddiqua,ayesha@saylani.org,Design & UX,80000,2025-02-15,EMP-011
Bilal,Saeed,bilal@saylani.org,Engineering,110000,2024-11-01,EMP-012`;

export default function CsvImportModal({ isOpen, onClose, onSuccess }) {
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [dryRunReport, setDryRunReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const parseCSVToRows = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim().length > 0);
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      const obj = {};
      headers.forEach((h, idx) => {
        obj[h] = values[idx] || '';
      });
      rows.push(obj);
    }
    return rows;
  };

  const handleDryRun = async () => {
    setLoading(true);
    setError(null);
    setDryRunReport(null);

    try {
      const parsedRows = parseCSVToRows(csvText);
      if (parsedRows.length === 0) {
        throw new Error('No valid CSV rows parsed. Check CSV formatting.');
      }

      const res = await apiRequest('/employees/csv-dry-run', {
        method: 'POST',
        body: JSON.stringify({ rows: parsedRows })
      });

      setDryRunReport({ ...res, rows: parsedRows });
    } catch (err) {
      setError(err.message || 'Dry run failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!dryRunReport?.rows) return;
    setImporting(true);
    setError(null);

    try {
      const res = await apiRequest('/employees/csv-import', {
        method: 'POST',
        body: JSON.stringify({ rows: dryRunReport.rows })
      });

      onSuccess(res.message);
      onClose();
    } catch (err) {
      setError(err.message || 'Import execution failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-3xl w-full bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                CSV Employee Batch Import with Dry-Run Validation
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Checks required fields, unique email/code, known departments, ISO dates and positive salary.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              CSV Content (Paste CSV or Edit Below)
            </label>
            <textarea
              rows={6}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleDryRun}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition cursor-pointer flex items-center gap-2"
          >
            {loading ? 'Performing Dry-Run...' : '1. Run Dry-Run Validation'}
          </button>

          {/* Dry Run Validation Results (Section 3 Requirement) */}
          {dryRunReport && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {dryRunReport.valid ? (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Validation Passed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> {dryRunReport.errorCount} Errors Found
                    </span>
                  )}
                  <span className="text-xs text-slate-500">
                    {dryRunReport.validRows} / {dryRunReport.totalRows} valid rows
                  </span>
                </div>

                {dryRunReport.valid && (
                  <button
                    onClick={handleExecuteImport}
                    disabled={importing}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 transition cursor-pointer flex items-center gap-1.5"
                  >
                    {importing ? 'Importing...' : '2. Execute Import & Create Logins'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Error Breakdown Table */}
              {dryRunReport.errors?.length > 0 && (
                <div className="border border-rose-200 dark:border-rose-900/60 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold">
                      <tr>
                        <th className="p-2">Row</th>
                        <th className="p-2">Field</th>
                        <th className="p-2">Validation Failure Reason</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rose-100 dark:divide-rose-900/40">
                      {dryRunReport.errors.map((err, idx) => (
                        <tr key={idx} className="text-rose-700 dark:text-rose-400">
                          <td className="p-2 font-mono">Row #{err.row}</td>
                          <td className="p-2 font-semibold capitalize">{err.field}</td>
                          <td className="p-2">{err.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
