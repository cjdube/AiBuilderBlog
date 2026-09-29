// The blog is static. This Worker answers only /api/* (see run_worker_first in
// wrangler.jsonc); every other request is served straight from dist/.
//
//   GET  /api/comments?post=<slug>     approved comments for one post
//   POST /api/comments                 a reader's comment, stored as pending
//   GET  /api/admin/comments           pending comments, for /admin/comments
//   POST /api/admin/comments/<id>      { action: approve | spam | delete }
//
// The admin routes sit behind Cloudflare Access. Access blocks strangers at the
// edge; the Worker also checks the token Access attaches, so a gap in the
// Access rule does not open the database.

const NAME_MAX = 60;
const BODY_MAX = 2000;
const PER_HOUR = 5;
const SLUG = /^[a-z0-9-]{1,100}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/api/comments') {
        if (request.method === 'GET') return listApproved(url, env);
        if (request.method === 'POST') return submit(request, env);
        return json({ error: 'method not allowed' }, 405);
      }

      if (path === '/api/admin/comments' || path.startsWith('/api/admin/comments/')) {
        if (!(await isAdmin(request, env))) return json({ error: 'forbidden' }, 403);
        if (request.method === 'GET' && path === '/api/admin/comments') return listPending(env);
        const id = Number(path.slice('/api/admin/comments/'.length));
        if (request.method === 'POST' && Number.isInteger(id) && id > 0) {
          return moderate(id, request, env);
        }
        return json({ error: 'not found' }, 404);
      }
    } catch (err) {
      console.error(err);
      return json({ error: 'server error' }, 500);
    }

    return env.ASSETS.fetch(request);
  },
};

// --- public -----------------------------------------------------------------

async function listApproved(url, env) {
  const slug = url.searchParams.get('post') ?? '';
  if (!SLUG.test(slug)) return json({ error: 'bad post' }, 400);

  const { results } = await env.DB.prepare(
    `SELECT id, name, body, created_at FROM comments
     WHERE post_slug = ? AND status = 'approved' ORDER BY created_at, id`,
  ).bind(slug).all();
  return json(results);
}

async function submit(request, env) {
  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const slug = typeof input.post === 'string' ? input.post : '';
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  const token = typeof input.token === 'string' ? input.token : '';

  if (!SLUG.test(slug)) return json({ error: 'bad post' }, 400);
  if (!name || name.length > NAME_MAX) return json({ error: `Name must be 1 to ${NAME_MAX} characters.` }, 400);
  if (!body || body.length > BODY_MAX) return json({ error: `Comment must be 1 to ${BODY_MAX} characters.` }, 400);
  if (!token) return json({ error: 'Please complete the check.' }, 400);

  const ip = request.headers.get('CF-Connecting-IP') ?? '';
  if (!(await turnstileOk(token, ip, env))) return json({ error: 'The check failed. Please try again.' }, 400);

  // Only real, published posts take comments. The post page is in dist/, so
  // asking the asset server is the simplest source of truth.
  const page = await env.ASSETS.fetch(new URL(`/blog/${slug}/`, request.url));
  if (page.status !== 200) return json({ error: 'bad post' }, 400);

  const ipHash = await hashIp(ip, env);
  const recent = await env.DB.prepare(
    `SELECT count(*) AS n FROM comments
     WHERE ip_hash = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '-1 hour')`,
  ).bind(ipHash).first();
  if (recent.n >= PER_HOUR) return json({ error: 'Too many comments. Please try later.' }, 429);

  await env.DB.prepare(
    'INSERT INTO comments (post_slug, name, body, ip_hash) VALUES (?, ?, ?, ?)',
  ).bind(slug, name, body, ipHash).run();
  return json({ ok: true }, 201);
}

async function turnstileOk(token, ip, env) {
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  if (ip) form.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: form,
  });
  const out = await res.json();
  return out.success === true;
}

// The Turnstile secret doubles as the salt. If it is rotated, old hashes stop
// matching and the hourly limit simply starts over.
async function hashIp(ip, env) {
  const data = new TextEncoder().encode(`${env.TURNSTILE_SECRET}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// --- admin ------------------------------------------------------------------

async function listPending(env) {
  const { results } = await env.DB.prepare(
    `SELECT id, post_slug, name, body, created_at FROM comments
     WHERE status = 'pending' ORDER BY created_at, id`,
  ).all();
  return json(results);
}

async function moderate(id, request, env) {
  let action;
  try {
    ({ action } = await request.json());
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  let stmt;
  if (action === 'approve') stmt = env.DB.prepare("UPDATE comments SET status = 'approved' WHERE id = ?");
  else if (action === 'spam') stmt = env.DB.prepare("UPDATE comments SET status = 'spam' WHERE id = ?");
  else if (action === 'delete') stmt = env.DB.prepare('DELETE FROM comments WHERE id = ?');
  else return json({ error: 'bad action' }, 400);

  const { meta } = await stmt.bind(id).run();
  if (meta.changes === 0) return json({ error: 'not found' }, 404);
  return json({ ok: true });
}

// Cloudflare Access signs a JWT for every request it lets through and sends it
// in Cf-Access-Jwt-Assertion. Check its signature against the team's public
// keys, its audience against this Access app, and its expiry.
async function isAdmin(request, env) {
  // Local testing only: .dev.vars sets DEV_ADMIN, and it is honoured on
  // localhost alone. .dev.vars is never uploaded on deploy.
  const host = new URL(request.url).hostname;
  if (env.DEV_ADMIN === '1' && (host === 'localhost' || host === '127.0.0.1')) return true;

  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) return false;

  const parts = jwt.split('.');
  if (parts.length !== 3) return false;
  let header, payload;
  try {
    header = JSON.parse(b64urlText(parts[0]));
    payload = JSON.parse(b64urlText(parts[1]));
  } catch {
    return false;
  }
  if (header.alg !== 'RS256') return false;

  const certs = await fetch(`https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`, {
    cf: { cacheTtl: 3600 },
  }).then((r) => r.json());
  const jwk = certs.keys?.find((k) => k.kid === header.kid);
  if (!jwk) return false;

  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify'],
  );
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(parts[2]), signed);
  if (!valid) return false;

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.ACCESS_AUD)) return false;
  if (payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}`) return false;
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return false;
  return true;
}

// --- helpers ----------------------------------------------------------------

function b64urlBytes(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=');
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function b64urlText(s) {
  return new TextDecoder().decode(b64urlBytes(s));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}
