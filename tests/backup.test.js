import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import worker, { GroveStorage } from '../worker.js';

const sample = {
  profiles:[{id:'profile-a',name:'Demo profile',age:'youngAdult',diet:'vegan',pace:'gentle'}],
  progress:{'profile-a':{'2026-11-23':{mealsEaten:{Breakfast:true,Lunch:false}}}},
  agenda:{'profile-a':{manual:[{id:'task-a',title:'Walk',day:'2026-11-23',kind:'task',time:'',done:false}],imported:[{title:'Private calendar entry'}]}},
};

function testEnvironment(proxy) {
  const databases = new Map();
  const env = {
    API_WORKER:proxy,
    APP_OWNER_JWT:proxy ? 'test-binding' : undefined,
    GROVE_STORAGE: {
      idFromName:name => name,
      get(id) {
        if (!databases.has(id)) databases.set(id,new DatabaseSync(':memory:'));
        const db = databases.get(id);
        const storage = {
          sql:{exec(query,...bindings) {
            const statement = db.prepare(query);
            if (query.startsWith('SELECT')) return {toArray:() => statement.all(...bindings)};
            statement.run(...bindings);
          }},
          transactionSync(action) {
            db.exec('BEGIN');
            try {const result=action();db.exec('COMMIT');return result;}
            catch(error) {db.exec('ROLLBACK');throw error;}
          },
        };
        // Each request creates the object again while reusing its SQLite database.
        return {fetch:request => new GroveStorage({storage},env).fetch(request)};
      },
    },
  };
  return env;
}
function client(env) {
  let cookie;
  const origin = 'https://grove.test';
  return async function call(method, path='/api/backup', {data,headers={}}={}) {
    const response = await worker.fetch(new Request(origin+path,{
      method,
      headers:{Origin:origin,...(cookie && {Cookie:cookie}),...(data && {'Content-Type':'application/json'}),...headers},
      body:data && JSON.stringify(data),
    }),env);
    const issued = response.headers.get('Set-Cookie');
    if (issued) cookie = issued.split(';')[0];
    return {response, data:await response.json()};
  };
}

test('backup survives worker recreation and remains isolated by browser cookie', async () => {
  const env = testEnvironment();
  const first = client(env);
  const second = client(env);
  const saved = await first('PUT','/api/backup',{data:{revision:0,backup:sample}});
  assert.equal(saved.response.status,200);
  assert.match(saved.response.headers.get('Set-Cookie'),/Secure; HttpOnly; SameSite=Strict/);
  assert.equal(saved.response.headers.get('Cache-Control'),'no-store');
  const {data} = await first('GET');
  assert.equal(data.revision,1);
  assert.deepEqual(data.backup.profiles,sample.profiles);
  assert.deepEqual(data.backup.progress,sample.progress);
  assert.deepEqual(data.backup.agenda['profile-a'].manual,sample.agenda['profile-a'].manual);
  assert.equal(data.backup.agenda['profile-a'].imported,undefined);
  assert.deepEqual((await second('GET')).data,{backup:null});
});

test('invalid, oversized, cross-origin, and stale writes preserve the backup', async () => {
  const call = client(testEnvironment());
  await call('PUT','/api/backup',{data:{revision:0,backup:sample}});
  assert.equal((await call('PUT','/api/backup',{data:{revision:0,backup:sample}})).response.status,409);
  assert.equal((await call('PUT','/api/backup',{data:{revision:1,backup:{profiles:[]}}})).response.status,400);
  assert.equal((await call('PUT','/api/backup',{data:{revision:1,backup:'x'.repeat(270000)}})).response.status,413);
  assert.equal((await call('PUT','/api/backup',{data:{revision:1,backup:sample},headers:{Origin:'https://other.test'}})).response.status,403);
  assert.equal((await call('GET')).data.revision,1);
});

test('deletion removes the payload and prevents an old revision from being reused', async () => {
  const call = client(testEnvironment());
  await call('PUT','/api/backup',{data:{revision:0,backup:sample}});
  assert.equal((await call('DELETE','/api/backup',{headers:{'If-Match':'"0"'}})).response.status,409);
  assert.equal((await call('DELETE','/api/backup',{headers:{'If-Match':'"1"'}})).data.revision,2);
  assert.equal((await call('GET')).data.backup,null);
  assert.equal((await call('PUT','/api/backup',{data:{revision:1,backup:sample}})).response.status,409);
  assert.equal((await call('PUT','/api/backup',{data:{revision:2,backup:sample}})).data.revision,3);
});

test('learning integrates once per cached topic and falls back when unavailable', async () => {
  let calls = 0;
  const good = client(testEnvironment({fetch:async (url,options) => {
    calls++;
    assert.match(url,/wikipedia\/get-page-summary$/);
    assert.deepEqual(JSON.parse(options.body),{title:'Physical activity'});
    return Response.json({success:true,data:{extract:'An example article summary.'}});
  }}));
  assert.equal((await good('GET','/api/learn')).data.source,'Wikipedia via DeepSpace');
  assert.equal((await good('GET','/api/learn')).data.excerpt,'An example article summary.');
  assert.equal(calls,1);
  const bad = client(testEnvironment({fetch:async () => {throw Error('Downstream unavailable');}}));
  assert.equal((await bad('GET','/api/learn')).data.source,'CDC');
});
