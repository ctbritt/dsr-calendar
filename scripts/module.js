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

  // Anchor the 77-year cycle and Free Year mapping based on setting canon
  // - Year 14656 is Free Year 2
  // - It is King's Age 190, Year 27
  // - Year Name: "Wind's Reverance"
  const _CYCLE = 77;
  const _safeMod = (n, m) => ((n % m) + m) % m;
  (function _computeCycleOffsets() {
    try {
      const anchor = { year: 14656, kingsAge: 190, yearInAge: 27, yearName: "Wind's Reverance" };
      // Compute King's Age epoch offset so KA/Year-in-Age match the anchor
      const y = anchor.year;
      const r = _safeMod((anchor.yearInAge - 1) - (y - 1), _CYCLE);
      const base = Math.floor((y - 1 + r) / _CYCLE);
      const t = anchor.kingsAge - 1 - base;
      CONFIG.time = CONFIG.time || {};
      CONFIG.time._dsrKAEpochOffset = r + _CYCLE * t; // typically -76
      // Compute year name offset to match the anchor name
      const names = calendarData?.years?.name?.values || [];
      const targetIdx = names.findIndex((n) => n === anchor.yearName);
      const nameOffset = targetIdx >= 0 ? _safeMod(targetIdx - (y - 1), _CYCLE) : 0;
      CONFIG.time._dsrYearNameOffset = nameOffset;
    } catch (e) {
      // Fall back to zero offsets if anything goes wrong
      CONFIG.time._dsrKAEpochOffset = 0;
      CONFIG.time._dsrYearNameOffset = 0;
    }
  })();

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
      // Remove moons array - moon calculations now handled by sophisticated moon engine
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

      // 2. Find year (1-based) and day-of-year (0-based)
      const daysPerYear = this.daysPerYear;
      const year = Math.floor(totalDays / daysPerYear) + 1; // 1-based year
      const dayOfYear0 = totalDays % daysPerYear; // 0-based DOY

      // 3. Find month and day
      let month = null;
      let day = null;
      let isIntercalary = false;
      let monthName = null;
      const months = this.months;
      for (let i = 0; i < months.length; i++) {
        const m = months[i];
        const start = m.dayOffset; // inclusive
        const endExclusive = m.dayOffset + m.days; // exclusive
        if (dayOfYear0 >= start && dayOfYear0 < endExclusive) {
          month = i;
          // Return 1-based day within month
          day = dayOfYear0 - m.dayOffset + 1;
          isIntercalary = !!(m.isIntercalary || m.intercalary);
          monthName = m.name;
          break;
        }
      }

      // Moon calculations removed - now handled by sophisticated moon engine
      // Use window.DSC.getCurrentMoonPhases() or similar for moon data

      return {
        year,
        month,
        day,
        hour,
        minute,
        second,
        isIntercalary,
        monthName,
        // Remove moons array from return object
      };
    }

    /**
     * Converts calendar components to world time (seconds).
     * Determines intercalary status internally.
     */
    componentsToTime(components) {
      const { year, month, day, hour, minute, second } = components;
      const daysPerYear = this.daysPerYear;
      // 1-based year to 0-based year index for arithmetic
      const y = year - 1;

      // Find the month in the months array (month is 0-based, array is 0-based)
      const m = this.months[month];
      if (!m)
        throw new Error(
          `Month ${month} not found in calendar data. Available months: ${this.months.length}`
        );
      // components.day is 1-based -> convert to 0-based day count
      const dayOfYear0 = m.dayOffset + (day - 1); // 0..daysPerYear-1
      const totalDays0 = y * daysPerYear + dayOfYear0; // 0-based days since Year 1, Day 1

      // Calculate total seconds: (days * secondsPerDay) + (hours * secondsPerHour) + (minutes * secondsPerMinute) + seconds
      const totalSeconds =
        totalDays0 * this.secondsPerDay +
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

      // Calculate 1-based day-of-year based on month offset (0-based) and 1-based day
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
      const CYCLE = yearNames.length;
      const offset = CONFIG.time?._dsrYearNameOffset || 0;
      const idx = ((year - 1 + offset) % CYCLE + CYCLE) % CYCLE;
      return yearNames[idx] || null;
    }

    /**
     * Returns the Kings Age number (1-based) for a given year.
     * @param {number} year - The absolute year (1-based)
     * @returns {number} The Kings Age (1-based)
     */
    static getKingsAge(year) {
      const KAE = CONFIG.time?._dsrKAEpochOffset || 0;
      return Math.floor(((year - 1 + KAE) / 77)) + 1;
    }

    /**
     * Returns the year within the current Kings Age (1-based).
     * @param {number} year - The absolute year (1-based)
     * @returns {number} The year of the Kings Age (1-based)
     */
    static getKingsAgeYear(year) {
      const KAE = CONFIG.time?._dsrKAEpochOffset || 0;
      const cycle = 77;
      const v = ((year - 1 + KAE) % cycle + cycle) % cycle; // 0..76
      return v + 1;
    }

    /**
     * Calculates the total calendar day since year 1 (or year zero depending on calendar configuration).
     * @param {number} year - The absolute year (1-based)
     * @param {number} dayOfYear - The day of the year (1-based)
     * @returns {number} Total calendar day since year 1
     */
    getTotalCalendarDay(year, dayOfYear) {
      // year is 1-based, dayOfYear is 1-based
      return (year - 1) * this.daysPerYear + dayOfYear;
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
      year: year, // year is already 1-based
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
    let monthOptions = months
      .map((m, i) =>
        m.intercalary
          ? `${i + 1}: [Intercalary] ${m.name}`
          : `${i + 1}: ${m.name}`
      )
      .join("\n");
    let yearInput = prompt(
      game.i18n.localize("DSR-CALENDAR.PromptYear"),
      current.year
    );

    // Check if user cancelled the prompt
    if (yearInput === null) {
      return null;
    }
    let monthInput = prompt(
      game.i18n.localize("DSR-CALENDAR.PromptMonth") + "\n\n" + monthOptions,
      current.month + 1 // Display 1-based month to user
    );

    // Check if user cancelled the prompt
    if (monthInput === null) {
      return null;
    }

    const monthIndex = parseInt(monthInput, 10) - 1;
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
      month: monthIndex, // monthIndex is already 0-based
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

  // Initialize the sophisticated moon system
  try {
    // Moon engine scripts are now loaded by FoundryVTT via module.json
    if (window.AthasianMoonEngine && window.AthasianEclipseEngine) {
      // Create moon system with first new moon reference points
      // Ral: First new moon at totalCalendarDay 17
      // Guthay: First new moon at totalCalendarDay 63
      const moonSystem = new window.AthasianMoonEngine.AthasianMoonSystem(CONFIG.time.worldCalendarConfig.moons);
      
      const eclipseCalculator = new window.AthasianEclipseEngine.EclipseCalculator(moonSystem);
      
      // Create DSC interface
      const dsCfg = CONFIG.time.worldCalendarConfig;
      window.DSC = {
        isReady: () => true,
        // Current date snapshot (1-based month)
        getCurrentDate: () => {
          const currentTime = game.time.worldTime;
          const c = game.time.calendar.timeToComponents(currentTime);
          return {
            year: c.year,
            month: (c.month ?? 0) + 1,
            day: c.day,
            time: { hour: c.hour, minute: c.minute, second: c.second },
            calendar: dsCfg,
            intercalary: c.isIntercalary ? dsCfg.months.values[c.month]?.name : null,
          };
        },
        // Basic conversion helpers (absolute day is 1-based)
        dateToAbsoluteDays: (date) => {
          const months = dsCfg.months.values;
          const m = months[(date.month ?? 1) - 1];
          if (!m) throw new Error(`Invalid month ${date.month}`);
          const dayOfYear = m.dayOffset + date.day; // 1..375
          return (date.year - 1) * dsCfg.days.daysPerYear + dayOfYear;
        },
        fromAbsoluteDays: (absoluteDay) => {
          const daysPerYear = dsCfg.days.daysPerYear;
          const abs0 = absoluteDay - 1;
          const year = Math.floor(abs0 / daysPerYear) + 1;
          const dayOfYear = (abs0 % daysPerYear) + 1;
          const months = dsCfg.months.values;
          let monthIdx = 0;
          let day = dayOfYear;
          for (let i = 0; i < months.length; i++) {
            const m = months[i];
            const start = m.dayOffset + 1;
            const end = m.dayOffset + m.days;
            if (dayOfYear >= start && dayOfYear <= end) {
              monthIdx = i;
              day = dayOfYear - m.dayOffset;
              break;
            }
          }
          return { year, month: monthIdx + 1, day };
        },
        getCurrentMoonPhases: () => {
          try {
            const currentTime = game.time.worldTime;
            const components = game.time.calendar.timeToComponents(currentTime);
            const dayOfYear = game.time.calendar.getDayOfYear(components);
            const totalCalendarDay = game.time.calendar.getTotalCalendarDay(components.year, dayOfYear);
            
            // Use totalCalendarDay directly for moon calculations
            const moonData = moonSystem.getBothMoons(totalCalendarDay);
            const moons = dsCfg.moons || [];
            const ralCfg = moons.find(m => m.name === 'Ral');
            const guthayCfg = moons.find(m => m.name === 'Guthay');

            return [
              {
                moonName: moonData.ral.name,
                phaseName: moonData.ral.phaseName,
                illumination: moonData.ral.illumination,
                moonColor: ralCfg?.color || '#8de715',
                riseFormatted: moonData.ral.riseFormatted,
                setFormatted: moonData.ral.setFormatted,
                phase: moonData.ral.phase,
                period: moonData.ral.period
              },
              {
                moonName: moonData.guthay.name,
                phaseName: moonData.guthay.phaseName,
                illumination: moonData.guthay.illumination,
                moonColor: guthayCfg?.color || '#ffd700',
                riseFormatted: moonData.guthay.riseFormatted,
                setFormatted: moonData.guthay.setFormatted,
                phase: moonData.guthay.phase,
                period: moonData.guthay.period
              }
            ];
          } catch (error) {
            console.error('Error getting moon phases:', error);
            return [];
          }
        },
        getEclipseInfo: () => {
          try {
            const currentTime = game.time.worldTime;
            const components = game.time.calendar.timeToComponents(currentTime);
            const dayOfYear = game.time.calendar.getDayOfYear(components);
            const totalCalendarDay = game.time.calendar.getTotalCalendarDay(components.year, dayOfYear);
            
            // Use totalCalendarDay directly for eclipse calculations
            return eclipseCalculator.getEclipseInfo(totalCalendarDay);
          } catch (error) {
            console.error('Error getting eclipse info:', error);
            return { type: 'none', description: 'Error getting eclipse info' };
          }
        },
        findNextEclipse: () => {
          try {
            const currentTime = game.time.worldTime;
            const components = game.time.calendar.timeToComponents(currentTime);
            const dayOfYear = game.time.calendar.getDayOfYear(components);
            const totalCalendarDay = game.time.calendar.getTotalCalendarDay(components.year, dayOfYear);
            return eclipseCalculator.findNextEclipse(totalCalendarDay);
          } catch (error) { return null; }
        },
        findPreviousEclipse: () => {
          try {
            const currentTime = game.time.worldTime;
            const components = game.time.calendar.timeToComponents(currentTime);
            const dayOfYear = game.time.calendar.getDayOfYear(components);
            const totalCalendarDay = game.time.calendar.getTotalCalendarDay(components.year, dayOfYear);
            return eclipseCalculator.findPreviousEclipse(totalCalendarDay);
          } catch (error) { return null; }
        },
        getSeasonInfo: () => {
          const comp = game.time.calendar.timeToComponents(game.time.worldTime);
          const name = CONFIG.time.worldCalendarClass.getSeason(comp, dsCfg);
          const descs = {
            'High Sun': 'The most brutal season when the crimson sun reaches its peak.',
            'Sun Descending': 'The sun begins its slow retreat; respite from the worst heat.',
            'Sun Ascending': 'The sun grows stronger again; inhospitable conditions return.'
          };
          return name ? { name, description: descs[name] || '' } : null;
        },
        getKingsAge: (year) => CONFIG.time.worldCalendarClass.getKingsAge(year),
        getKingsAgeYear: (year) => CONFIG.time.worldCalendarClass.getKingsAgeYear(year),
        getYearName: (year) => CONFIG.time.worldCalendarClass.getYearName(year, dsCfg),
        getFreeYear: (year) => year - 14654,
        formatDarkSunDate: (dateObj) => {
          const y = dateObj?.year ?? window.DSC.getCurrentDate().year;
          const name = CONFIG.time.worldCalendarClass.getYearName(y, dsCfg) || '';
          const ka = CONFIG.time.worldCalendarClass.getKingsAge(y);
          const kay = CONFIG.time.worldCalendarClass.getKingsAgeYear(y);
          return `King's Age ${ka}, Year ${kay} — Year of ${name}`;
        },
        formatDarkSunDateFromFreeYear: (freeYear) => {
          const y = freeYear + 14654;
          return window.DSC.formatDarkSunDate({ year: y });
        },
        setDateFromTotalDays: async (totalDays, hour = 0, minute = 0, second = 0) => {
          try {
            // Convert total calendar days to year and day of year
            const daysPerYear = 375;
            const year = Math.floor(totalDays / daysPerYear) + 1;
            const dayOfYear = totalDays % daysPerYear;
            
            if (dayOfYear === 0) {
              // Handle case where totalDays is exactly divisible by daysPerYear
              return await window.DSC.setDateFromTotalDays(totalDays - 1, hour, minute, second);
            }
            
            // Find the month and day from day of year
            const months = CONFIG.time.worldCalendarConfig.months.values;
            let month = 0;
            let day = dayOfYear;
            
            for (let i = 0; i < months.length; i++) {
              const m = months[i];
              const start = m.dayOffset;
              const end = m.dayOffset + m.days;
              if (dayOfYear >= start && dayOfYear <= end) {
                month = i;
                day = dayOfYear - m.dayOffset;
                break;
              }
            }
            
            // Set the date using the existing setCalendarDate function
            return await window.setCalendarDate(year, month + 1, day, hour, minute, second);
          } catch (error) {
            console.error('Error setting date from total days:', error);
            throw error;
          }
        },
        // Advancement helpers (world time is in seconds internally)
        advanceMinutes: async (n) => { await game.time.advance(n * 60); return true; },
        advanceHours: async (n) => { await game.time.advance(n * 60 * 60); return true; },
        advanceDays: async (n) => { await game.time.advance(n * 24 * 60 * 60); return true; },
        advanceWeeks: async (n) => { await game.time.advance(n * 7 * 24 * 60 * 60); return true; },
        advanceMonths: async (n) => {
          const cur = game.time.calendar.timeToComponents(game.time.worldTime);
          let m = (cur.month ?? 0) + 1 + n;
          let y = cur.year;
          const monthsLen = dsCfg.months.values.length;
          while (m < 1) { m += monthsLen; y -= 1; }
          while (m > monthsLen) { m -= monthsLen; y += 1; }
          const targetMonth = dsCfg.months.values[m - 1];
          const d = Math.min(cur.day, targetMonth.days);
          await window.setCalendarDate(y, m, d, cur.hour, cur.minute, cur.second);
          return true;
        },
        advanceYears: async (n) => {
          const cur = game.time.calendar.timeToComponents(game.time.worldTime);
          await window.setCalendarDate(cur.year + n, (cur.month ?? 0) + 1, cur.day, cur.hour, cur.minute, cur.second);
          return true;
        },
        setKingsAgeDate: async (kingsAge, kingsAgeYear, month, day) => {
          const KAE = CONFIG.time?._dsrKAEpochOffset || 0;
          const effectiveYear = (kingsAge - 1) * 77 + kingsAgeYear;
          const year = effectiveYear - KAE;
          await window.setCalendarDate(year, month, day, 0, 0, 0);
          return true;
        },
        setDayOfYear: (dayOfYear) => {
          const cur = game.time.calendar.timeToComponents(game.time.worldTime);
          const abs = (cur.year - 1) * dsCfg.days.daysPerYear + dayOfYear;
          return window.DSC.setDateFromTotalDays(abs, cur.hour, cur.minute, cur.second);
        },
        showWidget: () => { /* wired when widget integrated */ },
        hideWidget: () => { /* wired when widget integrated */ },
        toggleWidget: () => { /* wired when widget integrated */ },
      };

      // Also make available for calendar-grid.js
      window.darkSunCalendar = {
        moonSystem,
        eclipseCalculator,
        convertPhaseNameToIcon: (phaseName) => {
          // Simple phase name to icon conversion
          const phaseIcons = {
            'New': 'new',
            'Waxing Crescent': 'waxing-crescent',
            'First Quarter': 'first-quarter',
            'Waxing Gibbous': 'waxing-gibbous',
            'Full': 'full',
            'Waning Gibbous': 'waning-gibbous',
            'Last Quarter': 'last-quarter',
            'Waning Crescent': 'waning-crescent'
          };
          return phaseIcons[phaseName] || 'full';
        }
      };

      // Notify listeners that DSC is ready
      Hooks.callAll('dark-sun-calendar:ready');
    } else {
      console.error('🌞 DSC: Moon engine scripts not loaded properly');
    }

  } catch (error) {
    console.error('🌞 DSC: Error initializing moon system:', error);
  }
});
