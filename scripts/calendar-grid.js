/**
 * Dark Sun Calendar Grid Widget - Exact copy of Seasons & Stars CalendarGridWidget
 * Only changes: class name, template path, and window title for DSC branding
 */
class DarkSunCalendarGridWidget extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    constructor(initialDate) {
        super();
        this.sidebarButtons = [];
        // Use provided date or current date
        const manager = game.seasonsStars?.manager;
        if (initialDate) {
            this.viewDate = initialDate;
        }
        else {
            const currentDate = manager?.getCurrentDate();
            if (currentDate) {
                this.viewDate = currentDate;
            }
            else {
                // Fallback to default date
                this.viewDate = {
                    year: 2024,
                    month: 1,
                    day: 1,
                    weekday: 0,
                    time: { hour: 0, minute: 0, second: 0 },
                };
            }
        }
    }
    
    /**
     * Handle post-render setup
     */
    async _onRender(context, options) {
        await super._onRender(context, options);
        // Register as active instance
        DarkSunCalendarGridWidget.activeInstance = this;
        // Render any existing sidebar buttons
        this.renderExistingSidebarButtons();
    }
    
    /**
     * Calculate season for a given month
     * @param {number} month - Month number (1-12)
     * @returns {object} Season information
     */
    calculateSeasonForMonth(month) {
        // Dark Sun seasonal mapping:
        // Months 11-12, 1-2: High Sun (days 311-375, 1-60)
        // Months 3-6: Sun Descending (days 61-185)
        // Months 7-10: Sun Ascending (days 186-310)
        
        let seasonName = '';
        let startDay = 0;
        let endDay = 0;
        
        if (month >= 11 || month <= 2) {
            seasonName = 'High Sun';
            startDay = 311;
            endDay = 60;
        } else if (month >= 3 && month <= 6) {
            seasonName = 'Sun Descending';
            startDay = 61;
            endDay = 185;
        } else if (month >= 7 && month <= 10) {
            seasonName = 'Sun Ascending';
            startDay = 186;
            endDay = 310;
        } else {
            // Fallback
            seasonName = 'Unknown';
            startDay = 0;
            endDay = 0;
        }
        
        return {
            name: seasonName,
            description: this.getSeasonDescription(seasonName),
            startDay: startDay,
            endDay: endDay,
            month: month
        };
    }
    
    /**
     * Get season description
     * @param {string} seasonName - Name of the season
     * @returns {string} Season description
     */
    getSeasonDescription(seasonName) {
        const descriptions = {
            'High Sun': 'The most brutal season when the crimson sun reaches its peak intensity, scorching the land and making survival nearly impossible.',
            'Sun Descending': 'The sun begins its slow retreat, offering brief respite from the most intense heat, though conditions remain harsh.',
            'Sun Ascending': 'The sun grows stronger again, temperatures rise, and the land becomes increasingly inhospitable.'
        };
        return descriptions[seasonName] || '';
    }

    /**
     * Prepare rendering context for template
     */
    async _prepareContext(options = {}) {
        const context = await super._prepareContext(options);
        const manager = game.seasonsStars?.manager;
        if (!manager) {
            return Object.assign(context, {
                error: 'Calendar manager not initialized',
            });
        }
        const activeCalendar = manager.getActiveCalendar();
        const currentDate = manager.getCurrentDate();
        if (!activeCalendar || !currentDate) {
            return Object.assign(context, {
                error: 'No active calendar',
            });
        }
        const CalendarLocalization = window.CalendarLocalization || game.seasonsStars?.CalendarLocalization;
        const calendarInfo = CalendarLocalization?.getLocalizedCalendarInfo
            ? CalendarLocalization.getLocalizedCalendarInfo(activeCalendar)
            : {
                id: activeCalendar.id,
                label: activeCalendar.name || 'Dark Sun Calendar',
                description: activeCalendar.description || '',
            };
        const monthData = this.generateMonthData(activeCalendar, this.viewDate, currentDate);
        const clickBehavior = game.settings.get('seasons-and-stars', 'calendarClickBehavior');
        const isGM = game.user?.isGM || false;
        // Generate UI hint based on current settings
        let uiHint = '';
        if (isGM) {
            if (clickBehavior === 'viewDetails') {
                uiHint = 'Click dates to view details. Ctrl+Click to set current date.';
            }
            else {
                uiHint = 'Click dates to set current date.';
            }
        }
        else {
            uiHint = 'Click dates to view details.';
        }
        
        // Calculate season for the viewed month
        const seasonInfo = this.calculateSeasonForMonth(this.viewDate.month);
        
        return Object.assign(context, {
            calendar: calendarInfo,
            viewDate: this.viewDate,
            currentDate: currentDate.toObject(),
            monthData: monthData,
            monthName: activeCalendar.months[this.viewDate.month - 1]?.name || 'Unknown',
            monthDescription: activeCalendar.months[this.viewDate.month - 1]?.description,
            yearDisplay: this.formatDarkSunYear(this.viewDate.year),
            isGM: isGM,
            clickBehavior: clickBehavior,
            uiHint: uiHint,
            weekdays: activeCalendar.weekdays.map(wd => ({
                name: wd.name,
                abbreviation: wd.abbreviation,
                description: wd.description,
            })),
            // Add intercalary information for template
            hasIntercalary: monthData.intercalaryDays && monthData.intercalaryDays.length > 0,
            intercalaryDays: monthData.intercalaryDays || [],
            // Add season information for template
            seasonInfo: seasonInfo,
        });
    }
    
    /**
     * Generate calendar month data with day grid and note indicators
     */
    generateMonthData(calendar, viewDate, currentDate) {
        const engine = game.seasonsStars?.manager?.getActiveEngine();
        if (!engine)
            return { weeks: [], totalDays: 0 };
            
        // Use our own DSCalendarDate class - no dependency on SS CalendarDate
        const CalendarDate = window.DSCalendarDate;
        if (!CalendarDate) {
            console.error('🌞 DSC: DSCalendarDate class not available');
            return { 
                weeks: [], 
                totalDays: 0,
                error: 'DSCalendarDate class not loaded. Please reload the page.'
            };
        }
        
        // Get current date from SS manager for comparison
        const ssCurrentDate = game.seasonsStars?.manager?.getCurrentDate();
        if (!ssCurrentDate) {
            console.warn('🌞 DSC: Cannot get current date from SS manager');
            return { 
                weeks: [], 
                totalDays: 0,
                error: 'Seasons & Stars calendar system not ready. Please wait for SS to fully load.'
            };
        }
        
        console.debug('🌞 DSC: Using DSCalendarDate for calendar generation');
        
        // Get month information
        const monthInfo = calendar.months[viewDate.month - 1];
        if (!monthInfo)
            return { weeks: [], totalDays: 0 };
            
        // Check if this month should show an intercalary period after it
        const intercalaryAfterThisMonth = this.getIntercalaryDaysForMonth(viewDate.year, viewDate.month);
        
        // Calculate month length (considering leap years)
        const monthLength = engine.getMonthLength(viewDate.month, viewDate.year);
        
        // Find the first day of the month and its weekday
        const firstDayData = {
            year: viewDate.year,
            month: viewDate.month,
            day: 1,
            weekday: engine.calculateWeekday(viewDate.year, viewDate.month, 1),
            time: { hour: 0, minute: 0, second: 0 },
        };
        const firstDay = new CalendarDate(firstDayData, calendar);
        
        // Get notes for this month for note indicators with category and tooltip information
        const notesManager = game.seasonsStars?.notes;
        const monthNotes = new Map(); // dateKey -> note data
        if (notesManager) {
            // Get all notes for the month
            // Get notes synchronously for UI performance
            try {
                for (let day = 1; day <= monthLength; day++) {
                    const dayDateData = {
                        year: viewDate.year,
                        month: viewDate.month,
                        day: day,
                        weekday: 0,
                        time: { hour: 0, minute: 0, second: 0 },
                    };
                    const dayDate = new CalendarDate(dayDateData, calendar);
                    const allNotes = notesManager.storage?.findNotesByDateSync(dayDate) || [];
                    const notes = allNotes.filter(note => {
                        // Use Foundry's native permission checking
                        if (!game.user)
                            return false; // No user logged in
                        if (game.user.isGM)
                            return true;
                        const ownership = note.ownership;
                        const userLevel = ownership[game.user.id] || ownership.default || CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
                        return userLevel >= CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER;
                    });
                    if (notes.length > 0) {
                        const dateKey = this.formatDateKey(dayDate);
                        const dayCategories = new Set();
                        const noteDetails = [];
                        // Gather categories and details from all notes for this day
                        notes.forEach(note => {
                            const category = note.flags?.['seasons-and-stars']?.category || 'general';
                            const tags = note.flags?.['seasons-and-stars']?.tags || [];
                            dayCategories.add(category);
                            noteDetails.push({
                                title: note.name || 'Untitled Note',
                                tags: Array.isArray(tags) ? tags : [],
                            });
                        });
                        // Determine primary category (most common, or first if tied)
                        const categoryCount = new Map();
                        notes.forEach(note => {
                            const category = note.flags?.['seasons-and-stars']?.category || 'general';
                            categoryCount.set(category, (categoryCount.get(category) || 0) + 1);
                        });
                        const primaryCategory = Array.from(categoryCount.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'general';
                        monthNotes.set(dateKey, {
                            count: notes.length,
                            primaryCategory,
                            categories: dayCategories,
                            notes: noteDetails,
                        });
                    }
                }
            }
            catch (error) {
                console.warn('Error loading notes for calendar', error);
            }
        }
        
        // Build calendar grid
        const weeks = [];
        let currentWeek = [];
        
        // Fill in empty cells before month starts
        const startWeekday = firstDay.weekday || 0;
        for (let i = 0; i < startWeekday; i++) {
            currentWeek.push({
                day: 0,
                date: { year: 0, month: 0, day: 0, weekday: 0 },
                isCurrentMonth: false,
                isToday: false,
                hasNotes: false,
                isEmpty: true,
            });
        }
        
        // Fill in the days of the month
        for (let day = 1; day <= monthLength; day++) {
            const dayDateData = {
                year: viewDate.year,
                month: viewDate.month,
                day: day,
                weekday: engine.calculateWeekday(viewDate.year, viewDate.month, day),
                time: { hour: 0, minute: 0, second: 0 },
            };
            const dayDate = new CalendarDate(dayDateData, calendar);
            const isToday = this.isSameDate(dayDate, ssCurrentDate);
            const isViewDate = this.isSameDate(dayDate, viewDate);
            const dateKey = this.formatDateKey(dayDate);
            const noteData = monthNotes.get(dateKey);
            const noteCount = noteData?.count || 0;
            const hasNotes = noteCount > 0;
            
            // Determine category class for styling
            let categoryClass = '';
            if (hasNotes && noteData) {
                if (noteData.categories.size > 1) {
                    categoryClass = 'category-mixed';
                }
                else {
                    categoryClass = `category-${noteData.primaryCategory}`;
                }
            }
            
            // Create enhanced tooltip with note details
            let noteTooltip = '';
            if (hasNotes && noteData) {
                const notesList = noteData.notes
                    .map(note => {
                    const tagText = note.tags.length > 0 ? ` [${note.tags.join(', ')}]` : '';
                    return `${note.title}${tagText}`;
                })
                    .join('\n');
                noteTooltip = `${noteCount} note(s) (${noteData.primaryCategory}):\n${notesList}`;
            }
            
            // Calculate moon phases and eclipse info for this day
            let moonPhases = [];
            let primaryMoonPhase;
            let primaryMoonColor;
            let moonTooltip = '';
            let hasMultipleMoons = false;
            let eclipseInfo = null;
            let hasMajorCelestialEvent = false;
            
            try {
                // Get the Dark Sun Calendar instance
                const darkSunCalendar = window.darkSunCalendar;
                if (!darkSunCalendar?.moonSystem || !darkSunCalendar?.eclipseCalculator) {
                    console.debug('🌞 DSC: Moon system not available, skipping moon calculations');
                } else {
                    // Convert to absolute days for our moon system
                    const absoluteDay = window.AthasianCalendarCore.dateToAbsoluteDays(dayDate);
                    
                    // Check for eclipse (major celestial event)
                    eclipseInfo = darkSunCalendar.eclipseCalculator.getEclipseInfo(absoluteDay);
                    hasMajorCelestialEvent = eclipseInfo.type !== 'none';
                    
                    // Show moon phases only for view date or major celestial events
                    const shouldShowMoons = isViewDate || hasMajorCelestialEvent;
                    
                    if (shouldShowMoons) {
                        console.debug('🌞 DSC: Calculating moons for date (view date or eclipse):', dayDate);
                        
                        // Get moon data from our system
                        const moonData = darkSunCalendar.moonSystem.getBothMoons(absoluteDay);
                        
                        moonPhases = [
                            {
                                moonName: moonData.ral.name,
                                phaseName: moonData.ral.phaseName,
                                phaseIcon: darkSunCalendar.convertPhaseNameToIcon(moonData.ral.phaseName),
                                moonColor: '#8de715', // Ral's green color
                                illumination: moonData.ral.illumination,
                                rise: moonData.ral.riseFormatted,
                                set: moonData.ral.setFormatted,
                                dayInPhase: Math.floor(moonData.ral.phase * moonData.ral.period),
                                daysUntilNext: moonData.ral.period - Math.floor(moonData.ral.phase * moonData.ral.period),
                            },
                            {
                                moonName: moonData.guthay.name,
                                phaseName: moonData.guthay.phaseName,
                                phaseIcon: darkSunCalendar.convertPhaseNameToIcon(moonData.guthay.phaseName),
                                moonColor: '#ffd700', // Guthay's golden color
                                illumination: moonData.guthay.illumination,
                                rise: moonData.guthay.riseFormatted,
                                set: moonData.guthay.setFormatted,
                                dayInPhase: Math.floor(moonData.guthay.phase * moonData.guthay.period),
                                daysUntilNext: moonData.guthay.period - Math.floor(moonData.guthay.phase * moonData.guthay.period),
                            }
                        ];
                        
                        // Set primary moon (Ral for simplicity)
                        primaryMoonPhase = moonPhases[0].phaseIcon;
                        primaryMoonColor = moonPhases[0].moonColor;
                        hasMultipleMoons = true;
                        
                        console.debug('🌞 DSC: Moon phases calculated:', moonPhases);
                        
                        // Create moon tooltip
                        if (hasMajorCelestialEvent) {
                            moonTooltip = `${eclipseInfo.description}\n`;
                            moonTooltip += `Ral: ${moonData.ral.phaseName} (${moonData.ral.illumination}%) - Rise: ${moonData.ral.riseFormatted}, Set: ${moonData.ral.setFormatted}\n`;
                            moonTooltip += `Guthay: ${moonData.guthay.phaseName} (${moonData.guthay.illumination}%) - Rise: ${moonData.guthay.riseFormatted}, Set: ${moonData.guthay.setFormatted}`;
                        } else {
                            moonTooltip = `Ral: ${moonData.ral.phaseName} (${moonData.ral.illumination}%)\n`;
                            moonTooltip += `Guthay: ${moonData.guthay.phaseName} (${moonData.guthay.illumination}%)`;
                        }
                    }
                }
            }
            catch (error) {
                console.error('🌞 DSC: Error calculating moon phases/eclipses for date:', dayDate, error);
            }
            
            currentWeek.push({
                day: day,
                date: {
                    year: dayDate.year,
                    month: dayDate.month,
                    day: dayDate.day,
                    weekday: dayDate.weekday,
                },
                isCurrentMonth: true,
                isToday: isToday,
                hasNotes: hasNotes,
                // Moon phase properties
                moonPhases: moonPhases,
                primaryMoonPhase: primaryMoonPhase,
                primaryMoonColor: primaryMoonColor,
                moonTooltip: moonTooltip,
                hasMultipleMoons: hasMultipleMoons,
                // Eclipse properties
                eclipseInfo: eclipseInfo,
                hasMajorCelestialEvent: hasMajorCelestialEvent,
                // Additional properties for template
                isSelected: isViewDate,
                isViewDate: isViewDate, // Explicit flag for template
                isClickable: game.user?.isGM || false,
                weekday: dayDate.weekday,
                fullDate: `${viewDate.year}-${viewDate.month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
                noteCount: noteCount,
                noteMultiple: noteCount > 1,
                categoryClass: categoryClass,
                primaryCategory: noteData?.primaryCategory || 'general',
                noteTooltip: noteTooltip,
                canCreateNote: this.canCreateNote(),
            });
            
            // Start new week on last day of week
            if (currentWeek.length === calendar.weekdays.length) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }
        
        // Fill in empty cells after month ends
        if (currentWeek.length > 0) {
            while (currentWeek.length < calendar.weekdays.length) {
                currentWeek.push({
                    day: 0,
                    date: { year: 0, month: 0, day: 0, weekday: 0 },
                    isCurrentMonth: false,
                    isToday: false,
                    hasNotes: false,
                    isEmpty: true,
                });
            }
            weeks.push(currentWeek);
        }
        
        // Add intercalary period after this month if it has one
        for (const intercalary of intercalaryAfterThisMonth) {
            // Create a single row with 5 intercalary days
            const intercalaryRow = [];
            
            for (let intercalaryDay = 1; intercalaryDay <= 5; intercalaryDay++) {
                const intercalaryDateData = {
                    year: viewDate.year,
                    month: viewDate.month, // Use the month it comes after
                    day: 1, // Intercalary days use day 1 as placeholder
                    weekday: 0, // Intercalary days don't have weekdays
                    time: { hour: 0, minute: 0, second: 0 },
                    intercalary: intercalary.name,
                    intercalaryDay: intercalaryDay,
                };
                const intercalaryDate = new CalendarDate(intercalaryDateData, calendar);
                // Determine if this is the current or selected intercalary day
                const isCurrentIntercalary = ssCurrentDate.intercalary === intercalary.name && (ssCurrentDate.intercalaryDay === intercalaryDay || ssCurrentDate.day === intercalaryDay);
                const isViewIntercalary = viewDate.intercalary === intercalary.name && (viewDate.intercalaryDay === intercalaryDay || viewDate.day === intercalaryDay);
                
                intercalaryRow.push({
                    day: intercalaryDay, // Show 1-5 for intercalary days
                    date: intercalaryDate,
                    isToday: isCurrentIntercalary,
                    isSelected: isViewIntercalary,
                    isClickable: game.user?.isGM || false,
                    isCurrentMonth: true, // Intercalary days are part of the current month view
                    isIntercalary: true,
                    intercalaryName: intercalary.name,
                    intercalaryDescription: intercalary.description,
                    intercalaryDay: intercalaryDay,
                    fullDate: `${viewDate.year}-${viewDate.month.toString().padStart(2, '0')}-${intercalary.name}-${intercalaryDay}`,
                    hasNotes: false, // TODO: Add intercalary note support in future
                    noteCount: 0,
                    categoryClass: '',
                    primaryCategory: 'general',
                    noteTooltip: '',
                    canCreateNote: this.canCreateNote(),
                });
            }
            
            weeks.push(intercalaryRow);
        }
        
        return {
            weeks: weeks,
            totalDays: monthLength,
            monthName: monthInfo.name,
            monthDescription: monthInfo.description,
            intercalaryDays: intercalaryAfterThisMonth,
        };
    }
    
    /**
     * Format date as storage key
     */
    formatDateKey(date) {
        return `${date.year}-${date.month.toString().padStart(2, '0')}-${date.day.toString().padStart(2, '0')}`;
    }
    
    /**
     * Check if current user can create notes
     */
    canCreateNote() {
        const notesManager = game.seasonsStars?.notes;
        if (!notesManager)
            return false;
        // Use notes manager's canCreateNote method
        return notesManager.canCreateNote();
    }
    
    /**
     * Check if two dates are the same (ignoring time)
     */
    isSameDate(date1, date2) {
        // Basic date comparison
        const sameBasicDate = date1.year === date2.year && date1.month === date2.month && date1.day === date2.day;
        // Both must have the same intercalary status
        const bothIntercalary = !!date1.intercalary && !!date2.intercalary;
        const neitherIntercalary = !date1.intercalary && !date2.intercalary;
        const sameIntercalaryStatus = bothIntercalary || neitherIntercalary;
        // If both are intercalary, they must have the same intercalary name
        const sameIntercalaryName = bothIntercalary ? date1.intercalary === date2.intercalary : true;
        return sameBasicDate && sameIntercalaryStatus && sameIntercalaryName;
    }
    
    /**
     * Add ordinal suffix to a number (1st, 2nd, 3rd, etc.)
     */
    addOrdinalSuffix(num) {
        const lastDigit = num % 10;
        const lastTwoDigits = num % 100;
        // Handle special cases (11th, 12th, 13th)
        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
            return `${num}th`;
        }
        // Handle regular cases
        switch (lastDigit) {
            case 1:
                return `${num}st`;
            case 2:
                return `${num}nd`;
            case 3:
                return `${num}rd`;
            default:
                return `${num}th`;
        }
    }
    
    /**
     * Format a year with prefix and suffix from calendar configuration
     */
    formatYear(year) {
        const manager = game.seasonsStars?.manager;
        const calendar = manager?.getActiveCalendar();
        if (!calendar)
            return year.toString();
        const prefix = calendar.year?.prefix || '';
        const suffix = calendar.year?.suffix || '';
        return `${prefix}${year}${suffix}`;
    }
    
    /**
     * Check if two intercalary dates are the same
     */
    isSameIntercalaryDate(date1, date2) {
        return (date1.year === date2.year &&
            date1.month === date2.month &&
            date1.intercalary === date2.intercalary &&
            !!date1.intercalary &&
            !!date2.intercalary);
    }
    
    /**
     * Get intercalary days for a specific month (Dark Sun specific)
     */
    getIntercalaryDaysForMonth(year, month) {
        // Dark Sun intercalary periods:
        // Cooling Sun: After month 4 (Gather)
        // Soaring Sun: After month 8 (Haze)
        // Highest Sun: After month 12 (Smolder)
        
        const intercalaryDays = [];
        
        if (month === 4) {
            intercalaryDays.push({
                name: "Cooling Sun",
                after: "Gather",
                days: 5,
                description: "A five-day period when the sun's killing heat allegedly lessens. Even this 'cooling' would be deadly on any other world, but on Athas it represents a brief chance for survival and preparation."
            });
        } else if (month === 8) {
            intercalaryDays.push({
                name: "Soaring Sun",
                after: "Haze",
                days: 5,
                description: "Five days when the sun reaches one of its peaks of deadly intensity. A time of seeking shelter and enduring the worst that Athas can unleash upon its unfortunate inhabitants."
            });
        } else if (month === 12) {
            intercalaryDays.push({
                name: "Highest Sun",
                after: "Smolder",
                days: 5,
                description: "The most dreaded five days of the Athasian year when the sun reaches its absolute peak of killing power. Even the strongest creatures seek shelter from this ultimate test of survival."
            });
        }
        
        return intercalaryDays;
    }
    
    /**
     * Format year in Dark Sun style with line break
     * Returns: "26th Year of King's Age 190,\nYear of Priest's Defiance"
     */
    formatDarkSunYear(year) {
        // Use our DSC API to get Dark Sun year information
        if (window.DSC) {
            const kingsAge = window.DSC.getKingsAge(year);
            const kingsAgeYear = window.DSC.getKingsAgeYear(year);
            const yearName = window.DSC.getYearName(year);
            
            if (kingsAge && kingsAgeYear && yearName) {
                const ordinalSuffix = this.addOrdinalSuffix(kingsAgeYear);
                return `${ordinalSuffix} Year of King's Age ${kingsAge},\nYear of ${yearName}`;
            }
        }
        
        // Fallback to simple year display
        return `Year ${year}`;
    }
    
    /**
     * Calculate day of year for Dark Sun calendar
     * Considers intercalary periods after months 4, 8, and 12
     */
    calculateDayOfYear(month, day, year) {
        // Intercalary periods occur after months 4, 8, and 12
        const intercalaryMonths = [4, 8, 12];
        
        let dayOfYear = 0;
        
        // Add days from previous months (30 days each)
        for (let m = 1; m < month; m++) {
            dayOfYear += 30;
            
            // Add intercalary days if this month is followed by an intercalary period
            if (intercalaryMonths.includes(m)) {
                dayOfYear += 5;
            }
        }
        
        // Add days in current month
        dayOfYear += day;
        
        return dayOfYear;
    }
    
    /**
     * Navigate to previous month
     */
    async _onPreviousMonth(event, _target) {
        event.preventDefault();
        const engine = game.seasonsStars?.manager?.getActiveEngine();
        if (!engine)
            return;
        this.viewDate = engine.addMonths(this.viewDate, -1);
        this.render();
    }
    
    /**
     * Navigate to next month
     */
    async _onNextMonth(event, _target) {
        event.preventDefault();
        const engine = game.seasonsStars?.manager?.getActiveEngine();
        if (!engine)
            return;
        this.viewDate = engine.addMonths(this.viewDate, 1);
        this.render();
    }
    
    /**
     * Navigate to previous year
     */
    async _onPreviousYear(event, _target) {
        event.preventDefault();
        const engine = game.seasonsStars?.manager?.getActiveEngine();
        if (!engine)
            return;
        this.viewDate = engine.addYears(this.viewDate, -1);
        this.render();
    }
    
    /**
     * Navigate to next year
     */
    async _onNextYear(event, _target) {
        event.preventDefault();
        const engine = game.seasonsStars?.manager?.getActiveEngine();
        if (!engine)
            return;
        this.viewDate = engine.addYears(this.viewDate, 1);
        this.render();
    }
    
    /**
     * Select a specific date (GM only - sets world time) or view date details based on setting
     */
    async _onSelectDate(event, target) {
        event.preventDefault();
        const clickBehavior = game.settings.get('seasons-and-stars', 'calendarClickBehavior');
        const isGM = game.user?.isGM;
        const isCtrlClick = event.ctrlKey || event.metaKey;
        // Ctrl+Click always sets date (if GM)
        if (isCtrlClick && isGM) {
            return this.setCurrentDate(target);
        }
        // Regular click behavior based on setting
        if (clickBehavior === 'viewDetails') {
            return this.showDateInfo(target);
        }
        // Default behavior: set date (GM only)
        if (!isGM) {
            ui.notifications?.warn('Only GMs can change the current date');
            return;
        }
        return this.setCurrentDate(target);
    }
    
    /**
     * DSC: Track the current date as { year, dayOfYear }
     */
    _currentDSCDate = null;

    /**
     * Set the current date (handles both regular and intercalary days)
     */
    async setCurrentDate(target) {
        const manager = game.seasonsStars?.manager;
        const engine = manager?.getActiveEngine();
        if (!manager || !engine) return;
        const CalendarDate = window.DSCalendarDate;
        if (!CalendarDate) {
            console.error('🌞 DSC: DSCalendarDate class not available');
            ui.notifications?.error('DSCalendarDate class not loaded');
            return;
        }
        const currentDate = manager.getCurrentDate();
        if (!currentDate) {
            console.error('🌞 DSC: Cannot get current date from SS manager');
            ui.notifications?.error('Calendar system not ready');
            return;
        }
        try {
            // Check if this is an intercalary day
            const calendarDay = target.closest('.calendar-day');
            const isIntercalary = calendarDay?.classList.contains('intercalary');
            let targetDate;
            if (isIntercalary) {
                // Handle intercalary day selection
                const intercalaryName = target.dataset.day;
                const intercalaryDay = parseInt(target.dataset.intercalaryDay, 10) || 1;
                if (!intercalaryName) return;
                const calendar = engine.getCalendar();
                const intercalaryDef = calendar.intercalary?.find(i => i.name === intercalaryName);
                if (!intercalaryDef) return;
                // Calculate the correct dayOfYear for this intercalary period
                let dayOfYear;
                if (intercalaryName === "Cooling Sun") {
                    dayOfYear = 121 + (intercalaryDay - 1);
                } else if (intercalaryName === "Soaring Sun") {
                    dayOfYear = 246 + (intercalaryDay - 1);
                } else if (intercalaryName === "Highest Sun") {
                    dayOfYear = 371 + (intercalaryDay - 1);
                } else {
                    console.error('🌞 DSC: Unknown intercalary period:', intercalaryName);
                    return;
                }
                // Update DSC's internal date state
                this._currentDSCDate = { year: this.viewDate.year, dayOfYear };
                // Optionally persist in world settings
                game.settings.set('dark-sun-calendar', 'currentDSCDate', this._currentDSCDate);
                // Update the UI
                this.render();
                ui.notifications?.info(`Date set to ${intercalaryName} Day ${intercalaryDay}, Year ${this.viewDate.year}`);
                Hooks.callAll('dark-sun-calendar:dateChanged', this._currentDSCDate);
                return;
            } else {
                // Handle regular day selection
                const day = parseInt(target.dataset.day || '0');
                if (day < 1) return;
                const dayOfYear = this.calculateDayOfYear(this.viewDate.month, day, this.viewDate.year);
                this._currentDSCDate = { year: this.viewDate.year, dayOfYear };
                // Optionally persist in world settings
                game.settings.set('dark-sun-calendar', 'currentDSCDate', this._currentDSCDate);
                // Call SS as usual
                const targetDateData = {
                    year: this.viewDate.year,
                    month: this.viewDate.month,
                    day: day,
                    weekday: engine.calculateWeekday(this.viewDate.year, this.viewDate.month, day),
                    time: currentDate?.time || { hour: 0, minute: 0, second: 0 },
                    dayOfYear: dayOfYear,
                };
                const calendar = engine.getCalendar();
                targetDate = new CalendarDate(targetDateData, calendar);
                const monthName = calendar.months[targetDate.month - 1]?.name || 'Unknown';
                const dayWithSuffix = this.addOrdinalSuffix(targetDate.day);
                const yearDisplay = this.formatYear(targetDate.year);
                ui.notifications?.info(`Date set to ${dayWithSuffix} of ${monthName}, ${yearDisplay}`);
                await manager.setCurrentDate(targetDate);
                this.render();
                Hooks.callAll('dark-sun-calendar:dateChanged', this._currentDSCDate);
            }
        } catch (error) {
            console.error('Failed to set date', error);
            ui.notifications?.error('Failed to set date');
        }
    }
    
    /**
     * Advance days (handles both regular and intercalary days)
     */
    advanceDays(days = 1) {
        if (!this._currentDSCDate) return;
        let { year, dayOfYear } = this._currentDSCDate;
        dayOfYear += days;
        while (dayOfYear > 375) {
            dayOfYear -= 375;
            year += 1;
        }
        while (dayOfYear < 1) {
            dayOfYear += 375;
            year -= 1;
        }
        this._currentDSCDate = { year, dayOfYear };
        // Optionally persist in world settings
        game.settings.set('dark-sun-calendar', 'currentDSCDate', this._currentDSCDate);
        this.render();
        Hooks.callAll('dark-sun-calendar:dateChanged', this._currentDSCDate);
    }

    /**
     * Show information about a specific date without setting it
     */
    showDateInfo(target) {
        const manager = game.seasonsStars?.manager;
        const engine = manager?.getActiveEngine();
        if (!manager || !engine)
            return;
        try {
            // Check if this is an intercalary day
            const calendarDay = target.closest('.calendar-day');
            const isIntercalary = calendarDay?.classList.contains('intercalary');
            const calendar = engine.getCalendar();
            let dateInfo = '';
            if (isIntercalary) {
                // Handle intercalary day information
                const intercalaryName = target.dataset.day;
                if (!intercalaryName)
                    return;
                const intercalaryDef = calendar.intercalary?.find(i => i.name === intercalaryName);
                const afterMonthName = intercalaryDef?.after || 'Unknown';
                const yearDisplay = this.formatYear(this.viewDate.year);
                dateInfo = `${intercalaryName} (intercalary day after ${afterMonthName}, ${yearDisplay})`;
                if (intercalaryDef?.description) {
                    dateInfo += `\n${intercalaryDef.description}`;
                }
            }
            else {
                // Handle regular day information
                const day = parseInt(target.dataset.day || '0');
                if (day < 1)
                    return;
                const monthName = calendar.months[this.viewDate.month - 1]?.name || 'Unknown';
                const monthDesc = calendar.months[this.viewDate.month - 1]?.description;
                const dayWithSuffix = this.addOrdinalSuffix(day);
                const yearDisplay = this.formatYear(this.viewDate.year);
                dateInfo = `${dayWithSuffix} of ${monthName}, ${yearDisplay}`;
                if (monthDesc) {
                    dateInfo += `\n${monthDesc}`;
                }
            }
            // Show as notification
            ui.notifications?.info(dateInfo);
        }
        catch (error) {
            console.error('Failed to show date info', error);
            ui.notifications?.warn('Failed to load date information');
        }
    }
    
    /**
     * Go to current date
     */
    async _onGoToToday(event, _target) {
        event.preventDefault();
        const manager = game.seasonsStars?.manager;
        if (!manager)
            return;
        const currentDate = manager.getCurrentDate();
        if (currentDate) {
            this.viewDate = currentDate;
            this.render();
        }
    }
    
    /**
     * Set year via input dialog
     */
    async _onSetYear(event, _target) {
        event.preventDefault();
        const engine = game.seasonsStars?.manager?.getActiveEngine();
        if (!engine)
            return;
        // Create a simple input dialog
        const currentYear = this.viewDate.year;
        const newYear = await new Promise(resolve => {
            new Dialog({
                title: 'Set Year',
                content: `
          <form>
            <div class="form-group">
              <label>Enter Year:</label>
              <input type="number" name="year" value="${currentYear}" min="1" max="99999" step="1" autofocus />
            </div>
          </form>
        `,
                buttons: {
                    ok: {
                        icon: '<i class="fas fa-check"></i>',
                        label: 'Set Year',
                        callback: (html) => {
                            const yearInput = html.find('input[name="year"]').val();
                            const year = parseInt(yearInput);
                            if (!isNaN(year) && year > 0) {
                                resolve(year);
                            }
                            else {
                                ui.notifications?.error('Please enter a valid year');
                                resolve(null);
                            }
                        },
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: 'Cancel',
                        callback: () => resolve(null),
                    },
                },
                default: 'ok',
            }).render(true);
        });
        if (newYear !== null) {
            const viewDateData = this.viewDate.toObject
                ? this.viewDate.toObject()
                : this.viewDate;
            this.viewDate = { ...viewDateData, year: newYear };
            this.render();
        }
    }
    
    /**
     * Create a new note for the selected date
     */
    async _onCreateNote(event, target) {
        event.preventDefault();
        event.stopPropagation();
        const notesManager = game.seasonsStars?.notes;
        if (!notesManager) {
            ui.notifications?.error('Notes system not available');
            return;
        }
        // Check permissions
        if (!this.canCreateNote()) {
            ui.notifications?.error("You don't have permission to create notes");
            return;
        }
        // Get the date from the clicked element
        const dayElement = target.closest('.calendar-day');
        if (!dayElement)
            return;
        const day = parseInt(dayElement.getAttribute('data-day') || '0');
        if (!day)
            return;
        const targetDateData = {
            year: this.viewDate.year,
            month: this.viewDate.month,
            day: day,
            weekday: 0, // Will be calculated by the engine
            time: { hour: 0, minute: 0, second: 0 },
        };
        const manager = game.seasonsStars?.manager;
        const calendar = manager?.getActiveCalendar();
        if (!calendar)
            return;
            
        // Use our own DSCalendarDate class
        const CalendarDate = window.DSCalendarDate;
        if (!CalendarDate) {
            console.error('🌞 DSC: DSCalendarDate class not available');
            ui.notifications?.error('DSCalendarDate class not loaded');
            return;
        }
        
        const targetDate = new CalendarDate(targetDateData, calendar);
        // Show note creation dialog - simplified for DSC
        ui.notifications?.info('Note creation feature coming soon!');
    }
    
    /**
     * View notes for the selected date
     */
    async _onViewNotes(event, target) {
        event.preventDefault();
        event.stopPropagation();
        ui.notifications?.info('View notes feature coming soon!');
    }
    
    /**
     * Attach event listeners
     */
    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        // Register this as the active instance
        DarkSunCalendarGridWidget.activeInstance = this;
    }
    
    /**
     * Handle closing the widget
     */
    async close(options = {}) {
        // Clear active instance if this is it
        if (DarkSunCalendarGridWidget.activeInstance === this) {
            DarkSunCalendarGridWidget.activeInstance = null;
        }
        return super.close(options);
    }
    
    /**
     * Handle Foundry hooks for real-time updates
     */
    static registerHooks() {
        // Update widget when time changes
        Hooks.on('seasons-stars:dateChanged', () => {
            if (DarkSunCalendarGridWidget.activeInstance?.rendered) {
                DarkSunCalendarGridWidget.activeInstance.render();
            }
        });
        // Update widget when calendar changes
        Hooks.on('seasons-stars:calendarChanged', () => {
            if (DarkSunCalendarGridWidget.activeInstance?.rendered) {
                // Reset to current date when calendar changes
                const manager = game.seasonsStars?.manager;
                if (manager) {
                    const currentDate = manager.getCurrentDate();
                    if (currentDate) {
                        DarkSunCalendarGridWidget.activeInstance.viewDate = currentDate;
                    }
                }
                DarkSunCalendarGridWidget.activeInstance.render();
            }
        });
    }
    
    /**
     * Show the widget
     */
    static show(initialDate) {
        if (DarkSunCalendarGridWidget.activeInstance) {
            if (!DarkSunCalendarGridWidget.activeInstance.rendered) {
                DarkSunCalendarGridWidget.activeInstance.render(true);
            }
        }
        else {
            new DarkSunCalendarGridWidget(initialDate).render(true);
        }
    }
    
    /**
     * Toggle widget visibility
     */
    static toggle(initialDate) {
        if (DarkSunCalendarGridWidget.activeInstance) {
            if (DarkSunCalendarGridWidget.activeInstance.rendered) {
                DarkSunCalendarGridWidget.activeInstance.close();
            }
            else {
                DarkSunCalendarGridWidget.activeInstance.render(true);
            }
        }
        else {
            new DarkSunCalendarGridWidget(initialDate).render(true);
        }
    }
    
    /**
     * Hide the widget
     */
    static hide() {
        if (DarkSunCalendarGridWidget.activeInstance?.rendered) {
            DarkSunCalendarGridWidget.activeInstance.close();
        }
    }
    
    /**
     * Get the current widget instance
     */
    static getInstance() {
        return DarkSunCalendarGridWidget.activeInstance;
    }
    
    /**
     * Add a sidebar button to the grid widget
     * Provides generic API for integration with other modules
     */
    addSidebarButton(name, icon, tooltip, callback) {
        // Check if button already exists
        const existingButton = this.sidebarButtons.find(btn => btn.name === name);
        if (existingButton) {
            console.debug(`Button "${name}" already exists in grid widget`);
            return;
        }
        // Add to buttons array
        this.sidebarButtons.push({ name, icon, tooltip, callback });
        console.debug(`Added sidebar button "${name}" to grid widget`);
        // If widget is rendered, add button to DOM immediately
        if (this.rendered && this.element) {
            this.renderSidebarButton(name, icon, tooltip, callback);
        }
    }
    
    /**
     * Render a sidebar button in the grid widget header
     */
    renderSidebarButton(name, icon, tooltip, callback) {
        if (!this.element)
            return;
        const buttonId = `grid-sidebar-btn-${name.toLowerCase().replace(/\s+/g, '-')}`;
        // Don't add if already exists in DOM
        if (this.element.querySelector(`#${buttonId}`)) {
            return;
        }
        // Find window controls area in header
        let windowControls = this.element.querySelector('.window-header .window-controls');
        if (!windowControls) {
            // Try to find window header and add controls area
            const windowHeader = this.element.querySelector('.window-header');
            if (windowHeader) {
                windowControls = document.createElement('div');
                windowControls.className = 'window-controls';
                windowControls.style.cssText = 'display: flex; align-items: center; margin-left: auto;';
                windowHeader.appendChild(windowControls);
            }
            else {
                console.warn('No window header found for grid widget sidebar button');
                return;
            }
        }
        // Create button element
        const button = document.createElement('button');
        button.id = buttonId;
        button.className = 'grid-sidebar-button';
        button.title = tooltip;
        button.innerHTML = `<i class="fas ${icon}"></i>`;
        button.style.cssText = `
      background: var(--color-bg-btn, #f0f0f0);
      border: 1px solid var(--color-border-dark, #999);
      border-radius: 3px;
      padding: 4px 6px;
      margin-left: 4px;
      cursor: pointer;
      font-size: 12px;
      color: var(--color-text-primary, #000);
      transition: background-color 0.15s ease;
    `;
        // Add click handler
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            try {
                callback();
            }
            catch (error) {
                console.error(`Error in grid widget sidebar button "${name}"`, error);
            }
        });
        // Add hover effects
        button.addEventListener('mouseenter', () => {
            button.style.background = 'var(--color-bg-btn-hover, #e0e0e0)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.background = 'var(--color-bg-btn, #f0f0f0)';
        });
        windowControls.appendChild(button);
        console.debug(`Rendered sidebar button "${name}" in grid widget header`);
    }
    
    /**
     * Render all existing sidebar buttons (called after widget render)
     */
    renderExistingSidebarButtons() {
        this.sidebarButtons.forEach(button => {
            this.renderSidebarButton(button.name, button.icon, button.tooltip, button.callback);
        });
    }
    
    /**
     * Switch to main widget - simplified for DSC
     */
    async _onSwitchToMain(event, _target) {
        event.preventDefault();
        ui.notifications?.info('Switch to main widget feature coming soon!');
    }
    
    /**
     * Switch to mini widget - simplified for DSC
     */
    async _onSwitchToMini(event, _target) {
        event.preventDefault();
        ui.notifications?.info('Switch to mini widget feature coming soon!');
    }
}

DarkSunCalendarGridWidget.activeInstance = null;
DarkSunCalendarGridWidget.DEFAULT_OPTIONS = {
    id: 'dark-sun-calendar-grid-widget',
    classes: ['dark-sun-calendar', 'calendar-grid-widget'],
    tag: 'div',
    window: {
        frame: true,
        positioned: true,
        title: 'Dark Sun Calendar Grid',
        icon: 'fa-solid fa-calendar',
        minimizable: false,
        resizable: false,
    },
    position: {
        width: 400,
        height: 'auto',
    },
    actions: {
        previousMonth: DarkSunCalendarGridWidget.prototype._onPreviousMonth,
        nextMonth: DarkSunCalendarGridWidget.prototype._onNextMonth,
        previousYear: DarkSunCalendarGridWidget.prototype._onPreviousYear,
        nextYear: DarkSunCalendarGridWidget.prototype._onNextYear,
        selectDate: DarkSunCalendarGridWidget.prototype._onSelectDate,
        goToToday: DarkSunCalendarGridWidget.prototype._onGoToToday,
        setYear: DarkSunCalendarGridWidget.prototype._onSetYear,
        createNote: DarkSunCalendarGridWidget.prototype._onCreateNote,
        viewNotes: DarkSunCalendarGridWidget.prototype._onViewNotes,
        switchToMain: DarkSunCalendarGridWidget.prototype._onSwitchToMain,
        switchToMini: DarkSunCalendarGridWidget.prototype._onSwitchToMini,
    },
};
DarkSunCalendarGridWidget.PARTS = {
    main: {
        id: 'main',
        template: 'modules/dark-sun-calendar/templates/calendar-grid-widget.hbs',
    },
};

// Register hooks for proper initialization
DarkSunCalendarGridWidget.registerHooks();

// Register scene control at top level
Hooks.on('getSceneControlButtons', controls => {
    if (!game.user?.isGM) return;
    if (controls.notes?.tools) {
        controls.notes.tools['dark-sun-calendar'] = {
            name: 'dark-sun-calendar',
            title: 'Dark Sun Calendar Grid',
            icon: 'fas fa-sun',
            button: true,
            onChange: () => DarkSunCalendarGridWidget.toggle(),
        };
    }
});

// Wait for SS to be ready before enabling functionality
Hooks.once('ready', () => {
    // Check if SS is available
    if (!game.seasonsStars?.manager) {
        console.warn('🌞 Dark Sun Calendar: Seasons & Stars not detected. Calendar grid functionality will be limited.');
        return;
    }
    
    // Check if CalendarDate is available
    if (!globalThis.CalendarDate && !window.CalendarDate) {
        console.warn('🌞 Dark Sun Calendar: CalendarDate class not available. Waiting for Seasons & Stars to fully initialize...');
        
        // Try again after a short delay
        setTimeout(() => {
            if (DarkSunCalendarGridWidget.activeInstance?.rendered) {
                console.log('🌞 Dark Sun Calendar: Attempting to refresh calendar grid...');
                DarkSunCalendarGridWidget.activeInstance.render();
            }
        }, 1000);
    } else {
        console.log('🌞 Dark Sun Calendar: Successfully integrated with Seasons & Stars');
    }
});

// Export for macro access
window.DarkSunCalendarGridWidget = DarkSunCalendarGridWidget; 