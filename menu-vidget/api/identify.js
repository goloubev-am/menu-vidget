import { v4 as uuidv4 } from 'uuid';
import cookie from 'cookie';

export default async function handler(req, res) {
  // CORS headers
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
    const siteDomain = req.headers['x-site-domain'] || req.body.siteDomain;
    
    if (!siteDomain) {
      return res.status(400).json({ error: 'Site domain is required' });
    }
    
    // Parse cookies
    const cookies = cookie.parse(req.headers.cookie || '');
    const clientId = cookies[`client_id_${siteDomain.replace(/\./g, '_')}`] || uuidv4();
    const sessionId = cookies[`session_${siteDomain.replace(/\./g, '_')}`] || uuidv4();
    
    // Set cookies
    res.setHeader('Set-Cookie', [
      cookie.serialize(`client_id_${siteDomain.replace(/\./g, '_')}`, clientId, {
        maxAge: 365 * 24 * 60 * 60,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: false
      }),
      cookie.serialize(`session_${siteDomain.replace(/\./g, '_')}`, sessionId, {
        maxAge: 30 * 60,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
      })
    ]);
    
    // Default widget config
    const widgetConfig = {
      theme: {
        primaryColor: '#3B82F6',
        position: 'bottom-right',
        title: 'Рекомендуем для вас'
      },
      display: {
        maxProducts: 5,
        showImages: true,
        showPrices: true
      }
    };
    
    res.status(200).json({
      clientId,
      sessionId,
      widgetConfig,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Identify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}