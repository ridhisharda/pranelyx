import { MAX_BACKUP_BYTES, normalizeBackup } from './server/backup.js';

const cookieName = '__Host-grove-device';
const tokenPattern = /^[a-f0-9]{64}$/;
const apiHeaders = {'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const weekly = 7 * 24 * 60 * 60 * 1000;
const fallbackArticle = {
  title:'About physical activity',
  excerpt:'Physical activity can support sleep, physical function, and everyday wellbeing. Choose activities that suit your age and abilities.',
  url:'https://www.cdc.gov/physical-activity/php/about/index.html',
  source:'CDC',
};

function json(value,status = 200, headers = {}) {
  return Response.json(value,{status,headers:{...apiHeaders,...headers}});
}

function deviceToken(request) {
  const cookies = (request.headers.get('Cookie') || '').split(';').map((part) => part.trim());
  const value = cookies.find((part) => part.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  return tokenPattern.test(value || '') ? value : null;
}

function issueToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), byte => byte.toString(16).padStart(2,'0')).join('');
}

async function readJson(request) {
  const reader = request.body?.getReader();
  if (!reader) throw new TypeError('A JSON body is required.');
  const decoder = new TextDecoder('utf-8',{fatal:true});
  let bytes = 0;
  let body = '';
  for (let part = await reader.read(); !part.done; part = await reader.read()) {
    bytes += part.value.byteLength;
    if (bytes > MAX_BACKUP_BYTES) {
      await reader.cancel();
      throw new RangeError('This backup exceeds the storage limit.');
    }
    body += decoder.decode(part.value,{stream:true});
  }
  return JSON.parse(body + decoder.decode());
}

export class GroveStorage {
  constructor(state, env) {
    this.storage = state.storage;
    this.sql = state.storage.sql;
    this.env = env;
    this.sql.exec('CREATE TABLE IF NOT EXISTS backup (id INTEGER PRIMARY KEY CHECK(id = 1), revision INTEGER NOT NULL, updated_at TEXT NOT NULL, body TEXT NOT NULL)');
    this.sql.exec('CREATE TABLE IF NOT EXISTS article (id INTEGER PRIMARY KEY CHECK(id = 1), refresh_after INTEGER NOT NULL, body TEXT NOT NULL)');
  }

  async readArticle() {
    const cached = this.sql.exec('SELECT refresh_after, body FROM article WHERE id = 1').toArray()[0];
    const now = Date.now();
    if (cached && cached.refresh_after > now) return json(JSON.parse(cached.body));
    const previous = cached ? JSON.parse(cached.body) : fallbackArticle;
    if (!this.env.API_WORKER || !this.env.APP_OWNER_JWT) return json(previous);

    // Lock the refresh window before fetching, so a public burst cannot multiply billed calls.
    this.sql.exec('INSERT OR REPLACE INTO article VALUES (1, ?, ?)',now + weekly,JSON.stringify(previous));
    try {
      const response = await this.env.API_WORKER.fetch('https://api.internal/api/integrations/wikipedia/get-page-summary',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer ' + this.env.APP_OWNER_JWT},
        body:JSON.stringify({title:'Physical activity'}),
        signal:AbortSignal.timeout(4500),
      });
      if (!response.ok) return json(previous);
      const {success,data} = await response.json();
      if (!success || typeof data?.extract !== 'string' || !data.extract.trim()) return json(previous);
      const article = {
        title:'Physical activity',
        excerpt:data.extract.slice(0,460),
        url:'https://en.wikipedia.org/wiki/Physical_activity',
        source:'Wikipedia via DeepSpace',
      };
      this.sql.exec('UPDATE article SET body = ? WHERE id = 1',JSON.stringify(article));
      return json(article);
    } catch {
      return json(previous);
    }
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === '/api/learn') return this.readArticle();
    if (request.method === 'GET') {
      const row = this.sql.exec('SELECT revision, updated_at, body FROM backup WHERE id = 1').toArray()[0];
      if (!row) return json({backup:null});
      return json({backup:JSON.parse(row.body),revision:row.revision,updatedAt:row.updated_at});
    }
    if (request.method === 'DELETE') {
      const expected = request.headers.get('If-Match');
      return this.storage.transactionSync(() => {
        const current = this.sql.exec('SELECT revision, body FROM backup WHERE id = 1').toArray()[0];
        if (!current) return json({revision:0});
        if (expected !== '"' + current.revision + '"') return json({error:'The backup changed. Check the latest backup before deleting it.'},409);
        if (current.body === 'null') return json({revision:current.revision});
        const revision = current.revision + 1;
        this.sql.exec('UPDATE backup SET revision = ?, updated_at = ?, body = ? WHERE id = 1',revision,new Date().toISOString(),'null');
        return json({revision});
      });
    }
    let backup;
    let expectedRevision;
    try {
      const body = await readJson(request);
      expectedRevision = body?.revision;
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw new TypeError('Invalid backup revision.');
      backup = normalizeBackup(body.backup);
    } catch (error) {
      return json({error:error instanceof RangeError ? 'This backup is too large.' : 'The backup data is invalid.'},error instanceof RangeError ? 413 : 400);
    }

    // Keep the revision check and write in the same synchronous SQLite transaction.
    return this.storage.transactionSync(() => {
      const current = this.sql.exec('SELECT revision FROM backup WHERE id = 1').toArray()[0]?.revision || 0;
      if (expectedRevision !== current) return json({error:'A newer backup exists. Restore it before saving again.'},409);
      const revision = current + 1;
      const updatedAt = new Date().toISOString();
      this.sql.exec('INSERT OR REPLACE INTO backup VALUES (1, ?, ?, ?)',revision,updatedAt,JSON.stringify(backup));
      return json({revision,updatedAt});
    });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (['/plan','/agenda','/check-in','/coaching'].includes(path)) {
      return env.ASSETS.fetch(new Request(new URL('/',url),request));
    }
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    try {
      if (path === '/api/learn') {
        if (request.method !== 'GET') return json({error:'Method not allowed.'},405,{Allow:'GET'});
        return await env.GROVE_STORAGE.get(env.GROVE_STORAGE.idFromName('shared:learning')).fetch(request);
      }
      if (path !== '/api/backup') return json({error:'Not found.'},404);
      if (!['GET','PUT','DELETE'].includes(request.method)) return json({error:'Method not allowed.'},405,{Allow:'GET, PUT, DELETE'});
      const token = deviceToken(request);
      if (request.method === 'GET' && !token) return json({backup:null});
      if (request.method !== 'GET' && request.headers.get('Origin') !== url.origin) {
        return json({error:'Use Pranelyx to change a backup.'},403);
      }
      if (request.method === 'DELETE' && !token) return json({revision:0});
      if (request.method === 'PUT') {
        if (request.headers.get('Content-Type')?.split(';')[0].trim() !== 'application/json') {
          return json({error:'Use a JSON request.'},415);
        }
      }
      const key = token || issueToken();
      const response = await env.GROVE_STORAGE.get(env.GROVE_STORAGE.idFromName('device:' + key)).fetch(request);
      if (token || !response.ok) return response;
      const headers = new Headers(response.headers);
      headers.set('Set-Cookie',cookieName + '=' + key + '; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Strict');
      return new Response(response.body,{status:response.status,headers});
    } catch {
      return json({error:'Pranelyx could not reach storage. Please try again.'},503);
    }
  },
};
