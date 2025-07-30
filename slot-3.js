// Get current date info
await promptAndSetCalendarDate();
const currentTime = game.time.worldTime;
console.log("currentTime", currentTime);
const currentComponents = game.time.calendar.timeToComponents(currentTime);
console.log("currentComponents", currentComponents);

// Get Kings Age info
const kingsAge = CONFIG.time.worldCalendarClass.getKingsAge(
  currentComponents.year
);
const kingsAgeYear = CONFIG.time.worldCalendarClass.getKingsAgeYear(
  currentComponents.year
);
const yearName = CONFIG.time.worldCalendarClass.getYearName(
  currentComponents.year,
  CONFIG.time.worldCalendarConfig
);
console.log(`Kings Age ${kingsAge}, Year ${kingsAgeYear}, Year of ${yearName}`);

// Get day info
const dayOfYear = game.time.calendar.getDayOfYear(currentComponents);
const totalDay = game.time.calendar.getTotalCalendarDay(
  currentComponents.year,
  dayOfYear
);
console.log(`Day ${dayOfYear} of 375, Total Calendar Day: ${totalDay}`);

// Set a specific date
//await setCalendarDate(14655, 1, 1, 12, 0, 0);
