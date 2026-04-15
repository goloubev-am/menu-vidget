export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Site-Domain');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { clientId, sessionId, eventType, productId, metadata } = req.body;
    
    if (!clientId || !eventType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Log event (in production, save to database)
    console.log('Event tracked:', {
      clientId,
      sessionId,
      eventType,
      productId,
      metadata,
      timestamp: new Date().toISOString()
    });
    
    // Store in memory (in production, use Redis/PostgreSQL)
    const event = {
      clientId,
      sessionId,
      eventType,
      productId,
      metadata,
      timestamp: Date.now()
    };
    
    // In production, save to database here
    
    res.status(200).json({ 
      status: 'ok',
      eventId: Date.now().toString()
    });
  } catch (error) {
    console.error('Track error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}