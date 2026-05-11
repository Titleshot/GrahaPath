require('dotenv').config();

const express = require('express');
const cors = require('cors');
function safeRequire(modulePath, fallbackFactory) {
  try {
    return require(modulePath);
  } catch (error) {
    console.error(`[GrahaPath] Optional module unavailable: ${modulePath} — ${error?.message || error}`);
    if (error?.stack) console.error(error.stack);
    return fallbackFactory();
  }
}

const chartRoutes = safeRequire('./routes/chartRoutes', () => express.Router());
const chatRoutes = safeRequire('./routes/chatRoutes', () => express.Router());
const feedbackRoutes = safeRequire('./routes/feedbackRoutes', () => express.Router());
const securityRoutes = safeRequire('./routes/securityRoutes', () => express.Router());
const premiumRoutes = safeRequire('./routes/premiumRoutes', () => express.Router());
const geminiRuntime = safeRequire('./services/grahapathGeminiService', () => ({
  probeGeminiReadiness: async () => ({ ok: false, reason: 'module_unavailable' }),
  getGeminiRuntimeStats: () => ({ available: false })
}));
const chatReliabilityRuntime = safeRequire('./services/chatReliabilityService', () => ({
  getChatReliabilityStats: () => ({ available: false })
}));
const { probeGeminiReadiness, getGeminiRuntimeStats } = geminiRuntime;
const { getChatReliabilityStats } = chatReliabilityRuntime;

if (!process.env.GUARDRAIL_PRESET) {
  process.env.GUARDRAIL_PRESET = 'strict';
}

if (process.env.GEMINI_OFFLINE_AI === 'true') {
  console.warn('[GrahaPath] GEMINI_OFFLINE_AI=true — no Gemini HTTP calls (local chat stubs only).');
}

const app = express();
const port = process.env.PORT || 3000;

const corsOrigins = process.env.FRONTEND_ORIGIN
  ? process.env.FRONTEND_ORIGIN.split(',').map((s) => s.trim()).filter(Boolean)
  : [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:4173',
      'http://127.0.0.1:4173'
    ];

/** Allow typical Vite / LAN dev hosts when not in production (avoids CORS failures with FRONTEND_ORIGIN=Vercel-only). */
function isDevBrowserOrigin(origin) {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'http:') return false;
    const { hostname, port } = u;
    const p = port ? Number(port) : 80;
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') return true;
    if (
      (hostname.startsWith('192.168.') || /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) &&
      p >= 5173 &&
      p <= 5200
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function corsOriginCallback(origin, callback) {
  if (!origin) {
    callback(null, true);
    return;
  }
  if (corsOrigins.includes(origin)) {
    callback(null, true);
    return;
  }
  if (process.env.NODE_ENV !== 'production' && isDevBrowserOrigin(origin)) {
    callback(null, true);
    return;
  }
  callback(null, false);
}

app.use(
  cors({
    // Always use callback so a single FRONTEND_ORIGIN does not block local Vite (5173) during development.
    origin: corsOriginCallback,
    credentials: true
  })
);
app.use(
  '/api/premium/webhook/kofi',
  express.urlencoded({
    extended: true,
    limit: '2mb'
  })
);
app.use(express.json({ limit: '3mb' }));

function premiumRouterMounted(router) {
  return Array.isArray(router?.stack) && router.stack.some((layer) => Boolean(layer?.route));
}

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'grahapath-backend',
    premiumApi: premiumRouterMounted(premiumRoutes)
  });
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

if (!premiumRouterMounted(premiumRoutes)) {
  console.warn(
    '[GrahaPath] Premium module did not register routes (stale deploy or require() failed). POST /api/premium/checkout-session and webhooks will 404 until you deploy current server.js + routes/premiumRoutes.js.'
  );
}

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

