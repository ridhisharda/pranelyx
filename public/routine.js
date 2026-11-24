const week = [
  [
    ['Pick something to look forward to', 'Choose one thing you’d enjoy doing this week and put it on your agenda.'],
    ['Take a music break', 'Play one favorite song and give it your full attention.'],
    ['Get one thing ready for tomorrow', 'Put your bag, water bottle, or clothes where you can easily find them.'],
  ],
  [
    ['Start with daylight', 'Open the curtains or step outside for a few minutes if you can.'],
    ['Make a colorful snack', 'Pick a fruit or vegetable you enjoy and add it to your afternoon snack.'],
    ['Read a little before bed', 'Pick a book, comic, or magazine and read for 10 minutes.'],
  ],
  [
    ['Choose one small priority', 'Write down one thing you want to finish today. Give it a spot on your agenda.'],
    ['Step away for five minutes', 'Leave your usual seat and take an easy walk or stretch break.'],
    ['Set up an easy breakfast', 'Choose tomorrow’s breakfast and get the ingredients or dishes ready.'],
  ],
  [
    ['Make time for a slow breakfast', 'Spend the first few bites noticing how your food tastes.'],
    ['Check in with someone', 'Say hello to someone you haven’t talked with in a while.'],
    ['Try a screen-free wind-down', 'Put your device aside and spend 15 minutes drawing, reading, or listening to music.'],
  ],
  [
    ['Set up for your next activity', 'Set aside shoes, comfortable clothes, or anything you need for your next activity.'],
    ['Notice what’s around you', 'At a window or outside, pause and spot three things you hadn’t noticed before.'],
    ['Write down a good moment', 'Jot down one thing you enjoyed today, even if it was small.'],
  ],
  [
    ['Play a song as you get ready', 'Pick something that matches the kind of morning you want.'],
    ['Take a different route', 'Try a short, familiar alternative route with a companion if you need one.'],
    ['Make space for a favorite hobby', 'Spend 15 minutes on a puzzle, craft, book, or another activity you enjoy.'],
  ],
  [
    ['Do one thing before checking your phone', 'Eat breakfast, stretch, or get some daylight before you look at messages.'],
    ['Try a new lunch combination', 'Pair two foods you already have and see how they go together.'],
    ['Choose an easy lights-out cue', 'After brushing your teeth, dim the lights and switch to a quiet activity.'],
  ],
];

const ageBreaks = {
  child: [
    ['Draw a tiny treasure map', 'Ask a grown-up to choose the space, then draw three things to find.'],
    ['Play a freeze-dance round', 'Put on one song and ask a grown-up to stop the music so you can freeze.'],
  ],
  teen: [
    ['Take a break between study rounds', 'After a study block, take five minutes to get up or look away from your screen.'],
    ['Make a short playlist', 'Pick three songs for a walk, bus ride, or study break.'],
  ],
  youngAdult: [
    ['Reset between commitments', 'Use five minutes between classes, shifts, or calls to step away and breathe.'],
    ['Prep an easy snack for later', 'Pack a favorite snack for the stretch of the day when you’re busiest.'],
  ],
  midlife: [
    ['Give yourself a midday reset', 'Put a short break between errands or meetings and step away from your usual seat.'],
    ['Make dinner prep easier', 'Choose one ingredient to wash, chop, or set out before the evening gets busy.'],
  ],
  senior: [
    ['Make time for a catch-up', 'Call someone or invite them to join you for a short walk or a cup of tea.'],
    ['Take a seated stretch break', 'Sit in a stable chair and slowly roll your shoulders and move your ankles.'],
  ],
};

const mealActions = {
  balanced: ['Pick a produce side', 'Add a fruit or vegetable you already enjoy to a meal or snack.'],
  protein: ['Choose a protein snack', 'Pick a protein food that fits your eating preference, such as beans, plain yogurt, or fortified soy yogurt.'],
  fiber: ['Try a plant-food pairing', 'Pair a fruit, vegetable, bean, or whole grain with something you already enjoy.'],
  energy: ['Pack a snack for your active time', 'Choose an easy snack, such as fruit and whole-grain toast, to have available when you get hungry.'],
  quick: ['Pick a five-minute meal idea', 'Set aside two or three ingredients you can turn into an easy meal or snack.'],
};
const movementActions = {
  mixed: ['Pick an easy movement break', 'Choose a brief activity that fits the space and time you have.'],
  yoga: ['Set up for your yoga practice', 'Clear a comfortable space for your mat and check the poses in your movement plan.'],
  home: ['Make room for your home exercises', 'Clear a spot and set out any stable chair or equipment your plan needs.'],
  gym: ['Get ready for the gym', 'Pack what you need and pick a time when you can use the equipment comfortably.'],
  cardio: ['Choose a route or machine', 'Pick a flat route or a cardio machine, then choose a time that fits into your day.'],
};
const schedules = {
  child: 'Ask a grown-up to help you fit it around school or playtime.',
  teen: 'Pick a time around classes, homework, or an after-school activity.',
  youngAdult: 'Fit it between classes, shifts, or errands.',
  midlife: 'Attach it to a break between work, errands, or other commitments.',
  senior: 'Choose a time that feels comfortable and leave room to rest.',
};

export function dailyRoutine(person, date) {
  const weekday = date.getDay();
  const [morning, afternoon, evening] = week[weekday];
  const meal = mealActions[person.mealGoal || 'balanced'];
  const workout = person.age === 'child' && person.workout !== 'yoga' ? movementActions.mixed : movementActions[person.workout || 'mixed'];
  const ageIdeas = ageBreaks[person.age];
  const personalBreak = weekday === 1 ? ageIdeas[0] : weekday === 4 ? ageIdeas[1] : afternoon;
  const schedule = schedules[person.age];
  return [
    ['Morning', morning[0], morning[1] + ' ' + schedule],
    ['Midday', personalBreak[0], personalBreak[1], meal],
    ['Evening', evening[0], evening[1], workout],
  ];
}
