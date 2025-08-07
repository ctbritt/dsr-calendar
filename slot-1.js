// Get the current calendar components from the world time
const components = game.time.calendar.timeToComponents(game.time.worldTime);
console.warn("Slot 1 components", components, game.time.worldTime);
if (!components) {
  ui.notifications.warn("Calendar date was not set.");
  return;
}

// Use the new intercalary structure from components
const isIntercalary = components.isIntercalary || false;
console.log("Is Intercalary", isIntercalary);
const monthName = components.monthName;

console.log("Month Name", monthName);

// Get day name for regular months (not intercalary)
const days = game.time.calendar.days;
const dayName = isIntercalary
  ? `Day ${components.day}`
  : game.i18n.localize(
      days[(components.day - 1) % days.length]?.name ?? `Day ${components.day}`
    );
console.log("Day Name", dayName);

// Optionally, get season for both calendars
let season = "";
if (typeof CONFIG.time.worldCalendarClass.getSeason === "function") {
  season =
    CONFIG.time.worldCalendarClass.getSeason(
      components,
      CONFIG.time.worldCalendarConfig
    ) ?? "";
}

// Get moon data using the sophisticated moon engine
let moonInfo = "";
try {
  // Check if the sophisticated moon system is available
  if (window.DSC && typeof window.DSC.getCurrentMoonPhases === 'function') {
    const moonPhases = window.DSC.getCurrentMoonPhases();
    
    if (moonPhases && moonPhases.length > 0) {
      moonInfo = "<br><b>Moons:</b><br>";
      moonPhases.forEach((moonData) => {
        const phaseName = moonData.phaseName;
        const illumination = moonData.illumination;
        const moonColor = moonData.moonColor || "#ffffff";
        const riseTime = moonData.riseFormatted || '';
        const setTime = moonData.setFormatted || '';

        moonInfo += `<span style="color: ${moonColor}">●</span> <b>${moonData.moonName}</b>: ${phaseName} (${illumination}%)`;
        if (riseTime && setTime) {
          moonInfo += ` - Rise: ${riseTime}, Set: ${setTime}`;
        }
        moonInfo += '<br>';
      });
    } else {
      moonInfo = "<br><i>No moon data available</i><br>";
    }
  } else {
    // Fallback to basic moon info if sophisticated system not available
    moonInfo = "<br><i>Moon system not available</i><br>";
  }
} catch (error) {
  console.error("Error getting moon data:", error);
  moonInfo = "<br><i>Error getting moon data</i><br>";
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

const dateLine = isIntercalary
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
