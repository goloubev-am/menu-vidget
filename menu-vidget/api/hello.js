export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({ 
    status: 'ok',
    message: 'Widget Service API is running!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/identify',
      'POST /api/track',
      'GET /api/recommendations/:clientId',
      'GET /api/admin/sites',
      'POST /api/admin/sites',
      'GET /api/admin/sites/:siteId/products',
      'POST /api/admin/sites/:siteId/products',
      'GET /api/admin/sites/:siteId/rules',
      'POST /api/admin/sites/:siteId/rules',
      'GET /api/admin/stats'
    ]
  });
}