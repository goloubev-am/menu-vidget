export default async function handler(req, res) {
  const adminKey = req.headers['x-admin-key'];
  
  // Simple admin authentication (in production, use env variable)
  const validAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key-change-me';
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (adminKey !== validAdminKey) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // In-memory storage (in production, use database)
  const sites = global.sites || [];
  
  if (req.method === 'GET') {
    return res.status(200).json(sites);
  }
  
  if (req.method === 'POST') {
    const { site_domain, site_name, widget_config } = req.body;
    
    if (!site_domain) {
      return res.status(400).json({ error: 'Site domain required' });
    }
    
    const newSite = {
      id: sites.length + 1,
      site_domain,
      site_name: site_name || site_domain,
      api_key: 'api_' + Math.random().toString(36).substr(2, 16),
      widget_config: widget_config || {},
      is_active: true,
      created_at: new Date().toISOString()
    };
    
    sites.push(newSite);
    global.sites = sites;
    
    return res.status(201).json(newSite);
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}