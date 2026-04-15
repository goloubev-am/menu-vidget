// Database utilities for PostgreSQL (for production use)
// For demo, this uses in-memory storage

// In-memory storage for development/demo
const inMemoryDB = {
  sites: [],
  products: [],
  rules: [],
  events: []
};

// For production with PostgreSQL
let pool = null;

export async function initDatabase() {
  // Check if we should use real PostgreSQL
  const usePostgres = process.env.DATABASE_URL && process.env.USE_REAL_DB === 'true';
  
  if (!usePostgres) {
    console.log('📦 Using in-memory database (for development/demo)');
    return { isMemory: true, db: inMemoryDB };
  }
  
  try {
    // Dynamic import for PostgreSQL (only if needed)
    const pg = await import('pg');
    const { Pool } = pg;
    
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
      } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ PostgreSQL connected successfully');
    
    // Create tables if they don't exist
    await createTables();
    
    return { isMemory: false, pool };
  } catch (error) {
    console.error('❌ PostgreSQL connection failed, falling back to memory:', error.message);
    return { isMemory: true, db: inMemoryDB };
  }
}

async function createTables() {
  const queries = [
    `CREATE TABLE IF NOT EXISTS sites (
      id SERIAL PRIMARY KEY,
      site_domain VARCHAR(255) UNIQUE NOT NULL,
      site_name VARCHAR(255),
      api_key VARCHAR(255) UNIQUE NOT NULL,
      widget_config JSONB DEFAULT '{}',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
      external_id VARCHAR(255) NOT NULL,
      name TEXT NOT NULL,
      category VARCHAR(255),
      price DECIMAL(10,2),
      image_url TEXT,
      product_url TEXT,
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(site_id, external_id)
    )`,
    
    `CREATE TABLE IF NOT EXISTS rules (
      id SERIAL PRIMARY KEY,
      site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
      rule_name VARCHAR(255),
      condition_type VARCHAR(100),
      condition_params JSONB,
      recommended_product_ids INTEGER[],
      priority INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
      client_id VARCHAR(255),
      session_id VARCHAR(255),
      event_type VARCHAR(50),
      product_id INTEGER REFERENCES products(id),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )`,
    
    `CREATE INDEX IF NOT EXISTS idx_events_site_client ON events(site_id, client_id, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_events_site_type ON events(site_id, event_type, created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at)`
  ];
  
  for (const query of queries) {
    await pool.query(query);
  }
  
  console.log('✅ Database tables created/verified');
}

export async function query(text, params) {
  if (pool) {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
  
  // In-memory fallback
  console.warn('⚠️ Using in-memory database (no persistence)');
  return { rows: [], rowCount: 0 };
}

export async function getSiteByDomain(domain) {
  if (pool) {
    const result = await query('SELECT * FROM sites WHERE site_domain = $1 AND is_active = true', [domain]);
    return result.rows[0];
  }
  
  // In-memory
  return inMemoryDB.sites.find(s => s.site_domain === domain && s.is_active);
}

export async function getSiteByApiKey(apiKey) {
  if (pool) {
    const result = await query('SELECT * FROM sites WHERE api_key = $1 AND is_active = true', [apiKey]);
    return result.rows[0];
  }
  
  // In-memory
  return inMemoryDB.sites.find(s => s.api_key === apiKey && s.is_active);
}

export async function saveEvent(siteId, clientId, sessionId, eventType, productId, metadata) {
  if (pool) {
    const result = await query(
      `INSERT INTO events (site_id, client_id, session_id, event_type, product_id, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id`,
      [siteId, clientId, sessionId, eventType, productId, metadata || {}]
    );
    return result.rows[0];
  }
  
  // In-memory
  const event = {
    id: Date.now(),
    site_id: siteId,
    client_id: clientId,
    session_id: sessionId,
    event_type: eventType,
    product_id: productId,
    metadata: metadata || {},
    created_at: new Date().toISOString()
  };
  inMemoryDB.events.push(event);
  return event;
}

export async function getProducts(siteId, productIds = null) {
  if (pool) {
    if (productIds && productIds.length > 0) {
      const result = await query(
        `SELECT * FROM products WHERE site_id = $1 AND id = ANY($2::int[])`,
        [siteId, productIds]
      );
      return result.rows;
    } else {
      const result = await query(
        `SELECT * FROM products WHERE site_id = $1 ORDER BY id`,
        [siteId]
      );
      return result.rows;
    }
  }
  
  // In-memory
  let siteProducts = inMemoryDB.products.filter(p => p.site_id === siteId);
  if (productIds && productIds.length > 0) {
    siteProducts = siteProducts.filter(p => productIds.includes(p.id));
  }
  return siteProducts;
}

export async function getRules(siteId) {
  if (pool) {
    const result = await query(
      `SELECT * FROM rules WHERE site_id = $1 AND is_active = true ORDER BY priority DESC`,
      [siteId]
    );
    return result.rows;
  }
  
  // In-memory
  return inMemoryDB.rules
    .filter(r => r.site_id === siteId && r.is_active)
    .sort((a, b) => b.priority - a.priority);
}

export async function saveSite(siteData) {
  if (pool) {
    const result = await query(
      `INSERT INTO sites (site_domain, site_name, api_key, widget_config) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [siteData.site_domain, siteData.site_name, siteData.api_key, siteData.widget_config || {}]
    );
    return result.rows[0];
  }
  
  // In-memory
  const newSite = {
    id: inMemoryDB.sites.length + 1,
    ...siteData,
    created_at: new Date().toISOString()
  };
  inMemoryDB.sites.push(newSite);
  return newSite;
}

export async function saveProduct(siteId, productData) {
  if (pool) {
    const result = await query(
      `INSERT INTO products (site_id, external_id, name, category, price, image_url, product_url, metadata) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (site_id, external_id) 
       DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category, 
                     price = EXCLUDED.price, image_url = EXCLUDED.image_url,
                     product_url = EXCLUDED.product_url
       RETURNING *`,
      [siteId, productData.external_id, productData.name, productData.category, 
       productData.price, productData.image_url, productData.product_url, productData.metadata || {}]
    );
    return result.rows[0];
  }
  
  // In-memory
  const existingIndex = inMemoryDB.products.findIndex(p => p.site_id === siteId && p.external_id === productData.external_id);
  const newProduct = {
    id: existingIndex !== -1 ? inMemoryDB.products[existingIndex].id : Date.now(),
    site_id: siteId,
    ...productData,
    created_at: new Date().toISOString()
  };
  
  if (existingIndex !== -1) {
    inMemoryDB.products[existingIndex] = newProduct;
  } else {
    inMemoryDB.products.push(newProduct);
  }
  return newProduct;
}

export async function saveRule(siteId, ruleData) {
  if (pool) {
    const result = await query(
      `INSERT INTO rules (site_id, rule_name, condition_type, condition_params, recommended_product_ids, priority) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [siteId, ruleData.rule_name, ruleData.condition_type, ruleData.condition_params, 
       ruleData.recommended_product_ids, ruleData.priority || 0]
    );
    return result.rows[0];
  }
  
  // In-memory
  const newRule = {
    id: Date.now(),
    site_id: siteId,
    ...ruleData,
    is_active: true,
    created_at: new Date().toISOString()
  };
  inMemoryDB.rules.push(newRule);
  return newRule;
}

export async function getStats(siteId, startDate, endDate) {
  if (pool) {
    const result = await query(
      `SELECT 
        COUNT(*) as total_events,
        COUNT(DISTINCT client_id) as unique_users,
        SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as total_clicks,
        SUM(CASE WHEN event_type = 'view_product' THEN 1 ELSE 0 END) as total_views
       FROM events 
       WHERE site_id = $1 AND created_at BETWEEN $2 AND $3`,
      [siteId, startDate, endDate]
    );
    return result.rows[0];
  }
  
  // In-memory
  const siteEvents = inMemoryDB.events.filter(e => 
    e.site_id === siteId && 
    new Date(e.created_at) >= startDate && 
    new Date(e.created_at) <= endDate
  );
  
  return {
    total_events: siteEvents.length,
    unique_users: new Set(siteEvents.map(e => e.client_id)).size,
    total_clicks: siteEvents.filter(e => e.event_type === 'click').length,
    total_views: siteEvents.filter(e => e.event_type === 'view_product').length
  };
}

export default {
  initDatabase,
  query,
  getSiteByDomain,
  getSiteByApiKey,
  saveEvent,
  getProducts,
  getRules,
  saveSite,
  saveProduct,
  saveRule,
  getStats
};
