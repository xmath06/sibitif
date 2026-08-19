/**
 * Same-origin proxy (Cloudflare Worker).
 *
 * Frontend (SvelteKit SPA) memanggil /api/v1/* secara relatif terhadap
 * origin-nya sendiri. Worker ini meneruskan request tersebut ke backend
 * SnapDeploy (BACKEND_URL) dan menyajikan aset statis untuk sisanya.
 * Dengan cara ini cookie & CORS lintas-origin tidak menjadi masalah.
 */

type Env = {
  BACKEND_URL: string;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      const backend = (env.BACKEND_URL ?? '').replace(/\/$/, '');
      if (!backend) {
        return new Response('BACKEND_URL tidak dikonfigurasi', { status: 500 });
      }

      const target = new URL(url.pathname + url.search, backend);
      const headers = new Headers(request.headers);
      headers.delete('host');
      headers.set('host', new URL(backend).host);

      return fetch(new Request(target.toString(), {
        method: request.method,
        headers,
        body: request.body,
        redirect: 'follow'
      }));
    }

    return env.ASSETS.fetch(request);
  }
};
