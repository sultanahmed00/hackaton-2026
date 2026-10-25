import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// On Vercel serverless runtime, only /tmp is writable
const DB_FILE = process.env.VERCEL
  ? path.join('/tmp', 'hcm_data.json')
  : path.join(__dirname, '..', '..', 'data', 'hcm_data.json');

const INITIAL_SCHEMA = {
  company_settings: null, // Starts null on fresh install
  users: [],
  departments: [],
  designations: [],
  employees: [],
  leave_types: [],
  public_holidays: [],
  attendance: [],
  leave_requests: [],
  payroll_runs: [],
  payslips: [],
  announcements: [],
  notifications: [],
  audit_logs: [],
  ai_logs: []
};

class JSONDatabase {
  constructor() {
    this.data = { ...INITIAL_SCHEMA };
    this.init();
  }

  init() {
    try {
      const dataDir = path.dirname(DB_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      const bundledDb = path.join(__dirname, '..', '..', 'data', 'hcm_data.json');
      if (!fs.existsSync(DB_FILE) && fs.existsSync(bundledDb)) {
        try {
          fs.copyFileSync(bundledDb, DB_FILE);
        } catch (e) {
          // Fallback to initial schema if copy fails
        }
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(fileContent);
        // Ensure all collections exist
        for (const key of Object.keys(INITIAL_SCHEMA)) {
          if (this.data[key] === undefined) {
            this.data[key] = INITIAL_SCHEMA[key];
          }
        }
      } else {
        this.saveSync();
      }
    } catch (err) {
      console.error('Error initializing database:', err);
      this.data = { ...INITIAL_SCHEMA };
    }
  }

  saveSync() {
    try {
      const tempPath = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  isInitialized() {
    return !!(this.data.company_settings && this.data.users.some(u => u.role === 'admin'));
  }

  getSettings() {
    return this.data.company_settings;
  }

  setSettings(settings) {
    this.data.company_settings = { ...this.data.company_settings, ...settings };
    this.saveSync();
    return this.data.company_settings;
  }

  getAll(table, filter = null) {
    const list = this.data[table] || [];
    if (!filter) return [...list];

    return list.filter(item => {
      for (const [k, v] of Object.entries(filter)) {
        if (typeof v === 'function') {
          if (!v(item[k])) return false;
        } else if (item[k] !== v) {
          return false;
        }
      }
      return true;
    });
  }

  get(table, filter) {
    const list = this.data[table] || [];
    if (typeof filter === 'string' || typeof filter === 'number') {
      return list.find(item => item.id == filter) || null;
    }
    return list.find(item => {
      for (const [k, v] of Object.entries(filter)) {
        if (item[k] !== v) return false;
      }
      return true;
    }) || null;
  }

  insert(table, record) {
    if (!this.data[table]) {
      this.data[table] = [];
    }
    const newRecord = {
      id: record.id || `id_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...record
    };
    this.data[table].push(newRecord);
    this.saveSync();
    return newRecord;
  }

  update(table, idOrFilter, updates) {
    const list = this.data[table] || [];
    let updatedItem = null;

    for (let i = 0; i < list.length; i++) {
      let match = false;
      if (typeof idOrFilter === 'string' || typeof idOrFilter === 'number') {
        match = list[i].id == idOrFilter;
      } else {
        match = Object.entries(idOrFilter).every(([k, v]) => list[i][k] === v);
      }

      if (match) {
        list[i] = {
          ...list[i],
          ...updates,
          updatedAt: new Date().toISOString()
        };
        updatedItem = list[i];
        break;
      }
    }

    if (updatedItem) {
      this.saveSync();
    }
    return updatedItem;
  }

  delete(table, idOrFilter) {
    const list = this.data[table] || [];
    const initialLen = list.length;

    this.data[table] = list.filter(item => {
      if (typeof idOrFilter === 'string' || typeof idOrFilter === 'number') {
        return item.id != idOrFilter;
      }
      return !Object.entries(idOrFilter).every(([k, v]) => item[k] === v);
    });

    if (this.data[table].length !== initialLen) {
      this.saveSync();
      return true;
    }
    return false;
  }

  reset() {
    this.data = {
      company_settings: null,
      users: [],
      departments: [],
      designations: [],
      employees: [],
      leave_types: [],
      public_holidays: [],
      attendance: [],
      leave_requests: [],
      payroll_runs: [],
      payslips: [],
      announcements: [],
      notifications: [],
      audit_logs: [],
      ai_logs: []
    };
    this.saveSync();
  }
}

export const db = new JSONDatabase();
