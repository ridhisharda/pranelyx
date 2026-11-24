import {setupCheckIn} from './check-in.js?v=1';
import {setupBackup, setupReading} from './cloud-tools.js?v=pranelyx';
import {extraMenus} from './menu-rotation.js?v=1';
import {dailyRoutine} from './routine.js?v=daily-variety';
import {exerciseGuides} from './exercise-guides.js?v=daily-variety';
import {tailorMeals, movementFor, workoutTitles} from './preferences.js?v=daily-variety';
import {setupAgenda} from './agenda.js?v=rotating-routine';
const $ = (id) => document.getElementById(id);
const form = $('settings');
const age = {
  child: {label:'5–12 years', theme:'youth', sleep:'keep a consistent bedtime. Five-year-olds generally need 10–13 hours including naps, and ages 6–12 need 9–12 hours.', movement:['Play tag or dance in short bursts','Ride a bike, play tag, or jump rope'], note:'Mix active play throughout the day. Include jumping or climbing when appropriate.'},
  teen: {label:'13–17 years', theme:'youth', sleep:'aim for 8–10 hours of sleep.', movement:['Walk or dance at a comfortable pace','Try cycling, dancing, or a favorite sport'], note:'Build toward 60 minutes of activity a day through movement you enjoy.'},
  youngAdult: {label:'18–35 years', theme:'young-adult', sleep:'aim for at least 7 hours of sleep.', movement:['Take a 10–20 minute comfortable walk','Try a 25–30 minute brisk walk or bike ride'], note:'Fit in movement between classes, work, or errands. Include strength activity on at least two days a week.'},
  midlife: {label:'36–64 years', theme:'midlife', sleep:'aim for at least 7 hours of sleep.', movement:['Take a 10–20 minute walk or an easy mobility break','Try a 25–30 minute brisk walk, swim, or bike ride'], note:'Break up long stretches of sitting and include strength activity on at least two days a week.'},
  senior: {label:'65+ years', theme:'senior', sleep:'aim for 7–8 hours of sleep.', movement:['Try a short walk or seated mobility exercises','Take a brisk walk at a pace that feels safe'], note:'Try supported balance practice beside a stable counter if appropriate for you.'}
};
const menu = {
  varied: [
    ['Oatmeal with berries and plain yogurt','Chicken, farro, and cucumber bowl','Salmon, sweet potato, and broccoli'],
    ['Egg and avocado toast with an orange','Turkey, avocado, and vegetable wrap','Chicken and brown rice with roasted carrots'],
    ['Plain yogurt, banana, and oats','Tuna, white bean, and tomato salad','Turkey and black bean chili with brown rice'],
    ['Scrambled eggs, spinach, and toast','Chicken and vegetable soup with whole-grain bread','Baked cod, peas, and potatoes']
  ],
  vegetarian: [
    ['Oatmeal with berries and plain yogurt','Chickpea and cucumber wrap','Lentil pasta with tomatoes and spinach'],
    ['Scrambled eggs and fruit on the side','White bean and avocado grain bowl','Black bean tacos with cabbage slaw'],
    ['Greek yogurt, banana, and oats','Hummus and roasted vegetable pita','Tofu stir-fry with brown rice and broccoli'],
    ['Egg and avocado toast with an orange','Tomato and lentil soup with whole-grain bread','Baked potato with beans and plain yogurt']
  ],
  pescatarian: [
    ['Oatmeal with berries and plain yogurt','Chickpea and cucumber wrap','Salmon, sweet potato, and broccoli'],
    ['Scrambled eggs and fruit on the side','White bean and avocado grain bowl','Baked cod, peas, and potatoes'],
    ['Greek yogurt, banana, and oats','Tuna, white bean, and tomato salad','Tofu stir-fry with brown rice and broccoli'],
    ['Egg and avocado toast with an orange','Tomato and lentil soup with whole-grain bread','Shrimp, brown rice, and roasted carrots']
  ],
  vegan: [
    ['Oats with fortified soy milk and berries','Chickpea and cucumber wrap','Lentil pasta with tomatoes and spinach'],
    ['Tofu scramble with whole-grain toast','White bean and avocado grain bowl','Black bean tacos with cabbage slaw'],
    ['Fortified soy yogurt, banana, and oats','Hummus and roasted vegetable pita','Tofu stir-fry with brown rice and broccoli'],
    ['Avocado toast with pumpkin seeds and fruit','Tomato and lentil soup with whole-grain bread','Baked potato with beans and sautéed greens']
  ]
};
const spaces = {
  youth: {intro:'Pick something tasty, find a fun way to move, and get ready for a good night’s sleep.', title:'Your plan for today', cards:['Meals and snacks','Move and play','Daily routine']},
  'young-adult': {intro:'Make time for meals, movement, and rest around work, school, or a busy week.', title:'Build your day'},
  midlife: {intro:'Make room for a satisfying meal, a movement break, and a steady evening routine.', title:'Your daily rhythm'},
  senior: {intro:'Plan nourishing meals, comfortable movement, and time to rest at your own pace.', title:'Today at your pace'}
};
const mealNote = {
  child:'Offer child-sized portions to start and let appetite guide seconds.',
  teen:'Add a snack if hungry, especially on active days.',
  youngAdult:'Adjust portions to your appetite and activity.',
  midlife:'Adjust portions to your appetite and activity.',
  senior:'Include a protein food at each meal and keep water within reach.'
};
const dietLabels = {varied:'Non-vegetarian', vegetarian:'Vegetarian', vegan:'Vegan', pescatarian:'Pescatarian'};
const eggFreeBreakfasts = {
  'Egg and avocado toast with an orange':'White bean and avocado toast with an orange',
  'Scrambled eggs, spinach, and toast':'Tofu scramble with spinach and whole-grain toast',
  'Scrambled eggs and fruit on the side':'Tofu scramble with fruit on the side'
};
function eggPreference(person) {
  return person.diet === 'vegan' ? 'no' : person.eggs || 'yes';
}
function dailyMeals(person, rotation) {
  const options = [...menu[person.diet], ...extraMenus[person.diet]];
  const [breakfast, lunch, dinner] = options[((rotation % options.length) + options.length) % options.length];
  return [eggPreference(person) === 'no' ? eggFreeBreakfasts[breakfast] || breakfast : breakfast, lunch, dinner];
}
const fallback = {id:'sample', name:'', age:'youngAdult', diet:'varied', pace:'gentle'};
const key = 'daily-grove-v1';
let state = {profiles:[], active:null, progress:{}};
try {
  const stored = JSON.parse(localStorage.getItem(key));
  if (Array.isArray(stored?.profiles) && stored.progress) state = stored;
} catch {}
const route = location.pathname;
const plannerPages = ['/plan','/agenda','/check-in'];
const sessionKey = 'daily-grove-profile';
let activeId = null;
try { activeId = sessionStorage.getItem(sessionKey); } catch {}
function setActive(id) {
  if (activeId !== id) agenda.reset();
  activeId = id;
  try {
    if (id) sessionStorage.setItem(sessionKey, id);
    else sessionStorage.removeItem(sessionKey);
  } catch {}
}
let current = new Date();
current.setHours(12, 0, 0, 0);
try {
  const savedDay = sessionStorage.getItem('pranelyx-selected-day');
  if (savedDay) {
    const parsed = new Date(Number(savedDay));
    if (Number.isFinite(parsed.getTime())) current = parsed;
  }
} catch {}
let storageError = false;
function save() {
  try { localStorage.setItem(key, JSON.stringify(state)); return true; }
  catch { storageError = true; return false; }
}
function profile() {
  return state.profiles.find((item) => item.id === activeId);
}
function dateKey(date) {
  return [date.getFullYear(), date.getMonth()+1, date.getDate()].join('-');
}
const selectedDay = () => ({
  key:dateKey(current),
  label:current.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}),
});
const agenda = setupAgenda({get:$,state,profile,save,selectedDay});
const checkIn = setupCheckIn({get:$,state,profile,save,selectedDay});
const pageTitles = {'/plan':'Daily plan','/agenda':'Agenda','/check-in':'Daily check-in','/coaching':'Wellness coaching'};
if (pageTitles[route]) document.title = pageTitles[route] + ' · Pranelyx';
for (const link of document.querySelectorAll('.site-header nav a')) {
  if (link.getAttribute('href') === route) link.setAttribute('aria-current','page');
}
function render() {
  const person = profile();
  const group = age[person?.age];
  const isHome = route === '/';
  const needsProfile = plannerPages.includes(route) && !group;
  $('welcome-space').hidden = !isHome && !needsProfile;
  $('welcome-space').classList.toggle('profile-required',needsProfile);
  $('profile-entry').hidden = Boolean(group);
  $('entry-title').textContent = needsProfile ? 'Open a profile for ' + pageTitles[route].toLowerCase() : 'Make it yours.';
  $('welcome-action').href = group ? '/plan' : '#profile-entry';
  $('welcome-action').textContent = group ? 'Open your daily plan' : 'Explore your plan';
  $('welcome-nav').hidden = Boolean(group);
  $('header-start').hidden = Boolean(group) || route === '/coaching';
  $('dashboard-nav').hidden = !group;
  $('profile-space').hidden = !group || !plannerPages.includes(route);
  $('profile-actions').hidden = !group;
  $('plan-hero').hidden = route !== '/plan';
  $('plan-content').hidden = route !== '/plan';
  $('agenda').hidden = route !== '/agenda';
  $('check-in').hidden = route !== '/check-in';
  $('coaching-page').hidden = route !== '/coaching';
  if (!group) {
    delete document.body.dataset.theme;
    $('routine-status').textContent = '';
    $('enter-profile').hidden = !state.profiles.length;
    $('entry-profiles').replaceChildren(...state.profiles.map((item) => new Option(item.name + (age[item.age] ? ' · ' + age[item.age].label : ' · Choose age group'),item.id)));
    return;
  }
  document.body.dataset.theme = group.theme;
  if (!plannerPages.includes(route)) return;
  try { sessionStorage.setItem('pranelyx-selected-day',String(current.getTime())); } catch {}
  const space = spaces[group.theme];
  $('plan-title').textContent = space.title;
  const day = dateKey(current);
  const rotation = Math.round(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()) / 86400000);
  const [breakfast, lunch, dinner, snack] = tailorMeals(dailyMeals(person, rotation), person, rotation);
  const target = dateKey(new Date()) === day ? 'Today' : current.toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric'});
  $('day').textContent = target;
  const firstDay = new Date(current);
  firstDay.setDate(current.getDate() - (current.getDay() + 6) % 7);
  $('week-days').replaceChildren(...Array.from({length:7}, (_, index) => {
    const date = new Date(firstDay);
    date.setDate(firstDay.getDate() + index);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'week-day outline';
    button.setAttribute('aria-label',date.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'}));
    button.setAttribute('aria-pressed',String(dateKey(date) === day));
    const weekday = document.createElement('span');
    weekday.textContent = date.toLocaleDateString(undefined,{weekday:'short'});
    const numeral = document.createElement('strong');
    numeral.textContent = date.getDate();
    button.append(weekday,numeral);
    button.addEventListener('click', () => {
      current = date;
      render();
      $('week-days').children[index].focus();
    });
    return button;
  }));
  $('today').textContent = new Date().toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric'});
  $('greeting').textContent = 'Hello, ' + person.name + '.';
  $('intro').textContent = space.intro;
  $('hero-action').textContent = 'View daily plan';
  $('summary').textContent = person.name + ' · ' + group.label + ' · ' + dietLabels[person.diet] + ' · ' + (eggPreference(person) === 'no' ? 'No eggs' : 'Eggs OK');
  const mainMeals = [['Breakfast',breakfast],['Lunch',lunch],['Dinner',dinner]];
  const plans = [
    ['◉','Meals', [...mainMeals,...(snack ? [snack] : []),['Portions',mealNote[person.age]]]],
    ['✦','Movement', movementFor(person,group,rotation)],
    ['☾','Daily routine', dailyRoutine(person,current)]
  ];
  const progress = state.progress[person.id] ||= {};
  const checked = progress[day] ||= {};
  const mealStatus = checked.mealsEaten ||= Object.fromEntries(
    mainMeals.map(([label]) => [label, Boolean(checked.Meals)])
  );
  function updateProgress() {
    const mealsComplete = mainMeals.every(([label]) => mealStatus[label]);
    const count = plans.filter(([, title]) => title === 'Meals' ? mealsComplete : checked[title]).length;
    $('count').textContent = count + ' of 3 complete';
    $('progress').value = count;
  }
  const cards = plans.map(([symbol,title,rows],index) => {
    const card = $('card').content.cloneNode(true);
    card.querySelector('.symbol').textContent = symbol;
    const displayTitle = title === 'Movement'
      ? (person.age === 'child' && person.workout !== 'yoga' ? 'Move and play' : workoutTitles[person.workout || 'mixed'])
      : space.cards?.[index] || title;
    card.querySelector('h3').textContent = displayTitle;
    for (const [label, body, description, personalIdea] of rows) {
      const line = document.createElement('li');
      const strong = document.createElement('strong');
      strong.textContent = label;
      const guide = title === 'Movement' && exerciseGuides[label];
      if (guide) {
        const [description, steps, benefits] = guide;
        const details = document.createElement('details');
        details.className = 'exercise-guide';
        const summary = document.createElement('summary');
        summary.append(strong);
        const dose = document.createElement('span');
        dose.textContent = body;
        const explanation = document.createElement('p');
        explanation.textContent = description;
        const howTo = document.createElement('strong');
        howTo.textContent = 'How to do it';
        const instructions = document.createElement('ol');
        for (const step of steps) {
          const item = document.createElement('li');
          item.textContent = step;
          instructions.append(item);
        }
        const benefitsHeading = document.createElement('strong');
        benefitsHeading.textContent = 'Benefits';
        const benefitText = document.createElement('p');
        benefitText.textContent = benefits;
        details.append(summary);
        const content = document.createElement('div');
        content.append(explanation,howTo,instructions,benefitsHeading,benefitText);
        details.append(content);
        // Keep the prescription visible while the guide is closed.
        summary.append(dose);
        line.append(details);
      } else if (title === 'Meals' && label !== 'Portions') {
        const mealKey = label === snack?.[0] ? 'Snack' : label;
        const meal = document.createElement('label');
        meal.className = 'meal-check';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute('aria-label','Mark ' + label.toLowerCase() + ' as eaten');
        input.checked = Boolean(mealStatus[mealKey]);
        input.addEventListener('change', () => {
          mealStatus[mealKey] = input.checked;
          save();
          updateProgress();
        });
        const details = document.createElement('span');
        details.append(strong,body);
        meal.append(input,details);
        line.append(meal);
      } else if (title === 'Daily routine') {
        const time = document.createElement('span');
        time.className = 'routine-time';
        time.textContent = label;
        strong.textContent = body;
        const hint = document.createElement('p');
        hint.textContent = description;
        const add = document.createElement('button');
        add.type = 'button';
        add.className = 'outline';
        add.textContent = 'Add to agenda';
        add.setAttribute('aria-label','Add ' + body + ' to agenda');
        add.addEventListener('click', () => {
          const added = agenda.addSuggestion(body, label);
          add.textContent = 'In agenda';
          $('routine-status').textContent = added ? body + ' added to the agenda.' : body + ' is already in the agenda.';
        });
        line.append(time,strong,hint,add);
        if (personalIdea) {
          const [idea, instruction] = personalIdea;
          const tip = document.createElement('p');
          tip.textContent = idea + '. ' + instruction;
          line.append(tip);
        }
      } else {
        line.append(strong,body);
      }
      card.querySelector('ul').append(line);
    }
    const completion = card.querySelector('.check');
    if (title === 'Meals') {
      completion.remove();
      return card;
    }
    const input = completion.querySelector('input');
    input.setAttribute('aria-label','Mark ' + title.toLowerCase() + ' complete');
    input.checked = !!checked[title];
    input.addEventListener('change', () => {
      checked[title] = input.checked;
      save();
      updateProgress();
    });
    return card;
  });
  $('routine-status').textContent = '';
  $('sleep-tip').textContent = 'Sleep goal: ' + group.sleep;
  $('cards').replaceChildren(...cards);
  updateProgress();
  if (route === '/agenda') agenda.render();
  if (route === '/check-in') checkIn.render();
}
function updateEggField() {
  const vegan = form.elements.diet.value === 'vegan';
  const eggs = form.elements.eggs;
  if (vegan) eggs.value = 'no';
  else if (eggs.disabled) eggs.value = '';
  eggs.disabled = vegan;
}
function fillForm(id) {
  const person = state.profiles.find((item) => item.id === id);
  for (const name of ['name','pace']) form.elements[name].value = (person || fallback)[name];
  form.elements.age.value = age[person?.age] ? person.age : '';
  form.elements.diet.value = person?.diet || '';
  form.elements.eggs.disabled = false;
  form.elements.eggs.value = person ? eggPreference(person) : '';
  form.elements.mealGoal.value = person?.mealGoal || 'balanced';
  form.elements.workout.value = person?.workout || 'mixed';
  form.elements.focus.value = person?.focus || 'full';
  updateEggField();
}
function edit(id = activeId) {
  $('profiles').replaceChildren(new Option('Add a profile',''), ...state.profiles.map((person) => new Option(person.name,person.id)));
  $('profiles').value = id || '';
  $('save-error').hidden = !storageError;
  fillForm($('profiles').value);
  $('profile').showModal();
}
$('edit').addEventListener('click', () => edit());
$('new-profile').addEventListener('click', () => edit(null));
$('sign-out').addEventListener('click', () => {
  setActive(null);
  render();
  if (plannerPages.includes(route) || route === '/') $('entry-title').focus();
});
$('enter-profile').addEventListener('submit', (event) => {
  event.preventDefault();
  const person = state.profiles.find((item) => item.id === $('entry-profiles').value);
  if (!person) return;
  if (!age[person.age]) {
    edit(person.id);
    return;
  }
  setActive(person.id);
  if (route === '/') {
    location.assign('/plan');
    return;
  }
  render();
  $(route === '/check-in' ? 'check-in-title' : route === '/agenda' ? 'agenda-title' : 'greeting').focus();
});
$('greeting').tabIndex = -1;
$('hero-action').addEventListener('click', () => $('plan-title').scrollIntoView());
$('close').addEventListener('click',() => $('profile').close());
$('profiles').addEventListener('change', () => fillForm($('profiles').value));
form.elements.diet.addEventListener('change', updateEggField);
form.addEventListener('submit',(event) => {
  event.preventDefault();
  const data = new FormData(form);
  const name = data.get('name').trim();
  if (!name) {
    form.elements.name.setCustomValidity('Enter a first name or nickname.');
    form.elements.name.reportValidity();
    return;
  }
  const id = data.get('selected') || crypto.randomUUID();
  const person = {id,name,age:data.get('age'),diet:data.get('diet'),eggs:data.get('eggs') || 'no',pace:data.get('pace'),mealGoal:data.get('mealGoal'),workout:data.get('workout'),focus:data.get('focus')};
  state.profiles = [...state.profiles.filter((item) => item.id !== id), person];
  setActive(id);
  save();
  $('profile').close();
  if (route === '/') {
    location.assign('/plan');
    return;
  }
  render();
  $(route === '/check-in' ? 'check-in-title' : route === '/agenda' ? 'agenda-title' : 'greeting').focus();
});
form.elements.name.addEventListener('input', () => form.elements.name.setCustomValidity(''));
for (const [id, delta] of [['previous',-1],['next',1]]) {
  $(id).addEventListener('click', () => { current.setDate(current.getDate()+delta); render(); });
}
$('day').addEventListener('click', () => { current = new Date(); current.setHours(12,0,0,0); render(); });
render();
setupBackup({get:$, state, restore(backup) {
  const localCalendars = state.agenda || {};
  state.profiles = backup.profiles;
  state.progress = backup.progress;
  state.agenda = Object.fromEntries(backup.profiles.map(({id}) => [id,{
    manual:backup.agenda[id]?.manual || [],
    imported:localCalendars[id]?.imported || [],
  }]));
  if (!profile()) setActive(null);
  const saved = save();
  render();
  return saved;
}});
setupReading($);

const coachSearch = $('coach-search');
const coachLocation = $('coach-location');
coachSearch.addEventListener('submit', (event) => {
  const location = coachLocation.value.trim();
  if (!location) {
    event.preventDefault();
    coachLocation.setCustomValidity('Enter a city or ZIP / postal code.');
    coachLocation.reportValidity();
    return;
  }
  coachSearch.elements.query.value = 'Health and wellness coach near ' + location;
});
coachLocation.addEventListener('input', () => coachLocation.setCustomValidity(''));
