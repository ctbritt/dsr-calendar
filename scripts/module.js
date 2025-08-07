Hooks.once("init", async () => {
  // Register a boolean setting for 24-hour time
  game.settings.register("dsr-calendar", "use24HourTime", {
    name: "Use 24-Hour Time",
    hint: "If enabled, time will be displayed in 24-hour format.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // Always load and register the Dark Sun calendar
  const resp = await fetch("modules/dsr-calendar/data/darksun-calendar.json");
  const calendarData = await resp.json();

  class DarkSunCalendar {
    constructor(config, options) {
      this.config = config;
      this.months = config.months.values;
      this.days = config.days.values;
      this.hoursPerDay = config.days.hoursPerDay;
      this.minutesPerHour = config.days.minutesPerHour;
      this.secondsPerMinute = config.days.secondsPerMinute;
      this.secondsPerDay =
        this.hoursPerDay * this.minutesPerHour * this.secondsPerMinute;
      this.yearZero = config.years.yearZero;
      this.firstWeekday = config.years.firstWeekday;
      this.daysPerYear = config.days.daysPerYear;
      this.seasons = config.seasons.values;
      this.yearsName = config.years.name?.values;
      this.moons = config.moons || [];
    }

    /**
     * Calculates moon phase for a given moon and date
     * @param {Object} moon - Moon configuration object
     * @param {number} year - Current year
     * @param {number} dayOfYear - Day of year (0-based)
     * @returns {Object} Moon phase information
     */
    calculateMoonPhase(moon, year, dayOfYear) {
      // Use offset to determine the cycle day for day 1 of year 1
      const offset = moon.offset || 0;

      // Calculate total calendar day since day 1 of year 1
      const totalCalendarDay = this.getTotalCalendarDay(year, dayOfYear);
      // Calculate current cycle day using offset
      const cycleDay = (offset + totalCalendarDay) % moon.cycleLength;
      // Find current phase
      let phaseIndex = 0;
      let phaseDay = 0;
      let cumulativeDays = 0;

      for (let i = 0; i < moon.phases.length; i++) {
        const phase = moon.phases[i];
        // Handle decimal phase lengths by rounding for comparison
        const phaseLength = Math.round(phase.length);
        if (cycleDay < cumulativeDays + phaseLength) {
          phaseIndex = i;
          phaseDay = Math.floor(cycleDay - cumulativeDays) + 1;
          break;
        }
        cumulativeDays += phaseLength;
      }

      return {
        name: moon.name,
        phase: moon.phases[phaseIndex],
        phaseIndex,
        phaseDay,
        cycleDay: cycleDay + 1,
        cycleLength: moon.cycleLength,
        color: moon.color,
      };
    }

    /**
     * Converts worldTime (ms) to calendar components: year, month, day, hour, minute, second.
     * Determines intercalary status internally.
     * @param {number} worldTime - The world time in milliseconds.
     * @returns {Object} Calendar components.
     */
    timeToComponents(worldTime) {
      // 1. Calculate total seconds
      const totalSeconds = Math.floor(worldTime / 1000);
      const second = totalSeconds % this.secondsPerMinute;
      const totalMinutes = Math.floor(totalSeconds / this.secondsPerMinute);
      const minute = totalMinutes % this.minutesPerHour;
      const totalHours = Math.floor(totalMinutes / this.minutesPerHour);
      const hour = totalHours % this.hoursPerDay;
      const totalDays = Math.floor(totalHours / this.hoursPerDay);

      // 2. Find year and day of year
      const daysPerYear = this.daysPerYear;
      const year = Math.floor(totalDays / daysPerYear);
      const dayOfYear = totalDays % daysPerYear;

      // 3. Find month and day
      let month = null;
      let day = null;
      let isIntercalary = false;
      let monthName = null;
      const months = this.months;
      for (let i = 0; i < months.length; i++) {
        const m = months[i];
        const start = m.dayOffset;
        const end = m.dayOffset + m.days;
        if (dayOfYear >= start && dayOfYear <= end) {
          month = i;
          day = dayOfYear - m.dayOffset;
          isIntercalary = m.intercalary || false;
          monthName = m.name;
          break;
        }
      }

      // 4. Calculate moon phases
      const moons = this.moons.map((moon) =>
        this.calculateMoonPhase(moon, year, dayOfYear)
      );

      return {
        year,
        month,
        day,
        hour,
        minute,
        second,
        isIntercalary,
        monthName,
        moons,
      };
    }

    /**
     * Converts calendar components to world time (seconds).
     * Determines intercalary status internally.
     */
    componentsToTime(components) {
      const { year, month, day, hour, minute, second } = components;
      const yearZero = this.yearZero;
      const daysPerYear = this.daysPerYear;
      let y = year - yearZero;

      // Find the month in the months array (month is 0-based, array is 0-based)
      const m = this.months[month];
      if (!m)
        throw new Error(
          `Month ${month} not found in calendar data. Available months: ${this.months.length}`
        );
      let dayOfYear = m.dayOffset + day;
      const totalDays = y * daysPerYear + dayOfYear;

      // Calculate total seconds: (days * secondsPerDay) + (hours * secondsPerHour) + (minutes * secondsPerMinute) + seconds
      const totalSeconds =
        totalDays * this.secondsPerDay +
        hour * this.minutesPerHour * this.secondsPerMinute +
        minute * this.secondsPerMinute +
        second;

      // Return in milliseconds to match timeToComponents expectation
      return totalSeconds * 1000;
    }

    getDayOfYear(components) {
      // Month is 0-based, array is 0-based
      const m = this.months[components.month];
      if (!m)
        throw new Error(
          `Month ${components.month} not found in calendar data. Available months: ${this.months.length}`
        );

      // Calculate day of year based on month offset and day within month
      return m.dayOffset + components.day;
    }

    // Add utility functions as static methods on DarkSunCalendar
    /**
     * Returns the season name for the given date components.
     * @param {Object} components - Calendar components (year, month, day, ...)
     * @param {Object} calendarConfig - The calendar config object
     * @returns {string|null} The season name or null if not found
     */
    static getSeason(components, calendarConfig) {
      const months = calendarConfig.months.values;
      const seasons = calendarConfig.seasons.values;
      const monthIdx = components.month;
      if (monthIdx == null) return null;
      for (const season of seasons) {
        // Handle wrap-around seasons
        if (season.monthStart <= season.monthEnd) {
          if (
            monthIdx + 1 >= season.monthStart &&
            monthIdx + 1 <= season.monthEnd
          ) {
            return season.name;
          }
        } else {
          // Season wraps around the year
          if (
            monthIdx + 1 >= season.monthStart ||
            monthIdx + 1 <= season.monthEnd
          ) {
            return season.name;
          }
        }
      }
      return null;
    }

    /**
     * Returns the year name for the given year in the 77-year Kings Age cycle.
     * @param {number} year - The absolute year
     * @param {Object} calendarConfig - The calendar config object
     * @returns {string|null} The year name or null if not found
     */
    static getYearName(year, calendarConfig) {
      const yearNames = calendarConfig.years.name.values;
      if (!Array.isArray(yearNames) || yearNames.length === 0) return null;
      // Year 1 = Ral's Fury (index 0), Year 77 = Guthay's Agitation (index 76)
      // For years > 77, we need to find the position within the 77-year cycle
      const cyclePosition = year % yearNames.length;
      return yearNames[cyclePosition] || null;
    }

    /**
     * Returns the Kings Age number (1-based) for a given year.
     * @param {number} year - The absolute year (1-based)
     * @returns {number} The Kings Age (1-based)
     */
    static getKingsAge(year) {
      return Math.floor(year / 77);
    }

    /**
     * Returns the year within the current Kings Age (1-based).
     * @param {number} year - The absolute year (1-based)
     * @returns {number} The year of the Kings Age (1-based)
     */
    static getKingsAgeYear(year) {
      return (year % 77) + 1;
    }

    /**
     * Calculates the total calendar day since year 1 (or year zero depending on calendar configuration).
     * @param {number} year - The absolute year (1-based)
     * @param {number} dayOfYear - The day of the year (1-based)
     * @returns {number} Total calendar day since year 1
     */
    getTotalCalendarDay(year, dayOfYear) {
      return year * this.daysPerYear + dayOfYear;
    }
  }
  CONFIG.time.worldCalendarClass = DarkSunCalendar;
  CONFIG.time.worldCalendarConfig = calendarData;
});

// The rest of your logic (promptAndSetCalendarDate, setCalendarDate, etc.) can remain in the ready hook if needed.
Hooks.once("ready", async () => {
  // Define setCalendarDate
  window.setCalendarDate = async function (
    year,
    month,
    day,
    hour,
    minute,
    second
  ) {
    // Create components object with the desired values
    const components = {
      year: year + 1,
      month: month - 1, // Convert 1-based month (1-15) to 0-based (0-14)
      day: day,
      hour: hour !== undefined && hour !== null ? hour : 0,
      minute: minute !== undefined && minute !== null ? minute : 0,
      second: second !== undefined && second !== null ? second : 0,
    };

    // Convert components to world time and set it
    const newTime = game.time.calendar.componentsToTime(components);
    await game.time.set(newTime);

    // Get the actual components back from the calendar system
    const actualComponents = game.time.calendar.timeToComponents(newTime);
    console.log("Actual components after setting:", actualComponents);

    ui.notifications.info(
      game.i18n
        .localize("DSR-CALENDAR.CalendarSet")
        .replace("{year}", actualComponents.year)
        .replace("{month}", actualComponents.month + 1) // Convert back to 1-based for display
        .replace("{day}", actualComponents.day)
        .replace("{hour}", actualComponents.hour)
        .replace("{minute}", actualComponents.minute)
        .replace("{second}", actualComponents.second)
    );
    return newTime;
  };

  // Prompt the user for a calendar date/time, return the parsed components (does not set world time)
  window.promptForCalendarDate = async function () {
    const CalendarClass = CONFIG.time.worldCalendarClass;
    const calendarConfig = CONFIG.time.worldCalendarConfig;
    const calendar = new CalendarClass(calendarConfig, {});
    const months = calendarConfig.months.values;
    let current = await game.time.calendar.timeToComponents(
      game.time.worldTime
    );
    // if (game.time && typeof game.time.worldTime === "number") {
    //   try {
    //     current = game.time.calendar.timeToComponents(game.time.worldTime);
    //   } catch (e) {}
    // }
    let monthOptions = months
      .map((m, i) =>
        m.intercalary
          ? `${i + 1}: [Intercalary] ${m.name}`
          : `${i + 1}: ${m.name}`
      )
      .join("\n");
    let yearInput = prompt(
      game.i18n.localize("DSR-CALENDAR.PromptYear"),
      current.year + 1
    );

    // Check if user cancelled the prompt
    if (yearInput === null) {
      return null;
    }
    let monthInput = prompt(
      game.i18n.localize("DSR-CALENDAR.PromptMonth"),
      current.month + 1 // Display 1-based month to user
    );

    // Check if user cancelled the prompt
    if (monthInput === null) {
      return null;
    }

    const monthIndex = parseInt(monthInput, 10);
    if (isNaN(monthIndex) || monthIndex < 0 || monthIndex >= months.length) {
      ui.notifications.error(game.i18n.localize("DSR-CALENDAR.InvalidMonth"));
      return null;
    }
    const selectedMonth = months[monthIndex];
    let dayPrompt = game.i18n
      .localize("DSR-CALENDAR.PromptDay")
      .replace("{month}", selectedMonth.name)
      .replace("{days}", selectedMonth.days);
    let dayInput = prompt(dayPrompt, current.day);

    // Check if user cancelled the prompt
    if (dayInput === null) {
      return null;
    }

    const day = parseInt(dayInput, 10);
    if (isNaN(day) || day < 1 || day > selectedMonth.days) {
      ui.notifications.error(game.i18n.localize("DSR-CALENDAR.InvalidDay"));
      return null;
    }
    let hourInput = prompt("Enter hour (0-23):", current.hour);

    // Check if user cancelled the prompt
    if (hourInput === null) {
      return null;
    }

    let minuteInput = prompt("Enter minute (0-59):", current.minute);

    // Check if user cancelled the prompt
    if (minuteInput === null) {
      return null;
    }

    let secondInput = prompt("Enter second (0-59):", current.second);

    // Check if user cancelled the prompt
    if (secondInput === null) {
      return null;
    }

    const hour = parseInt(hourInput, 10);
    const minute = parseInt(minuteInput, 10);
    const second = parseInt(secondInput, 10);
    if (isNaN(hour) || hour < 0 || hour > 23) {
      ui.notifications.error(game.i18n.localize("DSR-CALENDAR.InvalidHour"));
      return null;
    }
    if (isNaN(minute) || minute < 0 || minute > 59) {
      ui.notifications.error(game.i18n.localize("DSR-CALENDAR.InvalidMinute"));
      return null;
    }
    if (isNaN(second) || second < 0 || second > 59) {
      ui.notifications.error(game.i18n.localize("DSR-CALENDAR.InvalidSecond"));
      return null;
    }
    return {
      year: parseInt(yearInput, 10),
      month: monthIndex - 1, // Keep 0-based month
      day,
      hour,
      minute,
      second,
    };
  };

  // Prompt and set world time using the above
  window.promptAndSetCalendarDate = async function () {
    const components = await window.promptForCalendarDate();
    if (!components) return;
    return await window.setCalendarDate(
      components.year,
      components.month + 1, // Convert 0-based month back to 1-based for setCalendarDate
      components.day,
      components.hour,
      components.minute,
      components.second
    );
  };
});
