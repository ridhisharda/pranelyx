const quickMeals = [
  ['Berry oats with {yogurt}', 'Hummus and cucumber wrap', 'Microwave potato with beans and spinach'],
  ['Banana and sunflower butter toast', 'Chickpea and tomato salad', 'Quick brown rice bowl with edamame'],
  ['Apple and cinnamon oats', '{protein} and carrot wrap', 'Black bean and salsa tacos'],
  ['Peaches and pumpkin seeds with {yogurt}', 'White bean and avocado toast', 'Whole-grain pasta with peas and lemon'],
  ['Warm oats with pear and raisins', 'Lentil and cucumber bowl', 'Microwave sweet potato with black beans'],
  ['Kiwi and oats with {yogurt}', 'Hummus and grated carrot sandwich', 'Quick vegetable couscous with chickpeas'],
  ['Whole-grain toast with banana and tahini', '{protein} and avocado rice bowl', 'Tomato and white bean soup with toast'],
];
const quickProtein = {varied:'Chicken', vegetarian:'Chickpea', vegan:'Tofu', pescatarian:'Salmon'};

export function tailorMeals(meals, person, rotation = 0) {
  switch (person.mealGoal) {
    case 'protein':
      return [
        meals[0],
        meals[1] + ' with a side of edamame',
        meals[2],
        ['Protein snack', person.diet === 'vegan' ? 'Fortified soy yogurt or roasted chickpeas' : 'Plain Greek yogurt or roasted chickpeas'],
      ];
    case 'fiber':
      return [meals[0], meals[1] + ' with an apple', meals[2] + ' with a side of lentils'];
    case 'energy':
      return [...meals, ['Active-day snack', 'Banana and whole-grain toast with sunflower seed butter']];
    case 'quick': {
      const index = ((rotation % quickMeals.length) + quickMeals.length) % quickMeals.length;
      return quickMeals[index].map((meal) => meal
        .replace('{yogurt}',person.diet === 'vegan' ? 'fortified soy yogurt' : 'plain yogurt')
        .replace('{protein}',quickProtein[person.diet]));
    }
    default:
      return meals;
  }
}

const exercises = {
  yoga: {
    full:[['Marjaryasana–Bitilasana','rep','Cat–Cow'], ['Anjaneyasana','hold-side','Low Lunge with support'], ['Sukhasana','minute','Easy Pose with relaxed breathing']],
    upper:[['Marjaryasana–Bitilasana','rep','Cat–Cow'], ['Uttana Shishosana','hold','Extended Puppy Pose with hands on a chair'], ['Tadasana','hold','Mountain Pose with arms relaxed']],
    lower:[['Anjaneyasana','hold-side','Low Lunge with support'], ['Virabhadrasana II','hold-side','Warrior II with a short stance'], ['Janu Sirsasana','hold-side','Head-to-Knee Pose with a gentle forward hinge']],
    core:[['Dandayamana Bharmanasana','side','Balancing Table Pose'], ['Vasisthasana','hold-side','Side Plank with bottom knee down'], ['Setu Bandha Sarvangasana','rep','Bridge Pose']],
    flexibility:[['Vrksasana','hold-side','Tree Pose beside a wall'], ['Baddha Konasana','hold','Bound Angle Pose'], ['Tadasana','hold','Mountain Pose']],
    endurance:[['Utkatasana','hold','Chair Pose'], ['Virabhadrasana II','hold-side','Warrior II with a short stance'], ['Tadasana','hold','Mountain Pose']],
  },
  home: {
    full:[['Chair sit-to-stand','rep'], ['Wall push-up','rep'], ['Bird dog','side']],
    upper:[['Wall push-up','rep'], ['Light resistance-band row','rep'], ['Shoulder circles','direction']],
    lower:[['Chair sit-to-stand','rep'], ['Low step-up with support','side'], ['Supported heel raise','rep']],
    core:[['Bird dog','side'], ['Bent-knee heel tap','side'], ['Glute bridge','rep']],
    flexibility:[['Supported single-leg stand','hold-side'], ['Wall calf stretch','hold-side'], ['Standing reach','rep']],
    endurance:[['March in place','minute'], ['Chair sit-to-stand','rep'], ['Wall push-up','rep']],
  },
  gym: {
    full:[['Light leg press','rep'], ['Seated cable row','rep'], ['Machine chest press','rep']],
    upper:[['Seated cable row','rep'], ['Machine chest press','rep'], ['Light dumbbell curl','rep']],
    lower:[['Light leg press','rep'], ['Low step-up with support','side'], ['Supported calf raise','rep']],
    core:[['Light cable anti-rotation press','side'], ['Bird dog','side'], ['Glute bridge','rep']],
    flexibility:[['Wall calf stretch','hold-side'], ['Supported single-leg stand','hold-side'], ['Seated hamstring stretch','hold-side']],
    endurance:[['Stationary bike','cardio'], ['Light leg press','rep'], ['Seated cable row','rep']],
  },
};

const childYoga = [
  ['Marjaryasana–Bitilasana','rep','Cat–Cow'],
  ['Vrksasana','hold-side','Tree Pose beside a wall'],
  ['Baddha Konasana','hold','Butterfly Pose'],
];

export const workoutTitles = {
  mixed:'Everyday exercises', yoga:'Yoga asanas', home:'Home strength exercises',
  gym:'Gym exercises', cardio:'Cardio exercises',
};

const playExercises = {
  full:[['Animal pose reaches','play'], ['Follow-the-leader steps','play'], ['Dance and freeze','play']],
  upper:[['Reach for the sky','play'], ['Soft ball taps','play'], ['Wall push-ups','play']],
  lower:[['Hop between chalk marks','play'], ['Pretend to sit in a chair','play'], ['March like a giant','play']],
  core:[['Hands-and-knees opposite-arm reaches','play'], ['Walk along a chalk line','play'], ['Bear crawl','play']],
  flexibility:[['Butterfly stretch','play'], ['Tall tree balance','play'], ['Reach for the sky','play']],
  endurance:[['Dance and freeze','play'], ['Follow-the-leader steps','play'], ['Play tag','play']],
};

const alternatives = {
  yoga: {
    full:['Balasana','hold','Child’s Pose with a cushion'],
    upper:['Parsva Balasana','hold-side','Thread the Needle'],
    lower:['Supta Padangusthasana','hold-side','Reclining Hand-to-Big-Toe Pose with a strap'],
    core:['Supta Tadasana','hold','Reclined Mountain Pose'],
    flexibility:['Supta Baddha Konasana','hold','Reclined Bound Angle Pose with cushions'],
    endurance:['Balasana','hold','Child’s Pose with a cushion'],
  },
  home: {
    full:['Standing hip hinge','rep'],
    upper:['Wall slide','rep'],
    lower:['Standing side leg lift','side'],
    core:['Supine alternating march','side'],
    flexibility:['Seated ankle circles','direction'],
    endurance:['Side step-touch','minute'],
  },
  gym: {
    full:['Light lat pulldown','rep'],
    upper:['Light lat pulldown','rep'],
    lower:['Seated leg curl','rep'],
    core:['Supported standing march','side'],
    flexibility:['Seated ankle circles','direction'],
    endurance:['Treadmill walk','cardio'],
  },
};
const childAlternatives = {
  full:['Follow the path','play'], upper:['Make arm circles','play'], lower:['Side step-touch','minute'],
  core:['Follow the path','play'], flexibility:['Make arm circles','play'], endurance:['Side step-touch','minute'],
};

export function movementFor(person, group, rotation = 0) {
  const active = person.pace === 'steady';
  const focus = person.focus || 'full';
  const style = person.workout || 'mixed';
  const child = person.age === 'child';
  const gentle = !active || person.age === 'senior' || person.age === 'teen';
  const plan = child ? (style === 'yoga' ? childYoga : playExercises[focus])
    : style === 'cardio'
      ? [[person.age === 'senior' ? 'Level-ground walk' : 'Stationary cycling','cardio'], ...(focus === 'endurance' ? [['Easy walk to cool down','minute']] : exercises.home[focus].slice(0,2))]
      : exercises[style]?.[focus] || [['Comfortable walk','cardio'], ...exercises.home[focus].slice(0,2)];
  const sets = gentle || style === 'yoga' ? '1 set of 5–8' : '2 sets of 8–12';
  const hold = gentle ? '10–15 seconds' : '15–25 seconds';
  const instructions = {
    rep:sets + ' reps',
    side:sets + ' reps per side',
    direction:'5 slow circles each way',
    hold:hold + ' at a comfortable effort',
    'hold-side':hold + ' per side',
    minute:gentle ? '1 minute at an easy pace' : '2 minutes at an easy pace',
    cardio:gentle ? '5–10 minutes at an easy pace' : '15–25 minutes at a conversational pace',
    play:active ? 'About 2 minutes, with breaks when needed' : 'About 1 minute at a comfortable pace',
  };
  const alternate = child
    ? style === 'yoga' ? ['Balasana','hold','Child’s Pose with a cushion'] : childAlternatives[focus]
    : style === 'cardio' ? ['Side step-touch','minute'] : (alternatives[style] || alternatives.home)[focus];
  const day = ((rotation % 7) + 7) % 7;
  const replaceAt = day % plan.length;
  const ordered = day === 6 ? [...plan].reverse()
    : day % 2 === 0 ? [...plan.slice(replaceAt), ...plan.slice(0,replaceAt)]
    : plan.map((exercise,index) => index === replaceAt ? alternate : exercise);
  const rows = ordered.map(([name, type, englishName]) => [
    name,
    englishName ? englishName + ' · ' + instructions[type] : instructions[type],
  ]);
  if (child) return [...rows, ['Make it fit','Play with a grown-up nearby and take breaks whenever needed.']];
  if (style === 'gym' && person.age === 'teen') return [...rows, ['Make it fit','Train with adult supervision, learn the technique first, and use light resistance.']];
  return [...rows, ['Make it fit', group.note]];
}
