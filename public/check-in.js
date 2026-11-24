export const checkInSuggestions = {
  steady: {title:'Feeling well', care:'Choose one small habit you want to keep today, such as taking a walk, having a regular meal, or starting your wind-down on time.', breath:true},
  tired: {title:'Low energy', care:'Take a short rest, sip water, and make time for a regular meal or snack if you’ve gone a while without eating. Keep activity easy today. If fatigue persists or interferes with daily life, ask a healthcare professional.'},
  stressed: {title:'Stressed or tense', care:'Take a short break somewhere quiet. Relax your shoulders and let your breathing settle. If it helps, focus on a single small task you can do next.', breath:true},
  sleep: {title:'Slept poorly', care:'Get some daylight when you can, and return to your usual bedtime this evening. Set aside time for a quiet activity before bed.', breath:true},
  congestion: {title:'Mild stuffiness or scratchy throat', care:'Rest and sip water. A comfortably warm drink can be a soothing home option. For stuffiness, consider saline nasal spray. A parent or caregiver can help a child choose what’s appropriate.'},
};

export function setupCheckIn({get, profile, selectedDay, state, save}) {
  const form = get('feeling-form');
  const select = get('feeling');
  const result = get('feeling-result');
  const status = get('feeling-status');
  function render() {
    const person = profile();
    if (!person) return;
    const {key,label} = selectedDay();
    get('feeling-date').textContent = label;
    const feeling = state.checkIns?.[person.id]?.[key] || '';
    select.value = feeling;
    const suggestion = checkInSuggestions[feeling];
    result.hidden = !suggestion;
    get('feeling-clear').hidden = !suggestion;
    status.textContent = '';
    if (!suggestion) return;
    get('feeling-title').textContent = suggestion.title;
    get('feeling-care').textContent = suggestion.care;
    get('feeling-breath').hidden = !suggestion.breath;
    get('feeling-youth').hidden = !['child','teen'].includes(person.age);
  }
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const person = profile();
    const feeling = select.value;
    if (!person || !Object.hasOwn(checkInSuggestions,feeling)) return;
    state.checkIns ||= {};
    const history = state.checkIns[person.id] ||= {};
    history[selectedDay().key] = feeling;
    const persisted = save();
    render();
    status.textContent = persisted ? 'Check-in saved for this day.' : 'Check-in saved for this session only.';
  });
  get('feeling-clear').addEventListener('click', () => {
    const person = profile();
    if (!person) return;
    delete state.checkIns[person.id][selectedDay().key];
    const persisted = save();
    render();
    select.focus();
    status.textContent = persisted ? 'Check-in cleared.' : 'Check-in cleared for this session only.';
  });
  return {render};
}
