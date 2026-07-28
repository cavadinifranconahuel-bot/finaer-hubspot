// Proxy HubSpot API — FINAER Incumplimientos (CM-261)
// HS_TOKEN se setea como secret de Cloudflare: wrangler secret put HS_TOKEN

const ALLOWED_ORIGIN = 'https://landing.finaersa.com.ar';
const HS_BASE        = 'https://api.hubapi.com';

export default {
  async fetch(request, env) {

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors() });
    }

    const url = new URL(request.url);

    if (!url.pathname.startsWith('/crm')) {
      return new Response('Not found', { status: 404 });
    }

    const target = HS_BASE + url.pathname + url.search;
    const isGet  = ['GET', 'HEAD'].includes(request.method);

    const upstream = await fetch(target, {
      method:  request.method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${env.HS_TOKEN}`,
      },
      body: isGet ? undefined : request.body,
    });

    return new Response(await upstream.text(), {
      status:  upstream.status,
      headers: { ...cors(), 'Content-Type': 'application/json' },
    });
  },
};

function cors() {
  return {
    'Access-Control-Allow-Origin':  ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age':       '86400',
  };
}
