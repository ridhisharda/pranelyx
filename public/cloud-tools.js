const revisionKey = 'daily-grove-backup-revision';

function readRevision() {
  try { return Number(localStorage.getItem(revisionKey)) || 0; }
  catch { return 0; }
}

function rememberRevision(revision) {
  try { localStorage.setItem(revisionKey,String(revision)); }
  catch { /* The in-memory revision still works until reload. */ }
}

async function requestBackup(method, data, headers = {}) {
  const response = await fetch('/api/backup',{
    method,
    cache:'no-store',
    signal:AbortSignal.timeout(10000),
    headers:data ? {...headers,'Content-Type':'application/json'} : headers,
    ...(data && {body:JSON.stringify(data)}),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Backup service is unavailable.');
  return result;
}

export function setupBackup({get, state, restore}) {
  const status = get('backup-status');
  const controls = ['save-backup','restore-backup','delete-backup'].map(get);
  let revision = readRevision();
  function updateRevision(value) {
    revision = value;
    rememberRevision(value);
  }
  async function perform(message, action) {
    controls.forEach((button) => { button.disabled = true; });
    status.textContent = message;
    try { status.textContent = await action(); }
    catch (error) {
      status.textContent = error instanceof SyntaxError || error.name === 'TimeoutError' || error instanceof TypeError
        ? 'The backup service did not respond. Try again in a moment.'
        : error.message;
    } finally {
      controls.forEach((button) => { button.disabled = false; });
    }
  }
  controls[0].addEventListener('click', () => {
    if (!state.profiles.length) {
      status.textContent = 'Create a profile before saving a backup.';
      return;
    }
    const agenda = Object.fromEntries(Object.entries(state.agenda || {}).map(([id,{manual}]) => [id,{manual}]));
    perform('Saving your backup…', async () => {
      const result = await requestBackup('PUT',{revision,backup:{profiles:state.profiles,progress:state.progress,agenda}});
      updateRevision(result.revision);
      return 'Backup saved on ' + new Date(result.updatedAt).toLocaleString() + '.';
    });
  });
  controls[1].addEventListener('click', () => perform('Checking for a backup…', async () => {
    const result = await requestBackup('GET');
    if (!result.backup) {
      updateRevision(result.revision || 0);
      return 'There is no online backup for this browser.';
    }
    if (state.profiles.length && !window.confirm('Restore the saved backup? This replaces the current profiles, progress, and manually added agenda items.')) {
      return 'Restore canceled.';
    }
    const saved = restore(result.backup);
    updateRevision(result.revision);
    return saved ? 'Backup restored.' : 'Backup restored for this session. This browser could not save it locally.';
  }));
  controls[2].addEventListener('click', () => {
    if (!window.confirm('Delete the online backup for this browser? Your current local plan will stay available.')) return;
    perform('Deleting your backup…', async () => {
      const result = await requestBackup('DELETE',null,{'If-Match':'"' + revision + '"'});
      updateRevision(result.revision);
      return 'Online backup deleted.';
    });
  });
}

export function setupReading(get) {
  const section = get('wellness-reading');
  section.addEventListener('toggle', async () => {
    if (!section.open || section.dataset.loaded) return;
    section.dataset.loaded = 'true';
    try {
      const response = await fetch('/api/learn',{signal:AbortSignal.timeout(6500)});
      if (!response.ok) return;
      const article = await response.json();
      if (!article.excerpt || !article.url) return;
      get('reading-excerpt').textContent = article.excerpt;
      const link = get('reading-url');
      link.href = article.url;
      link.textContent = 'Read more · ' + article.source;
    } catch { /* Keep the CDC link available when the proxy is offline. */ }
  });
}
