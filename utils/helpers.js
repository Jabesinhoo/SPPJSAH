// utils/helpers.js
function wantsJson(req) {
  const accept = req.get('Accept') || '';
  return req.xhr || accept.includes('application/json') || req.path.startsWith('/api') || req.query.ajax === '1';
}

module.exports = { wantsJson };