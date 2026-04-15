export default async function handler(req, res) {
  const { clientId } = req.query;
  const siteDomain = req.headers['x-site-domain'] || req.query.site_domain;
  
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, X-Site-Domain');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Sample products for demonstration
    const products = [
      {
        id: 1,
        name: 'Пицца Маргарита',
        category: 'pizza',
        price: 450,
        image_url: 'https://via.placeholder.com/150?text=Margherita',
        product_url: '/product/1'
      },
      {
        id: 2,
        name: 'Пицца Пепперони',
        category: 'pizza',
        price: 550,
        image_url: 'https://via.placeholder.com/150?text=Pepperoni',
        product_url: '/product/2'
      },
      {
        id: 3,
        name: 'Паста Карбонара',
        category: 'pasta',
        price: 420,
        image_url: 'https://via.placeholder.com/150?text=Carbonara',
        product_url: '/product/3'
      },
      {
        id: 4,
        name: 'Салат Цезарь',
        category: 'salad',
        price: 320,
        image_url: 'https://via.placeholder.com/150?text=Caesar',
        product_url: '/product/4'
      },
      {
        id: 5,
        name: 'Лимонад Домашний',
        category: 'drink',
        price: 180,
        image_url: 'https://via.placeholder.com/150?text=Lemonade',
        product_url: '/product/5'
      }
    ];
    
    // Simple recommendation logic (in production, use user behavior)
    const recommendedProducts = products.slice(0, 3);
    
    const widgetConfig = {
      theme: {
        primaryColor: '#3B82F6',
        position: 'bottom-right',
        title: '🎁 Рекомендуем для вас'
      },
      display: {
        maxProducts: 5,
        showImages: true,
        showPrices: true
      }
    };
    
    res.status(200).json({
      products: recommendedProducts,
      config: widgetConfig,
      clientId,
      siteDomain,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}