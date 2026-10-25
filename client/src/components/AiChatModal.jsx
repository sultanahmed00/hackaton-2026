import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  ShieldCheck,
  CalendarDays,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { apiRequest } from '../utils/api';

export default function AiChatModal({ isOpen, onClose, currentUser, onLeaveApplied }) {
  const [messages, setMessages] = useState([
    {
      id: 'init_1',
      role: 'assistant',
      content: `Hello ${currentUser?.name || 'there'}! I am your HCM Lite AI Assistant. I have live access to your company's records under strict role permissions.\n\nTry asking me a question or click one of the quick suggestions below!`,
      isAiGenerated: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingLeaveConfirm, setPendingLeaveConfirm] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (customPrompt = null) => {
    const promptToSend = customPrompt || input;
    if (!promptToSend.trim() || loading) return;

    const userMsg = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setLoading(true);

    try {
      const res = await apiRequest('/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          prompt: promptToSend,
          history: messages.slice(-4).map(m => ({ role: m.role, content: m.content }))
        })
      });

      const assistantMsg = {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        toolCalled: res.toolCalled,
        smartLeaveForm: res.smartLeaveForm,
        isAiGenerated: true,
        duration: res.duration,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (res.smartLeaveForm) {
        setPendingLeaveConfirm(res.smartLeaveForm);
      }
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: err.message || 'I encountered an issue processing your query. Please try again.',
          isAiGenerated: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSmartLeave = async () => {
    if (!pendingLeaveConfirm) return;
    setLoading(true);

    try {
      await apiRequest('/leave/apply', {
        method: 'POST',
        body: JSON.stringify({
          leave_type_id: pendingLeaveConfirm.leave_type_id,
          start_date: pendingLeaveConfirm.start_date,
          end_date: pendingLeaveConfirm.end_date,
          reason: pendingLeaveConfirm.reason
        })
      });

      setMessages(prev => [
        ...prev,
        {
          id: `ai_conf_${Date.now()}`,
          role: 'assistant',
          content: `✅ Your leave request from ${pendingLeaveConfirm.start_date} to ${pendingLeaveConfirm.end_date} has been submitted to HR for approval!`,
          isAiGenerated: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      setPendingLeaveConfirm(null);
      if (onLeaveApplied) onLeaveApplied();
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `err_leave_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Failed to submit leave: ${err.message}`,
          isAiGenerated: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = currentUser?.role === 'employee'
    ? [
        "How many sick leaves do I have left this year?",
        "What is John's salary?",
        "Need next Monday and Tuesday off for a wedding",
        "What is the office grace period?",
        "Meri kitni chuttiyan baqi hain?"
      ]
    : [
        "Who is on leave today?",
        "What is this month's attendance rate?",
        "Who came late most often this month?",
        "How many active employees are in Engineering?",
        "Explain company tax slab brackets"
      ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="w-full sm:max-w-2xl h-[92vh] sm:h-[650px] bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in slide-in-from-bottom-6">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base">HCM Lite AI Assistant</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 border border-white/30 text-sky-200">
                  Role: {currentUser?.role?.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] text-blue-100 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-300" />
                Live Tool Calling · Section 3 Policy Guardrails Enforced
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => {
            const isUser = m.role === 'user';
            return (
              <div key={m.id} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div className={`max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-tr-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs border border-slate-200 dark:border-slate-700/80 shadow-xs'
                    }`}
                  >
                    {m.content}

                    {/* Interactive Smart Leave Form Confirmation inside chat */}
                    {m.smartLeaveForm && pendingLeaveConfirm && (
                      <div className="mt-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900/60 shadow-xs">
                        <div className="font-bold text-xs text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5" />
                          Pre-filled Leave Application
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 mb-3">
                          <div><span className="text-slate-400">Type:</span> <strong className="capitalize">{pendingLeaveConfirm.type}</strong></div>
                          <div><span className="text-slate-400">Reason:</span> <strong>{pendingLeaveConfirm.reason}</strong></div>
                          <div><span className="text-slate-400">Start:</span> <strong>{pendingLeaveConfirm.start_date}</strong></div>
                          <div><span className="text-slate-400">End:</span> <strong>{pendingLeaveConfirm.end_date}</strong></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleConfirmSmartLeave}
                            disabled={loading}
                            className="flex-1 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Confirm & Submit Leave
                          </button>
                          <button
                            onClick={() => setPendingLeaveConfirm(null)}
                            className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata & AI Badge */}
                  <div className="flex items-center gap-2 mt-1 px-1">
                    <span className="text-[10px] text-slate-400">{m.timestamp}</span>
                    {m.isAiGenerated && (
                      <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900">
                        AI-Generated
                      </span>
                    )}
                    {m.toolCalled && (
                      <span className="text-[9px] text-teal-600 dark:text-teal-400 font-mono">
                        tool: {m.toolCalled}
                      </span>
                    )}
                  </div>
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {loading && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 rounded-tl-xs flex items-center gap-2 text-xs text-slate-500">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                <span>Executing tools with role scope...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Suggestion Chips */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs no-scrollbar">
          <span className="text-[11px] font-bold text-slate-400 shrink-0">Try:</span>
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(s)}
              className="shrink-0 px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 border border-slate-200 dark:border-slate-700 transition cursor-pointer"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about attendance, leave, headcount, policies..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white transition shadow-sm cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
