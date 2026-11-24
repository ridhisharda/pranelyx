import assert from 'node:assert/strict';

const origin = new URL(process.argv[2] || 'https://daily-grove-wellness.spacestest.com').origin;
const backup = {
  profiles:[{id:'smoke-test',name:'Synthetic demo',age:'youngAdult',diet:'vegan',pace:'gentle'}],
  progress:{'smoke-test':{'2026-11-23':{mealsEaten:{Breakfast:true}}}},
  agenda:{'smoke-test':{manual:[{id:'walk',title:'Walk',day:'2026-11-23',kind:'task',time:'12:00'}],imported:[{title:'Private calendar data'}]}},
};
let cookie = '';
async function request(method,{body,headers={},authenticated=true,path='/api/backup'}={}) {
  const response = await fetch(origin+path,{
    method,signal:AbortSignal.timeout(12000),
    headers:{Origin:origin,...(authenticated&&cookie&&{Cookie:cookie}),...(body&&{'Content-Type':'application/json'}),...headers},
    body:body&&JSON.stringify(body),
  });
  const issued = response.headers.get('Set-Cookie');
  if (issued) cookie=issued.split(';')[0];
  const result = await response.json();
  return [response.status,result];
}

assert.deepEqual(await request('GET'),[200,{backup:null}]);
let revision=0;
try {
  const saved = await request('PUT',{body:{revision,backup}});
  assert.equal(saved[0],200,JSON.stringify(saved));
  revision=saved[1].revision;
  assert.equal(revision,1);
  assert.ok(cookie);
  const [,restored] = await request('GET');
  assert.deepEqual(restored.backup.profiles,backup.profiles);
  assert.deepEqual(restored.backup.progress,backup.progress);
  assert.equal(restored.backup.agenda['smoke-test'].imported,undefined);
  assert.equal(restored.backup.agenda['smoke-test'].manual[0].title,'Walk');
  assert.deepEqual(await request('GET',{authenticated:false}),[200,{backup:null}]);
  assert.equal((await request('PUT',{body:{revision:0,backup}}))[0],409);
  assert.equal((await request('PUT',{body:{revision,backup},headers:{Origin:'https://unrelated.example'}}))[0],403);
  assert.equal((await request('PUT',{body:{revision,backup:{profiles:[]}}}))[0],400);
  assert.equal((await request('GET'))[1].revision,revision);
  console.log('Hosted SQLite read/write, browser isolation, cross-origin rejection, validation, and revision checks passed.');
  const article = await request('GET',{path:'/api/learn',authenticated:false});
  assert.equal(article[0],200,JSON.stringify(article));
  assert.ok(article[1].excerpt);
  console.log('Live learning resource source: '+article[1].source);
} finally {
  if (cookie && revision) {
    assert.equal((await request('DELETE',{headers:{'If-Match':'"'+revision+'"'}}))[0],200);
    assert.equal((await request('GET'))[1].backup,null);
    console.log('Hosted delete verified. Synthetic payload cleared.');
  }
}
