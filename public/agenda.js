import ICAL from './ical.js';

function calendarSlot(start) {
  if (start.isDate || start.zone === ICAL.Timezone.localTimezone) {
    return {
      day: [start.year,start.month,start.day].join('-'),
      time: start.isDate ? '' : [start.hour,start.minute].map((n) => String(n).padStart(2,'0')).join(':'),
    };
  }
  const date = start.toJSDate();
  return {
    day: [date.getFullYear(),date.getMonth()+1,date.getDate()].join('-'),
    time: [date.getHours(),date.getMinutes()].map((n) => String(n).padStart(2,'0')).join(':'),
  };
}

export function readCalendar(text, now = new Date()) {
  const calendar = new ICAL.Component(ICAL.parse(text));
  if (calendar.name !== 'vcalendar') throw new Error('Choose a valid .ics calendar file.');
  const first = new Date(now);
  first.setHours(0,0,0,0);
  first.setDate(first.getDate()-30);
  const last = new Date(now);
  last.setDate(last.getDate()+180);
  const events = calendar.getAllSubcomponents('vevent');
  const recurring = new Map();
  for (const event of events) {
    if (!event.hasProperty('recurrence-id')) continue;
    const uid = event.getFirstPropertyValue('uid');
    if (!recurring.has(uid)) recurring.set(uid, []);
    recurring.get(uid).push(event);
  }
  const items = [];
  const seen = new Set();
  function add(event, start) {
    if (!start || event.component.getFirstPropertyValue('status') === 'CANCELLED') return;
    const slot = calendarSlot(start);
    const title = (event.summary || 'Untitled calendar event').slice(0,150);
    const key = JSON.stringify([event.uid || title,slot.day,slot.time]);
    if (seen.has(key)) return;
    if (items.length >= 2500) throw new Error('This calendar has too many events. Export a shorter date range.');
    seen.add(key);
    items.push({...slot, title, kind:'event', id:'import-' + items.length});
  }
  let iterations = 0;
  for (const component of events) {
    if (component.hasProperty('recurrence-id') || !component.hasProperty('dtstart')) continue;
    const event = new ICAL.Event(component, {exceptions:recurring.get(component.getFirstPropertyValue('uid')) || []});
    if (!event.isRecurring()) { add(event,event.startDate); continue; }
    const iterator = event.iterator();
    for (let instance = iterator.next(); instance && instance.toJSDate() <= last; instance = iterator.next()) {
      if (++iterations > 40000) throw new Error('This calendar repeats too often. Export a shorter date range.');
      if (instance.toJSDate() < first) continue;
      const occurrence = event.getOccurrenceDetails(instance);
      add(occurrence.item, occurrence.startDate);
    }
  }
  return items;
}

export function setupAgenda({get, state, profile, selectedDay, save}) {
  const form = get('agenda-form');
  const fileField = get('calendar-file');
  const status = get('calendar-status');
  const list = get('agenda-items');
  let pendingImport = 0;
  function records(id) {
    state.agenda ||= {};
    return state.agenda[id] ||= {manual:[], imported:[]};
  }
  function persist(message) {
    status.textContent = save() ? message : 'Browser storage is unavailable. Changes will last until you reload.';
  }
  function render() {
    const person = profile();
    if (!person) return;
    const {key, label} = selectedDay();
    get('agenda-date').textContent = label;
    const {manual, imported} = records(person.id);
    const items = [...manual, ...imported].filter((item) => item.day === key);
    items.sort((a,b) => (a.time || '').localeCompare(b.time || '') || a.title.localeCompare(b.title));
    get('agenda-empty').hidden = items.length > 0;
    get('clear-calendar').hidden = imported.length === 0;
    list.replaceChildren(...items.map((item) => {
      const row = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = (item.time || item.partOfDay || (item.kind === 'event' ? 'No time set' : 'Any time')) + ' · ' + item.title;
      row.append(text);
      if (item.kind === 'task') {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = Boolean(item.done);
        checkbox.setAttribute('aria-label','Complete task ' + item.title);
        checkbox.addEventListener('change', () => {
          item.done = checkbox.checked;
          row.classList.toggle('completed',item.done);
          persist('');
        });
        row.classList.toggle('completed',Boolean(item.done));
        row.prepend(checkbox);
      }
      if (imported.includes(item)) {
        const source = document.createElement('small');
        source.textContent = 'Calendar';
        row.append(source);
      } else {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'outline';
        remove.textContent = 'Remove';
        remove.setAttribute('aria-label','Remove ' + item.title);
        remove.addEventListener('click', () => {
          records(person.id).manual = manual.filter((entry) => entry.id !== item.id);
          persist('Removed from agenda.');
          render();
          form.elements.title.focus();
        });
        row.append(remove);
      }
      return row;
    }));
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const person = profile();
    if (!person) return;
    const data = new FormData(form);
    const title = data.get('title').trim();
    if (!title) {
      form.elements.title.setCustomValidity('Enter a title for this item.');
      form.elements.title.reportValidity();
      return;
    }
    records(person.id).manual.push({id:crypto.randomUUID(),day:selectedDay().key,title,time:data.get('time'),kind:data.get('kind')});
    persist('Added to agenda.');
    form.reset();
    render();
    form.elements.title.focus();
  });
  form.elements.title.addEventListener('input', () => form.elements.title.setCustomValidity(''));
  get('import-calendar').addEventListener('click', () => fileField.click());
  fileField.addEventListener('change', async () => {
    const person = profile();
    const file = fileField.files[0];
    const request = ++pendingImport;
    fileField.value = '';
    if (!person || !file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw new Error('Choose a calendar file under 2 MB.');
      const items = readCalendar(await file.text());
      if (profile()?.id !== person.id || request !== pendingImport) return;
      if (!items.length) throw new Error('No events were found in this file or the recurring-event date range.');
      records(person.id).imported = items;
      persist('Imported ' + items.length + ' calendar events.');
      render();
    } catch (error) {
      if (profile()?.id === person.id && request === pendingImport) status.textContent = error.message || 'Unable to read this calendar.';
    }
  });
  get('clear-calendar').addEventListener('click', () => {
    const person = profile();
    if (!person) return;
    pendingImport++;
    records(person.id).imported = [];
    persist('Imported events cleared.');
    render();
    get('import-calendar').focus();
  });
  return {
    render,
    addSuggestion(title, partOfDay) {
      const person = profile();
      const day = selectedDay().key;
      const {manual} = records(person.id);
      if (manual.some((item) => item.day === day && item.title === title && item.kind === 'task')) return false;
      manual.push({id:crypto.randomUUID(),day,title,partOfDay,time:'',kind:'task'});
      persist('Added to agenda.');
      render();
      return true;
    },
    reset() {
      pendingImport++;
      form.reset();
      form.elements.title.setCustomValidity('');
      status.textContent = '';
      list.replaceChildren();
    },
  };
}
