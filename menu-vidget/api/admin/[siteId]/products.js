// In-memory storage
let products = global.adminProducts || {};

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
  
  // Initialize products for this site if not exists
  if (!products[siteId]) {
    products[siteId] = [];
  }
  
  // GET all products for site
  if (req.method === 'GET') {
    return res.status(200).json(products[siteId]);
  }
  
  // POST add new product
  if (req.method === 'POST') {
    const { external_id, name, category, price, image_url, product_url, metadata } = req.body;
    
    if (!external_id || !name) {
      return res.status(400).json({ error: 'External ID and name are required' });
    }
    
    // Check if product already exists
    const existingProduct = products[siteId].find(p => p.external_id === external_id);
    if (existingProduct) {
      // Update existing product
      Object.assign(existingProduct, { name, category, price, image_url, product_url, metadata });
      global.adminProducts = products;
      return res.status(200).json(existingProduct);
    }
    
    const newProduct = {
      id: Date.now(),
      site_id: parseInt(siteId),
      external_id,
      name,
      category: category || 'uncategorized',
      price: price || 0,
      image_url: image_url || '',
      product_url: product_url || '',
      metadata: metadata || {},
      created_at: new Date().toISOString()
    };
    
    products[siteId].push(newProduct);
    global.adminProducts = products;
    
    return res.status(201).json(newProduct);
  }
  
  // PUT update product
  if (req.method === 'PUT') {
    const { productId } = req.query;
    const updates = req.body;
    
    const productIndex = products[siteId].findIndex(p => p.id === parseInt(productId));
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    products[siteId][productIndex] = { ...products[siteId][productIndex], ...updates };
    global.adminProducts = products;
    
    return res.status(200).json(products[siteId][productIndex]);
  }
  
  // DELETE product
  if (req.method === 'DELETE') {
    const { productId } = req.query;
    
    const productIndex = products[siteId].findIndex(p => p.id === parseInt(productId));
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    products[siteId].splice(productIndex, 1);
    global.adminProducts = products;
    
    return res.status(200).json({ message: 'Product deleted successfully' });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}