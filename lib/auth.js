// Authentication utilities

import crypto from 'crypto';

// Generate secure API key
export function generateApiKey() {
  return 'pk_' + crypto.randomBytes(32).toString('hex');
}

// Generate secure admin key
export function generateAdminKey() {
  return 'admin_' + crypto.randomBytes(32).toString('hex');
}

// Validate site API key
export function validateSiteApiKey(apiKey, site) {
  if (!apiKey || !site) return false;
  return site.api_key === apiKey;
}

// Validate admin key
export function validateAdminKey(adminKey) {
  const validAdminKey = process.env.ADMIN_API_KEY || 'admin-secret-key-change-me';
  return adminKey === validAdminKey;
}

// Extract and validate site from request
export async function authenticateSite(req, getSiteByDomain, getSiteByApiKey) {
  const apiKey = req.headers['x-api-key'];
  const siteDomain = req.headers['x-site-domain'] || req.query.site_domain;
  
  if (!apiKey && !siteDomain) {
    return { error: 'Missing authentication. Provide X-API-Key or X-Site-Domain header', status: 401 };
  }
  
  let site = null;
  
  if (apiKey) {
    site = await getSiteByApiKey(apiKey);
    if (!site) {
      return { error: 'Invalid API key', status: 401 };
    }
  } else if (siteDomain) {
    site = await getSiteByDomain(siteDomain);
    if (!site) {
      return { error: 'Site not found or inactive', status: 401 };
    }
  }
  
  return { site, error: null };
}

// Extract and validate admin from request
export function authenticateAdmin(req) {
  const adminKey = req.headers['x-admin-key'];
  
  if (!adminKey) {
    return { error: 'Missing X-Admin-Key header', status: 401 };
  }
  
  const isValid = validateAdminKey(adminKey);
  if (!isValid) {
    return { error: 'Invalid admin key', status: 403 };
  }
  
  return { admin: true, error: null };
}

// Generate session ID
export function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

// Generate client ID
export function generateClientId() {
  return crypto.randomBytes(16).toString('hex');
}

// Hash IP address for anonymity (GDPR compliant)
export function hashIpAddress(ip) {
  return crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'default-salt')).digest('hex');
}

// Validate webhook signature (for external integrations)
export function validateWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Rate limiting helper
export function createRateLimiter(requestsPerMinute = 60) {
  const requests = new Map();
  
  return function checkRateLimit(identifier) {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute ago
    
    // Clean old entries
    for (const [key, timestamps] of requests.entries()) {
      const validTimestamps = timestamps.filter(t => t > windowStart);
      if (validTimestamps.length === 0) {
        requests.delete(key);
      } else {
        requests.set(key, validTimestamps);
      }
    }
    
    // Check current identifier
    const userRequests = requests.get(identifier) || [];
    if (userRequests.length >= requestsPerMinute) {
      return { allowed: false, remaining: 0, reset: windowStart + 60000 };
    }
    
    // Add new request
    userRequests.push(now);
    requests.set(identifier, userRequests);
    
    return { 
      allowed: true, 
      remaining: requestsPerMinute - userRequests.length,
      reset: windowStart + 60000
    };
  };
}

// CORS headers helper
export function setCorsHeaders(res, origin = '*') {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-API-Key, X-Admin-Key, X-Site-Domain'
  );
}

// Handle OPTIONS request for CORS
export function handleCors(req, res) {
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, req.headers.origin || '*');
    res.status(200).end();
    return true;
  }
  return false;
}

export default {
  generateApiKey,
  generateAdminKey,
  validateSiteApiKey,
  validateAdminKey,
  authenticateSite,
  authenticateAdmin,
  generateSessionId,
  generateClientId,
  hashIpAddress,
  validateWebhookSignature,
  createRateLimiter,
  setCorsHeaders,
  handleCors
};