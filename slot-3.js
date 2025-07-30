// Get current date info
const current = game.time.calendar.timeToComponents(game.time.worldTime);
console.log("Current date:", current);

// Get Kings Age info
const kingsAge = CONFIG.time.worldCalendarClass.getKingsAge(current.year);
const kingsAgeYear = CONFIG.time.worldCalendarClass.getKingsAgeYear(
  current.year
);
const yearName = CONFIG.time.worldCalendarClass.getYearName(
  current.year,
  CONFIG.time.worldCalendarConfig
);
console.log(`Kings Age ${kingsAge}, Year ${kingsAgeYear}, Year of ${yearName}`);

// Get day info
const dayOfYear = game.time.calendar.getDayOfYear(current);
const totalDay = game.time.calendar.getTotalCalendarDay(
  current.year,
  dayOfYear
);
console.log(`Day ${dayOfYear} of 375, Total Calendar Day: ${totalDay}`);

// Set a specific date
//await setCalendarDate(14655, 1, 1, 12, 0, 0);
