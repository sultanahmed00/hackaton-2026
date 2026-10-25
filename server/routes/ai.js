import express from 'express';
import { db } from '../db/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { processAIChat, summarizeDashboard, parseSmartLeave } from '../services/aiService.js';

const router = express.Router();

// In-memory rate limiting map: userId -> [timestamp, timestamp, ...]
const userRequestTimestamps = new Map();

function checkRateLimit(userId) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hour
  const limit = 25; // ~20-25 requests per hour

  let timestamps = userRequestTimestamps.get(userId) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);

  if (timestamps.length >= limit) {
    return false;
  }

  timestamps.push(now);
  userRequestTimestamps.set(userId, timestamps);
  return true;
}

/**
 * POST /api/ai/chat
 */
router.post('/chat', authenticateToken, async (req, res) => {
  try {
    const { prompt, history = [] } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Rate limiter guardrail
    if (!checkRateLimit(req.user.id)) {
      return res.status(429).json({
        error: 'Rate limit exceeded: You can make up to 20 AI requests per hour. Please try again shortly.'
      });
    }

    // 15 second timeout guardrail
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('AI request timed out after 15 seconds')), 15000)
    );

    const resultPromise = processAIChat(prompt, req.user, history);
    const result = await Promise.race([resultPromise, timeoutPromise]);

    // Log call in ai_logs
    db.insert('ai_logs', {
      user_id: req.user.id,
      user_role: req.user.role,
      prompt,
      tool_called: result.toolCalled || null,
      response: result.reply,
      duration_ms: result.duration || 0,
      timestamp: new Date().toISOString()
    });

    res.json({
      reply: result.reply,
      smartLeaveForm: result.smartLeaveForm || null,
      data: result.data || null,
      toolCalled: result.toolCalled || null,
      duration: result.duration,
      isAiGenerated: true
    });
  } catch (err) {
    console.error('AI chat error:', err);
    res.status(500).json({
      error: 'The AI assistant encountered a momentary issue. Please try again.',
      isAiGenerated: true
    });
  }
});

/**
 * POST /api/ai/summarize
 * Generates KPI summary bullets
 */
router.post('/summarize', authenticateToken, (req, res) => {
  const { kpis } = req.body;
  if (!kpis) {
    return res.status(400).json({ error: 'KPI data required for summary' });
  }

  const bullets = summarizeDashboard(kpis, req.user.role);

  db.insert('ai_logs', {
    user_id: req.user.id,
    user_role: req.user.role,
    prompt: 'Summarize Dashboard KPIs',
    tool_called: 'summarize_dashboard',
    response: bullets.join(' | '),
    duration_ms: 10,
    timestamp: new Date().toISOString()
  });

  res.json({
    summary: bullets,
    isAiGenerated: true
  });
});

/**
 * POST /api/ai/smart-leave
 * Parses natural language leave query
 */
router.post('/smart-leave', authenticateToken, (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt required' });
  }

  const parsed = parseSmartLeave(prompt);
  res.json({
    form: parsed,
    isAiGenerated: true
  });
});

export default router;
