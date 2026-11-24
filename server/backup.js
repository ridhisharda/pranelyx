export const MAX_BACKUP_BYTES = 256 * 1024;
const choices = {
  age:['adult','child','teen','youngAdult','midlife','senior'],
  diet:['varied','vegetarian','vegan','pescatarian'],
  eggs:['yes','no'],
  pace:['gentle','steady'],
  mealGoal:['balanced','protein','fiber','energy','quick'],
  workout:['mixed','yoga','home','gym','cardio'],
  focus:['full','upper','lower','core','flexibility','endurance'],
};
const validId = /^[a-z0-9][a-z0-9-]{0,79}$/i;
const validDay = /^\d{4}-\d{1,2}-\d{1,2}$/;
const validTime = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const record = (value) => value && typeof value === 'object' && !Array.isArray(value);

function ensure(condition) {
  if (!condition) throw new TypeError('Invalid backup data.');
}

export function normalizeBackup(value) {
  ensure(record(value) && Array.isArray(value.profiles) && value.profiles.length <= 30);
  ensure(value.profiles.length > 0 && record(value.progress) && record(value.agenda));
  const ids = new Set();
  const profiles = value.profiles.map((profile) => {
    ensure(record(profile) && typeof profile.id === 'string' && validId.test(profile.id) && !ids.has(profile.id));
    ensure(!Object.hasOwn(Object.prototype,profile.id));
    ensure(typeof profile.name === 'string' && profile.name.trim() && profile.name.length <= 32);
    ids.add(profile.id);
    const normalized = {id:profile.id,name:profile.name.trim()};
    for (const [key, allowed] of Object.entries(choices)) {
      if (key === 'age' || key === 'diet' || key === 'pace' || profile[key] !== undefined) {
        ensure(allowed.includes(profile[key]));
        normalized[key] = profile[key];
      }
    }
    return normalized;
  });
  const progress = {};
  const agenda = {};
  for (const id of ids) {
    const savedProgress = value.progress[id] || {};
    ensure(record(savedProgress));
    progress[id] = Object.fromEntries(Object.entries(savedProgress).map(([day, entry]) => {
      ensure(validDay.test(day) && record(entry));
      const result = {};
      for (const field of ['Meals','Movement','Daily routine']) {
        if (entry[field] !== undefined) {
          ensure(typeof entry[field] === 'boolean');
          result[field] = entry[field];
        }
      }
      if (entry.mealsEaten !== undefined) {
        ensure(record(entry.mealsEaten));
        result.mealsEaten = {};
        for (const meal of ['Breakfast','Lunch','Dinner','Snack']) {
          if (entry.mealsEaten[meal] === undefined) continue;
          ensure(typeof entry.mealsEaten[meal] === 'boolean');
          result.mealsEaten[meal] = entry.mealsEaten[meal];
        }
      }
      return [day,result];
    }));
    const manual = value.agenda[id]?.manual || [];
    ensure(Array.isArray(manual) && manual.length <= 1500);
    const itemIds = new Set();
    agenda[id] = {manual:manual.map((item) => {
      ensure(record(item) && typeof item.id === 'string' && validId.test(item.id) && !itemIds.has(item.id));
      ensure(typeof item.day === 'string' && validDay.test(item.day));
      ensure(typeof item.title === 'string' && item.title.trim() && item.title.length <= 150);
      ensure(item.kind === 'task' || item.kind === 'event');
      ensure(item.time === '' || (typeof item.time === 'string' && validTime.test(item.time)));
      ensure(item.partOfDay === undefined || ['Morning','Midday','Evening'].includes(item.partOfDay));
      ensure(item.done === undefined || typeof item.done === 'boolean');
      itemIds.add(item.id);
      const {id,day,title,kind,time,partOfDay,done} = item;
      return {id,day,title,kind,time,partOfDay,done};
    })};
  }
  return {profiles,progress,agenda};
}
