// Prompt user to input the date and time, then set and display the current in-world date and time using the custom calendar
const components = await game.time.calendar.timeToComponents(
  game.time.worldTime
);
console.warn("Slot 1 components", components, game.time.worldTime);
if (!components) {
  ui.notifications.warn("Calendar date was not set.");
  return;
}

// is intercalary?

const months = game.time.calendar.months;
let intercalary = months[components.month].intercalary; // Already 0-based
const days = game.time.calendar.days;
const monthName = game.i18n.localize(
  months[components.month]?.name ?? `Month ${components.month + 1}`
);
const dayName = game.i18n.localize(
  days[(components.day - 1) % days.length]?.name ?? `Day ${components.day}` // Convert 1-based day to 0-based array index
);

// Optionally, get season for both calendars
let season = "";
if (typeof CONFIG.time.worldCalendarClass.getSeason === "function") {
  season =
    CONFIG.time.worldCalendarClass.getSeason(
      components,
      CONFIG.time.worldCalendarConfig
    ) ?? "";
}

// get moon data directly from the components
const moonDayOfYear = game.time.calendar.getDayOfYear(components);
const moon = game.time.calendar.moons.map((moon) =>
  game.time.calendar.calculateMoonPhase(moon, components.year, moonDayOfYear)
);

// Display moon information
let moonInfo = "";
if (moon && moon.length > 0) {
  moonInfo = "<br><b>Moons:</b><br>";
  moon.forEach((moonData, index) => {
    const phaseName = moonData.phase.name;
    const phaseDay = moonData.phaseDay;
    const cycleDay = moonData.cycleDay;
    const cycleLength = moonData.cycleLength;
    const moonColor = moonData.color || "#ffffff";

    moonInfo += `<span style="color: ${moonColor}">●</span> <b>${moonData.name}</b>: ${phaseName} (Day ${phaseDay} of phase, Day ${cycleDay}/${cycleLength} of cycle)<br>`;
  });
} else {
  moonInfo = "<br><i>No moon data available</i><br>";
}

const kingsAge = CONFIG.time.worldCalendarClass.getKingsAge(components.year);
const kingsAgeYear = CONFIG.time.worldCalendarClass.getKingsAgeYear(
  components.year
);
const yearName = CONFIG.time.worldCalendarClass.getYearName(
  components.year,
  CONFIG.time.worldCalendarConfig
);

// Calculate day of the year
const dayOfYear = game.time.calendar.getDayOfYear(components);

// Calculate total calendar day
const totalCalendarDay = game.time.calendar.getTotalCalendarDay(
  components.year,
  dayOfYear
);

// Time formatting
const use24Hour = game.settings.get("dsr-calendar", "use24HourTime");
let timeString;
if (use24Hour) {
  timeString = `${components.hour
    .toString()
    .padStart(2, "0")}:${components.minute
    .toString()
    .padStart(2, "0")}:${components.second.toString().padStart(2, "0")}`;
} else {
  let hour = components.hour % 12;
  if (hour === 0) hour = 12;
  const ampm = components.hour < 12 ? "AM" : "PM";
  timeString = `${hour
    .toString()
    .padStart(2, "0")}:${components.minute
    .toString()
    .padStart(2, "0")}:${components.second
    .toString()
    .padStart(2, "0")} ${ampm}`;
}

const dateLine = intercalary
  ? `<b>${monthName} ${components.day}</b>`
  : `<b>${dayName}, ${monthName} ${components.day}</b>`;

const message = `
<b>Kings Age ${kingsAge}, Year ${kingsAgeYear}, Year of ${yearName}
    </b><br>
  ${dateLine}<br>
  <i>${season}</i><br>
  <b>${timeString}</b><br>
  <i>Day ${dayOfYear} of ${game.time.calendar.daysPerYear}</i><br>
  <i>Total Calendar Day: ${totalCalendarDay}</i>${moonInfo}
`;

ChatMessage.create({ content: message });
