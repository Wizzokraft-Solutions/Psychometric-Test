// Cloudflare Worker: forwards the app's Supabase calls from a *.workers.dev
// address, because some ISPs (e.g. in India) block *.supabase.co.
//
// Only the PostgREST API (/rest/v1/*) is forwarded — that's all the app uses
// (RPC calls). Deploy with `npx wrangler deploy` from this folder, then point
// VITE_SUPABASE_URL at the worker URL and rebuild.
const UPSTREAM = 'https://tkudyxopvvhwqalwiahk.supabase.co'

export default {
  async fetch(request) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/rest/v1/')) {
      return new Response('Not found', { status: 404 })
    }
    const target = UPSTREAM + url.pathname + url.search
    const headers = new Headers(request.headers)
    headers.delete('host')
    return fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    })
  },
}
