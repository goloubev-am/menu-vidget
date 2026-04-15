// In-memory storage for events
let events = global.events || [];

export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];
  const validAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key-change-me';
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Admin authentication
  if (adminKey !== validAdminKey) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { siteId, period = '7d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate = new Date();
  
  switch(period) {
    case '24h':
      startDate.setHours(now.getHours() - 24);
      break;
    case '7d':
      startDate.setDate(now.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(now.getDate() - 30);
      break;
    default:
      startDate.setDate(now.getDate() - 7);
  }
  
  // Filter events
  let filteredEvents = events;
  if (siteId) {
    filteredEvents = events.filter(e => e.siteId === parseInt(siteId));
  }
  
  filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) >= startDate);
  
  // Calculate statistics
  const stats = {
    totalEvents: filteredEvents.length,
    totalClicks: filteredEvents.filter(e => e.eventType === 'click').length,
    totalViews: filteredEvents.filter(e => e.eventType === 'view_product').length,
    uniqueUsers: new Set(filteredEvents.map(e => e.clientId)).size,
    eventsByType: {},
    eventsByDay: {},
    topProducts: {}
  };
  
  // Events by type
  filteredEvents.forEach(event => {
    stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;
    
    // Events by day
    const day = new Date(event.timestamp).toISOString().split('T')[0];
    stats.eventsByDay[day] = (stats.eventsByDay[day] || 0) + 1;
    
    // Top products
    if (event.productId && event.eventType === 'click') {
      stats.topProducts[event.productId] = (stats.topProducts[event.productId] || 0) + 1;
    }
  });
  
  // Convert to array and sort
  stats.topProductsList = Object.entries(stats.topProducts)
    .map(([id, count]) => ({ productId: parseInt(id), clicks: count }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 10);
  
  res.status(200).json({
    period,
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    stats
  });
}

// Helper function to add events (called from track.js)
export function addEvent(eventData) {
  if (!global.events) {
    global.events = [];
  }
  global.events.push({
    ...eventData,
    timestamp: new Date().toISOString()
  });
  
  // Keep only last 30 days of events
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  global.events = global.events.filter(e => new Date(e.timestamp) >= thirtyDaysAgo);
}