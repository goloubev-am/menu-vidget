// In-memory storage
let rules = global.adminRules || {};

export default async function handler(req, res) {
  const { siteId } = req.query;
  const adminKey = req.headers['x-admin-key'];
  const validAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key-change-me';
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Key');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Admin authentication
  if (adminKey !== validAdminKey) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  // Initialize rules for this site if not exists
  if (!rules[siteId]) {
    rules[siteId] = [];
  }
  
  // GET all rules for site
  if (req.method === 'GET') {
    return res.status(200).json(rules[siteId]);
  }
  
  // POST add new rule
  if (req.method === 'POST') {
    const { rule_name, condition_type, condition_params, recommended_product_ids, priority } = req.body;
    
    if (!rule_name || !condition_type) {
      return res.status(400).json({ error: 'Rule name and condition type are required' });
    }
    
    const newRule = {
      id: Date.now(),
      site_id: parseInt(siteId),
      rule_name,
      condition_type,
      condition_params: condition_params || {},
      recommended_product_ids: recommended_product_ids || [],
      priority: priority || 0,
      is_active: true,
      created_at: new Date().toISOString()
    };
    
    rules[siteId].push(newRule);
    global.adminRules = rules;
    
    return res.status(201).json(newRule);
  }
  
  // PUT update rule
  if (req.method === 'PUT') {
    const { ruleId } = req.query;
    const updates = req.body;
    
    const ruleIndex = rules[siteId].findIndex(r => r.id === parseInt(ruleId));
    if (ruleIndex === -1) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    rules[siteId][ruleIndex] = { ...rules[siteId][ruleIndex], ...updates };
    global.adminRules = rules;
    
    return res.status(200).json(rules[siteId][ruleIndex]);
  }
  
  // DELETE rule
  if (req.method === 'DELETE') {
    const { ruleId } = req.query;
    
    const ruleIndex = rules[siteId].findIndex(r => r.id === parseInt(ruleId));
    if (ruleIndex === -1) {
      return res.status(404).json({ error: 'Rule not found' });
    }
    
    rules[siteId].splice(ruleIndex, 1);
    global.adminRules = rules;
    
    return res.status(200).json({ message: 'Rule deleted successfully' });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}