require('dotenv').config();

const express = require('express');
const cors = require('cors');
const chartRoutes = require('./routes/chartRoutes');
const chatRoutes = require('./routes/chatRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const securityRoutes = require('./routes/securityRoutes');
const premiumRoutes = require('./routes/premiumRoutes');
const { probeGeminiReadiness, getGeminiRuntimeStats } = require('./services/grahapathGeminiService');
const { getChatReliabilityStats } = require('./services/chatReliabilityService');

if (!process.env.GUARDRAIL_PRESET) {
  process.env.GUARDRAIL_PRESET = 'strict';
}

if (process.env.GEMINI_OFFLINE_AI === 'true') {
  console.warn('[GrahaPath] GEMINI_OFFLINE_AI=true — no Gemini HTTP calls (local chat stubs only).');
}

const app = express();
const port = process.env.PORT || 3000;

const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim())
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:4173',
      'http://127.0.0.1:4173'
    ];

app.use(
  cors({
    origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins
  })
);
app.use(
  '/api/premium/webhook/gumroad',
  express.urlencoded({
    extended: false,
    limit: '2mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    }
  })
);
app.use(express.json({ limit: '3mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'grahapath-backend' });
});

app.get('/health/gemini', async (_req, res) => {
  const probe = await probeGeminiReadiness();
  const statusCode = probe.ok ? 200 : 503;
  res.status(statusCode).json({
    service: 'grahapath-backend',
    gemini: probe,
    runtime: getGeminiRuntimeStats(),
    controls: getChatReliabilityStats()
  });
});

app.get('/health/gemini/stats', (_req, res) => {
  res.json({
    service: 'grahapath-backend',
    runtime: getGeminiRuntimeStats(),
    controls: getChatReliabilityStats()
  });
});

app.use('/api', chartRoutes);
app.use('/api', chatRoutes);
app.use('/api', feedbackRoutes);
app.use('/api', securityRoutes);
app.use('/api', premiumRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `No route registered for ${req.method} ${req.originalUrl}`,
  });
});

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;

  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message: err.message || 'Unexpected server error',
  });
});

if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`GrahaPath backend listening on port ${port}`);
    probeGeminiReadiness()
      .then((probe) => {
        if (probe.ok) {
          console.log(`[GrahaPath] Gemini ready (${probe.model || 'configured model'}).`);
        } else {
          console.warn('[GrahaPath] Gemini not ready:', probe.reason || probe.message || 'unknown_error');
        }
      })
      .catch((e) => {
        console.warn('[GrahaPath] Gemini startup probe failed:', String(e?.message || e));
      });
  });
}

module.exports = app;

