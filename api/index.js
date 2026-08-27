const app = require('../backend/server.js');

module.exports = (req, res) => {
  return app(req, res);
};
