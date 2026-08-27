let app;

try {
  app = require('../backend/server.js');
} catch (err) {
  console.error('Vercel Serverless App Require Error:', err);
}

module.exports = (req, res) => {
  if (!app) {
    try {
      app = require('../backend/server.js');
    } catch (err) {
      console.error('Vercel Serverless App Lazy Require Error:', err);
      return res.status(500).json({
        success: false,
        error: 'Serverless initialization error: ' + (err.message || String(err))
      });
    }
  }

  // Ensure JSON body parsing fallback if req.body is string
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      // Ignore parse error
    }
  }

  return app(req, res);
};
