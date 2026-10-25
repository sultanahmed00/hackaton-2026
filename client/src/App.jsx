import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import FirstRunWizard from './components/FirstRunWizard';
import LoginModal from './components/LoginModal';
import ChangePasswordModal from './components/ChangePasswordModal';
import NotificationDrawer from './components/NotificationDrawer';
import AiChatModal from './components/AiChatModal';
import CameraAttendanceModal from './components/CameraAttendanceModal';

import AdminDashboard from './views/AdminDashboard';
import HrDashboard from './views/HrDashboard';
import EmployeeDashboard from './views/EmployeeDashboard';
import EmployeesView from './views/EmployeesView';
import AttendanceView from './views/AttendanceView';
import LeaveView from './views/LeaveView';
import PayrollView from './views/PayrollView';
import OrgSetupView from './views/OrgSetupView';
import UserManagementView from './views/UserManagementView';
import AuditLogView from './views/AuditLogView';
import AnnouncementsView from './views/AnnouncementsView';
import Employee360Modal from './views/Employee360Modal';

import { apiRequest, getToken, setToken } from './utils/api';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [initialized, setInitialized] = useState(null);
  const [companyName, setCompanyName] = useState('Saylani Tech Solutions');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [theme, setTheme] = useState(localStorage.getItem('hcm_theme') || 'light');

  // Modals
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isNotifDrawerOpen, setIsNotifDrawerOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Apply Dark mode class to document
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('hcm_theme', theme);
  }, [theme]);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchNotifications();
    }
  }, [currentUser]);

  const checkSetupStatus = async () => {
    try {
      const res = await apiRequest('/setup/status');
      setInitialized(res.initialized);
      if (res.company_name) setCompanyName(res.company_name);

      if (res.initialized) {
        checkCurrentUser();
      }
    } catch (err) {
      console.error('Setup status check error:', err);
      setInitialized(false);
    }
  };

  const checkCurrentUser = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await apiRequest('/auth/me');
      setCurrentUser(res.user);
      if (res.user.must_change_password) {
        setIsPasswordModalOpen(true);
      }
    } catch (err) {
      console.warn('Session expired or invalid token');
      setToken(null);
      setCurrentUser(null);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiRequest('/comms/notifications');
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch (err) {
      console.error(err);
    }
  };

  const handleLoginSuccess = (token, user) => {
    setToken(token);
    setCurrentUser(user);
    if (user.must_change_password) {
      setIsPasswordModalOpen(true);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  // 1-Click Demo Seed for Hackathon judges
  const handleSeedDemo = async () => {
    try {
      await apiRequest('/setup/seed-demo', { method: 'POST' });
      setInitialized(true);
      setCompanyName('Saylani Tech Solutions');

      // Auto login as Admin
      const loginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'admin@saylani.org', password: 'Password@123' })
      });
      handleLoginSuccess(loginRes.token, loginRes.user);
      setActiveTab('dashboard');
    } catch (err) {
      alert(err.message || 'Failed to seed demo data');
    }
  };

  // Reset System to Empty State
  const handleResetSystem = async () => {
    if (!confirm('Reset HCM Lite to empty First-Run state? All existing records will be wiped to test initial onboarding.')) return;

    try {
      await apiRequest('/setup/reset', { method: 'POST' });
      setToken(null);
      setCurrentUser(null);
      setInitialized(false);
      setActiveTab('dashboard');
    } catch (err) {
      alert(err.message || 'Failed to reset system');
    }
  };

  // Quick switch user account for judges
  const handleSwitchUser = async (targetEmail, password = 'Password@123') => {
    try {
      const loginRes = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password })
      });
      handleLoginSuccess(loginRes.token, loginRes.user);
      setActiveTab('dashboard');
    } catch (err) {
      alert(`Could not login as ${targetEmail}: ${err.message}. If not seeded, click "Seed Demo Data" first.`);
    }
  };

  // Render view depending on role and active tab
  const renderCurrentView = () => {
    if (!currentUser) return null;
    const role = currentUser.role;

    if (activeTab === 'dashboard') {
      if (role === 'admin') return <AdminDashboard onOpenAiChat={() => setIsAiChatOpen(true)} />;
      if (role === 'hr') return <HrDashboard onOpenAiChat={() => setIsAiChatOpen(true)} />;
      return (
        <EmployeeDashboard
          onOpenAiChat={() => setIsAiChatOpen(true)}
          onOpenCameraCheckIn={() => setIsCameraModalOpen(true)}
        />
      );
    }

    if (activeTab === 'org_setup') return <OrgSetupView currentRole={role} />;
    if (activeTab === 'users') return <UserManagementView />;
    if (activeTab === 'employees') return <EmployeesView currentRole={role} />;
    if (activeTab === 'attendance') return <AttendanceView currentRole={role} />;
    if (activeTab === 'leave') return <LeaveView currentRole={role} onOpenAiChat={() => setIsAiChatOpen(true)} />;
    if (activeTab === 'payroll') return <PayrollView currentRole={role} />;
    if (activeTab === 'announcements') return <AnnouncementsView currentRole={role} />;
    if (activeTab === 'audit') return <AuditLogView />;
    if (activeTab === 'profile') {
      return (
        <Employee360Modal
          employeeId={currentUser.employee_id}
          isOpen={true}
          onClose={() => setActiveTab('dashboard')}
          currentRole={role}
        />
      );
    }

    return <AdminDashboard onOpenAiChat={() => setIsAiChatOpen(true)} />;
  };

  // 1. Initial Loading Screen
  if (initialized === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading HCM Lite...</span>
        </div>
      </div>
    );
  }

  // 2. First Run Screen: Clean & Empty System
  if (!initialized) {
    return (
      <FirstRunWizard
        onComplete={(token, user) => {
          setInitialized(true);
          handleLoginSuccess(token, user);
        }}
        onSeedDemo={handleSeedDemo}
      />
    );
  }

  // 3. User Login Screen
  if (!currentUser) {
    return (
      <LoginModal
        onLoginSuccess={handleLoginSuccess}
        onSeedDemo={handleSeedDemo}
      />
    );
  }

  // 4. Main Authenticated App Layout
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        companyName={companyName}
        theme={theme}
        setTheme={setTheme}
        onLogout={handleLogout}
        onOpenPasswordModal={() => setIsPasswordModalOpen(true)}
        onOpenNotifications={() => setIsNotifDrawerOpen(true)}
        unreadCount={unreadCount}
        onSeedDemo={handleSeedDemo}
        onResetSystem={handleResetSystem}
        onSwitchUser={handleSwitchUser}
        onOpenAiChat={() => setIsAiChatOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Role-Specific Sidebar */}
        <Sidebar
          currentRole={currentUser.role}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
        />

        {/* Dynamic View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {renderCurrentView()}
        </main>
      </div>

      {/* Floating AI Assistant Button (Available on all screens) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsAiChatOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 hover:scale-105 text-white font-bold text-xs shadow-xl shadow-blue-500/30 transition-all cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '4s' }} />
          <span className="hidden sm:inline">Ask AI Assistant</span>
        </button>
      </div>

      {/* AI Assistant Chat Modal */}
      <AiChatModal
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        currentUser={currentUser}
        onLeaveApplied={() => {
          if (activeTab === 'leave' || activeTab === 'dashboard') {
            // refresh data
          }
        }}
      />

      {/* In-App Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotifDrawerOpen}
        onClose={() => setIsNotifDrawerOpen(false)}
        notifications={notifications}
        onRefresh={fetchNotifications}
      />

      {/* Camera Face Check-In Modal */}
      <CameraAttendanceModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onSuccess={() => {
          fetchNotifications();
        }}
      />

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        mustChange={currentUser.must_change_password}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          setCurrentUser(prev => ({ ...prev, must_change_password: false }));
        }}
      />
    </div>
  );
}
