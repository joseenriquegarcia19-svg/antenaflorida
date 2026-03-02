export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Si es una solicitud OPTIONS, responder inmediatamente
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const response = await fetch('https://eltoque.com/tasas-de-cambio-cuba', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      }
    });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch from eltoque', status: response.status });
    }
    
    const html = await response.text();
    const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]+?)<\/script>/);
    
    if (match) {
      const data = JSON.parse(match[1]);
      const trm = data.props?.pageProps?.trmiExchange || data.props?.pageProps?.initialData?.trm;
      if (trm?.data?.api?.statistics) {
        const date = trm.date || new Date().toISOString();
        return res.status(200).json({ 
          success: true, 
          date,
          rates: trm.data.api.statistics 
        });
      }
    }
    
    res.status(500).json({ error: 'Data not found in HTML' });
  } catch (error) {
    console.error('Exchange rate fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}
