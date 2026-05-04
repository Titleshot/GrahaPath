const express = require('express');
const chartRoutes = require('./routes/chartRoutes');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json({ limit: '32kb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'grahapath-backend' });
});

app.use('/', chartRoutes);

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

app.listen(port, () => {
  console.log(`GrahaPath backend listening on port ${port}`);
});

