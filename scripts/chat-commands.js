/**
 * Dark Sun Calendar - Chat Commands Integration
 * ============================================
 * Integrates with Chat Commander module to provide chat commands for Dark Sun Calendar functionality
 */

/**
 * Dark Sun Calendar Chat Commands
 * Provides a comprehensive set of commands for interacting with the Dark Sun Calendar
 */
class DarkSunChatCommands {
    constructor() {
        this.commands = new Map();
        this.initialized = false;
    }

    /**
     * Initialize chat commands integration
     */
    async initialize() {
        if (this.initialized) return;
        
        // Wait for Chat Commander to be ready via the hook
        Hooks.on("chatCommandsReady", (commands) => {
            this.registerCommands(commands);
            this.initialized = true;
        });
        
        // If Chat Commander is already ready, try to register immediately
        if (game.chatCommands?.register) {
            this.registerCommands(game.chatCommands);
            this.initialized = true;
        }
    }

    /**
     * Register all Dark Sun Calendar commands with Chat Commander
     */
    registerCommands(commands) {
        // Test command to verify integration
        this.registerCommand(commands, 'dsc-test', {
            description: 'Test Dark Sun Calendar chat command integration',
            usage: '/dsc-test [message]',
            examples: ['/dsc-test', '/dsc-test hello'],
            callback: this.handleTestCommand.bind(this)
        });

        // Basic Date/Time Commands
        this.registerCommand(commands, 'date', {
            description: 'Show current Dark Sun date with King\'s Age formatting',
            usage: '/date',
            examples: ['/date'],
            callback: this.handleDateCommand.bind(this)
        });

        this.registerCommand(commands, 'time', {
            description: 'Show current time of day',
            usage: '/time',
            examples: ['/time'],
            callback: this.handleTimeCommand.bind(this)
        });

        this.registerCommand(commands, 'year', {
            description: 'Show current year information (King\'s Age, year name, Free Year)',
            usage: '/year [year]',
            examples: ['/year', '/year 14579'],
            callback: this.handleYearCommand.bind(this)
        });

        this.registerCommand(commands, 'day', {
            description: 'Show current day with season and moon phases',
            usage: '/day',
            examples: ['/day'],
            callback: this.handleDayCommand.bind(this)
        });

        // Time Advancement Commands (GM only)
        this.registerCommand(commands, 'advance', {
            description: 'Advance time by specified amount (GM only)',
            usage: '/advance <amount> <unit>',
            examples: ['/advance 1 day', '/advance 3 days', '/advance 2 hours', '/advance 1 month'],
            gmOnly: true,
            callback: this.handleAdvanceCommand.bind(this)
        });

        this.registerCommand(commands, 'set-date', {
            description: 'Set specific date using King\'s Age format (GM only)',
            usage: '/set-date <kings-age> <year> <month> <day>',
            examples: ['/set-date 190 26 4 15'],
            gmOnly: true,
            callback: this.handleSetDateCommand.bind(this)
        });

        this.registerCommand(commands, 'goto', {
            description: 'Jump to specific day of year (1-375) (GM only)',
            usage: '/goto <day-of-year>',
            examples: ['/goto 121', '/goto 246'],
            gmOnly: true,
            callback: this.handleGotoCommand.bind(this)
        });

        // Dark Sun Specific Commands
        this.registerCommand(commands, 'moons', {
            description: 'Show current moon phases for Ral and Guthay',
            usage: '/moons [date]',
            examples: ['/moons', '/moons 14579-4-15'],
            callback: this.handleMoonsCommand.bind(this)
        });

        this.registerCommand(commands, 'eclipse', {
            description: 'Check for current or upcoming eclipses',
            usage: '/eclipse [next|previous]',
            examples: ['/eclipse', '/eclipse next', '/eclipse previous'],
            callback: this.handleEclipseCommand.bind(this)
        });

        this.registerCommand(commands, 'season', {
            description: 'Show current season information',
            usage: '/season',
            examples: ['/season'],
            callback: this.handleSeasonCommand.bind(this)
        });

        this.registerCommand(commands, 'kings-age', {
            description: 'Convert year to King\'s Age format',
            usage: '/kings-age <year>',
            examples: ['/kings-age 14579'],
            callback: this.handleKingsAgeCommand.bind(this)
        });

        this.registerCommand(commands, 'free-year', {
            description: 'Convert internal year to Free Year',
            usage: '/free-year <internal-year>',
            examples: ['/free-year 14579'],
            callback: this.handleFreeYearCommand.bind(this)
        });

        // Calendar Widget Commands
        this.registerCommand(commands, 'calendar', {
            description: 'Show/hide calendar grid widget',
            usage: '/calendar [show|hide|toggle]',
            examples: ['/calendar', '/calendar show', '/calendar toggle'],
            callback: this.handleCalendarCommand.bind(this)
        });

        // Historical/Lore Commands
        this.registerCommand(commands, 'events', {
            description: 'Show historical events for a specific year',
            usage: '/events <year>',
            examples: ['/events 1', '/events 14579'],
            callback: this.handleEventsCommand.bind(this)
        });

        this.registerCommand(commands, 'timeline', {
            description: 'Show major Dark Sun timeline events',
            usage: '/timeline [recent|all]',
            examples: ['/timeline', '/timeline recent'],
            callback: this.handleTimelineCommand.bind(this)
        });
    }

    /**
     * Register a single command with Chat Commander
     */
    registerCommand(commands, name, config) {
        const commandConfig = {
            name: `/${name}`,
            module: 'dark-sun-calendar',
            description: config.description,
            callback: (chat, parameters, messageData) => {
                try {
                    // Convert parameters string to array for easier handling
                    const args = parameters.trim().split(/\s+/).filter(arg => arg.length > 0);
                    
                    // Check GM permission if required
                    if (config.gmOnly && !game.user?.isGM) {
                        const errorResult = this.createErrorResponse('This command is only available to GMs.');
                        return errorResult;
                    }
                    
                    // Call the original callback with args
                    const result = config.callback(args);
                    
                    // Handle both sync and async responses
                    if (result && typeof result.then === 'function') {
                        return result.then(response => {
                            return response; // Return response as-is since our handlers return proper objects
                        }).catch(error => {
                            return this.createErrorResponse('Command execution failed');
                        });
                    }
                    
                    // Handle sync responses
                    return result; // Return result as-is since our handlers return proper objects
                } catch (error) {
                    const errorResult = this.createErrorResponse('Command execution failed');
                    return errorResult;
                }
            },
            // Add autocomplete support for better UX
            autocompleteCallback: (existingText, chat, messageData) => {
                // Basic autocomplete - now returns <li> elements for suggestions
                if (config.examples && config.examples.length > 0) {
                    return config.examples.map(example => {
                        const param = example.replace(`/${name}`, '').trim();
                        const el = document.createElement("li");
                        el.className = "context-item command";
                        el.tabIndex = 0;
                        el.dataset.command = param;
                        el.innerHTML = `<strong>${param}</strong> <span class="notes">${config.description}</span>`;
                        return el;
                    });
                }
                return [];
            }
        };

        try {
            commands.register(commandConfig);
            this.commands.set(name, commandConfig);
        } catch (error) {
            // console.error(`🌞 Dark Sun Calendar | Failed to register command /${name}:`, error);
        }
    }

    // =================================================================
    // COMMAND HANDLERS
    // =================================================================

    /**
     * Handle /dsc-test command
     */
    handleTestCommand(args) {
        const message = args.length > 0 ? args.join(' ') : 'Test successful!';
        
        let response = `<h3>🧪 Dark Sun Calendar Test</h3>`;
        response += `<p><strong>Message:</strong> ${message}</p>`;
        response += `<p><strong>DSC Ready:</strong> ${window.DSC?.isReady ? window.DSC.isReady() : 'false'}</p>`;
        response += `<p><strong>Args:</strong> ${JSON.stringify(args)}</p>`;
        
        return this.sendMessage(response);
    }

    /**
     * Handle /date command
     */
    handleDateCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        try {
            const currentDate = window.DSC.getCurrentDate();
            if (!currentDate) {
                return this.sendErrorMessage('Could not get current date');
            }

            const formattedDate = window.DSC.formatDarkSunDate(currentDate);
            const monthName = currentDate.calendar?.months[currentDate.month - 1]?.name || 'Unknown';
            const dayOrdinal = this.addOrdinalSuffix(currentDate.day);

            let message = `<h3>📅 Current Dark Sun Date</h3>`;
            message += `<p><strong>${dayOrdinal} of ${monthName}</strong></p>`;
            message += `<p><em>${formattedDate}</em></p>`;

            if (currentDate.intercalary) {
                message += `<p><strong>Intercalary Day:</strong> ${currentDate.intercalary}</p>`;
            }

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error getting date information');
        }
    }

    /**
     * Handle /time command
     */
    handleTimeCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        try {
            const currentDate = window.DSC.getCurrentDate();
            if (!currentDate || !currentDate.time) {
                return this.sendErrorMessage('Could not get current time');
            }

            const { hour, minute, second } = currentDate.time;
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`;

            let message = `<h3>⏰ Current Time</h3>`;
            message += `<p><strong>${timeString}</strong></p>`;

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error getting time information');
        }
    }

    /**
     * Handle /year command
     */
    handleYearCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        try {
            let targetYear;
            if (args.length > 0) {
                targetYear = parseInt(args[0]);
                if (isNaN(targetYear) || targetYear < 1) {
                    return this.sendErrorMessage('Invalid year. Please provide a valid year number.');
                }
            } else {
                const currentDate = window.DSC.getCurrentDate();
                targetYear = currentDate?.year;
            }

            if (!targetYear) {
                return this.sendErrorMessage('Could not determine year');
            }

            const kingsAge = window.DSC.getKingsAge(targetYear);
            const kingsAgeYear = window.DSC.getKingsAgeYear(targetYear);
            const yearName = window.DSC.getYearName(targetYear);
            const freeYear = window.DSC.getFreeYear(targetYear);

            let message = `<h3>📜 Year Information</h3>`;
            message += `<p><strong>Internal Year:</strong> ${targetYear}</p>`;
            message += `<p><strong>King's Age:</strong> ${kingsAge}</p>`;
            message += `<p><strong>Year within King's Age:</strong> ${kingsAgeYear}</p>`;
            message += `<p><strong>Year Name:</strong> ${yearName}</p>`;
            message += `<p><strong>Free Year:</strong> ${freeYear}</p>`;

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error getting year information');
        }
    }

    /**
     * Handle /day command
     */
    handleDayCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        try {
            const currentDate = window.DSC.getCurrentDate();
            if (!currentDate) {
                return this.sendErrorMessage('Could not get current date');
            }

            const seasonInfo = window.DSC.getSeasonInfo();
            const moonPhases = window.DSC.getCurrentMoonPhases();
            const eclipseInfo = window.DSC.getEclipseInfo();

            let message = `<h3>🌄 Daily Information</h3>`;
            
            // Date info
            const monthName = currentDate.calendar?.months[currentDate.month - 1]?.name || 'Unknown';
            const dayOrdinal = this.addOrdinalSuffix(currentDate.day);
            message += `<p><strong>Date:</strong> ${dayOrdinal} of ${monthName}</p>`;

            // Season info
            if (seasonInfo) {
                message += `<p><strong>Season:</strong> ${seasonInfo.name}</p>`;
            }

            // Moon phases
            if (moonPhases && moonPhases.length > 0) {
                message += `<p><strong>Moon Phases:</strong></p>`;
                moonPhases.forEach(moon => {
                    message += `<p>• ${moon.moonName}: ${moon.phaseName} (${moon.illumination}%)</p>`;
                });
            }

            // Eclipse info
            if (eclipseInfo && eclipseInfo.type !== 'none') {
                message += `<p><strong>🌑 Eclipse:</strong> ${eclipseInfo.description}</p>`;
            }

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error getting day information');
        }
    }

    /**
     * Handle /advance command (GM only)
     */
    async handleAdvanceCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        if (args.length < 2) {
            return this.sendErrorMessage('Usage: /advance <amount> <unit>');
        }

        try {
            const amount = parseInt(args[0]);
            const unit = args[1].toLowerCase();

            if (isNaN(amount) || amount < 1) {
                return this.sendErrorMessage('Amount must be a positive number');
            }

            let success = false;
            let unitName = '';

            switch (unit) {
                case 'minute':
                case 'minutes':
                    success = await window.DSC.advanceMinutes(amount);
                    unitName = amount === 1 ? 'minute' : 'minutes';
                    break;
                case 'hour':
                case 'hours':
                    success = await window.DSC.advanceHours(amount);
                    unitName = amount === 1 ? 'hour' : 'hours';
                    break;
                case 'day':
                case 'days':
                    success = await window.DSC.advanceDays(amount);
                    unitName = amount === 1 ? 'day' : 'days';
                    break;
                case 'week':
                case 'weeks':
                    success = await window.DSC.advanceWeeks(amount);
                    unitName = amount === 1 ? 'week' : 'weeks';
                    break;
                case 'month':
                case 'months':
                    success = await window.DSC.advanceMonths(amount);
                    unitName = amount === 1 ? 'month' : 'months';
                    break;
                case 'year':
                case 'years':
                    success = await window.DSC.advanceYears(amount);
                    unitName = amount === 1 ? 'year' : 'years';
                    break;
                default:
                    return this.sendErrorMessage('Invalid unit. Use: minutes, hours, days, weeks, months, or years');
            }

            if (success) {
                const currentDate = window.DSC.getCurrentDate();
                const formattedDate = window.DSC.formatDarkSunDate(currentDate);
                
                let message = `<h3>⏭️ Time Advanced</h3>`;
                message += `<p><strong>Advanced:</strong> ${amount} ${unitName}</p>`;
                message += `<p><strong>New Date:</strong> ${formattedDate}</p>`;
                
                return this.sendMessage(message);
            } else {
                return this.sendErrorMessage('Failed to advance time');
            }
        } catch (error) {
            return this.sendErrorMessage('Error advancing time');
        }
    }

    /**
     * Handle /set-date command (GM only)
     */
    async handleSetDateCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        if (args.length < 4) {
            return this.sendErrorMessage('Usage: /set-date <kings-age> <year> <month> <day>');
        }

        try {
            const kingsAge = parseInt(args[0]);
            const kingsAgeYear = parseInt(args[1]);
            const month = parseInt(args[2]);
            const day = parseInt(args[3]);

            if (isNaN(kingsAge) || kingsAge < 1) {
                return this.sendErrorMessage('King\'s Age must be a positive number');
            }
            if (isNaN(kingsAgeYear) || kingsAgeYear < 1 || kingsAgeYear > 77) {
                return this.sendErrorMessage('King\'s Age Year must be between 1 and 77');
            }
            if (isNaN(month) || month < 1 || month > 12) {
                return this.sendErrorMessage('Month must be between 1 and 12');
            }
            if (isNaN(day) || day < 1 || day > 30) {
                return this.sendErrorMessage('Day must be between 1 and 30');
            }

            // Await in case setKingsAgeDate is async
            const success = await window.DSC.setKingsAgeDate(kingsAge, kingsAgeYear, month, day);
            if (success) {
                // Optionally, add a short delay if needed for the date to update
                // await new Promise(resolve => setTimeout(resolve, 10));
                const currentDate = window.DSC.getCurrentDate();
                const formattedDate = window.DSC.formatDarkSunDate(currentDate);
                let message = `<h3>📅 Date Set</h3>`;
                message += `<p><strong>New Date:</strong> ${formattedDate}</p>`;
                return this.sendMessage(message);
            } else {
                return this.sendErrorMessage('Failed to set date');
            }
        } catch (error) {
            return this.sendErrorMessage('Error setting date');
        }
    }

    /**
     * Handle /goto command (GM only)
     */
    async handleGotoCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        if (args.length < 1) {
            return this.sendErrorMessage('Usage: /goto <day-of-year>');
        }

        try {
            const dayOfYear = parseInt(args[0]);

            if (isNaN(dayOfYear) || dayOfYear < 1 || dayOfYear > 375) {
                return this.sendErrorMessage('Day of year must be between 1 and 375');
            }

            const success = window.DSC.setDayOfYear(dayOfYear);
            
            if (success) {
                const currentDate = window.DSC.getCurrentDate();
                const formattedDate = window.DSC.formatDarkSunDate(currentDate);
                
                let message = `<h3>🎯 Jumped to Day</h3>`;
                message += `<p><strong>Day of Year:</strong> ${dayOfYear}</p>`;
                message += `<p><strong>Date:</strong> ${formattedDate}</p>`;
                
                return this.sendMessage(message);
            } else {
                return this.sendErrorMessage('Failed to jump to day');
            }
        } catch (error) {
            return this.sendErrorMessage('Error jumping to day');
        }
    }

    /**
     * Handle /moons command
     */
    handleMoonsCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        try {
            const moonPhases = window.DSC.getCurrentMoonPhases();
            
            if (!moonPhases || moonPhases.length === 0) {
                return this.sendErrorMessage('Could not get moon phase information');
            }

            let message = `<h3>🌙 Moon Phases</h3>`;
            
            moonPhases.forEach(moon => {
                message += `<p><strong>${moon.moonName}:</strong> ${moon.phaseName} (${moon.illumination}%)</p>`;
                if (moon.riseFormatted && moon.setFormatted) {
                    message += `<p>• Rise: ${moon.riseFormatted}, Set: ${moon.setFormatted}</p>`;
                }
            });

            // Check for eclipse
            const eclipseInfo = window.DSC.getEclipseInfo();
            if (eclipseInfo && eclipseInfo.type !== 'none') {
                message += `<p><strong>🌑 Eclipse:</strong> ${eclipseInfo.description}</p>`;
            }

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error getting moon phase information');
        }
    }

    /**
     * Handle /eclipse command
     */
    handleEclipseCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        try {
            const currentEclipse = window.DSC.getEclipseInfo();
            
            let message = `<h3>🌑 Eclipse Information</h3>`;
            
            if (currentEclipse && currentEclipse.type !== 'none') {
                message += `<p><strong>Current Eclipse:</strong> ${currentEclipse.description}</p>`;
                message += `<p><strong>Type:</strong> ${currentEclipse.type}</p>`;
                message += `<p><strong>Magnitude:</strong> ${currentEclipse.magnitude}</p>`;
            } else {
                message += `<p>No eclipse currently occurring.</p>`;
            }

            // Handle next/previous eclipse requests
            if (args.length > 0) {
                const direction = args[0].toLowerCase();
                if (direction === 'next') {
                    const nextEclipse = window.DSC.findNextEclipse();
                    if (nextEclipse) {
                        message += `<p><strong>Next Eclipse:</strong> ${nextEclipse.description}</p>`;
                        if (nextEclipse.absoluteDay !== undefined) {
                            const dateObj = window.DSC.fromAbsoluteDays(nextEclipse.absoluteDay);
                            const formattedDate = window.DSC.formatDarkSunDate(dateObj);
                            message += `<p><strong>Date:</strong> ${formattedDate}</p>`;
                        }
                    } else {
                        message += `<p>No upcoming eclipse found.</p>`;
                    }
                } else if (direction === 'previous') {
                    const previousEclipse = window.DSC.findPreviousEclipse();
                    if (previousEclipse) {
                        message += `<p><strong>Previous Eclipse:</strong> ${previousEclipse.description}</p>`;
                        if (previousEclipse.absoluteDay !== undefined) {
                            const dateObj = window.DSC.fromAbsoluteDays(previousEclipse.absoluteDay);
                            const formattedDate = window.DSC.formatDarkSunDate(dateObj);
                            message += `<p><strong>Date:</strong> ${formattedDate}</p>`;
                        }
                    } else {
                        message += `<p>No previous eclipse found.</p>`;
                    }
                }
            }

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error getting eclipse information');
        }
    }

    /**
     * Handle /season command
     */
    handleSeasonCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        try {
            const seasonInfo = window.DSC.getSeasonInfo();
            
            if (!seasonInfo) {
                return this.sendErrorMessage('Could not get season information');
            }

            let message = `<h3>🌄 Season Information</h3>`;
            message += `<p><strong>Current Season:</strong> ${seasonInfo.name}</p>`;
            
            if (seasonInfo.description) {
                message += `<p><strong>Description:</strong> ${seasonInfo.description}</p>`;
            }
            
            if (seasonInfo.daysIntoSeason !== undefined) {
                message += `<p><strong>Days into season:</strong> ${seasonInfo.daysIntoSeason}</p>`;
            }
            
            if (seasonInfo.daysRemaining !== undefined) {
                message += `<p><strong>Days remaining:</strong> ${seasonInfo.daysRemaining}</p>`;
            }

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error getting season information');
        }
    }

    /**
     * Handle /kings-age command
     */
    handleKingsAgeCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        if (args.length < 1) {
            return this.sendErrorMessage('Usage: /kings-age <year>');
        }

        try {
            const year = parseInt(args[0]);
            
            if (isNaN(year) || year < 1) {
                return this.sendErrorMessage('Year must be a positive number');
            }

            const kingsAge = window.DSC.getKingsAge(year);
            const kingsAgeYear = window.DSC.getKingsAgeYear(year);
            const yearName = window.DSC.getYearName(year);
            const formattedDate = window.DSC.formatDarkSunDateFromFreeYear(window.DSC.getFreeYear(year));

            let message = `<h3>👑 King's Age Conversion</h3>`;
            message += `<p><strong>Internal Year:</strong> ${year}</p>`;
            message += `<p><strong>King's Age:</strong> ${kingsAge}</p>`;
            message += `<p><strong>Year within King's Age:</strong> ${kingsAgeYear}</p>`;
            message += `<p><strong>Year Name:</strong> ${yearName}</p>`;
            message += `<p><strong>Formatted:</strong> ${formattedDate}</p>`;

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error converting to King\'s Age format');
        }
    }

    /**
     * Handle /free-year command
     */
    handleFreeYearCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        if (args.length < 1) {
            return this.sendErrorMessage('Usage: /free-year <internal-year>');
        }

        try {
            const internalYear = parseInt(args[0]);
            
            if (isNaN(internalYear) || internalYear < 1) {
                return this.sendErrorMessage('Internal year must be a positive number');
            }

            const freeYear = window.DSC.getFreeYear(internalYear);
            const kingsAge = window.DSC.getKingsAge(internalYear);
            const kingsAgeYear = window.DSC.getKingsAgeYear(internalYear);

            let message = `<h3>🗓️ Free Year Conversion</h3>`;
            message += `<p><strong>Internal Year:</strong> ${internalYear}</p>`;
            message += `<p><strong>Free Year:</strong> ${freeYear}</p>`;
            message += `<p><strong>King's Age:</strong> ${kingsAge}, Year ${kingsAgeYear}</p>`;

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error converting to Free Year');
        }
    }

    /**
     * Handle /calendar command
     */
    handleCalendarCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        try {
            const action = args.length > 0 ? args[0].toLowerCase() : 'toggle';

            switch (action) {
                case 'show':
                    window.DSC.showWidget();
                    return this.sendMessage('📅 Calendar widget shown');
                case 'hide':
                    window.DSC.hideWidget();
                    return this.sendMessage('📅 Calendar widget hidden');
                case 'toggle':
                default:
                    window.DSC.toggleWidget();
                    return this.sendMessage('📅 Calendar widget toggled');
            }
        } catch (error) {
            return this.sendErrorMessage('Error controlling calendar widget');
        }
    }

    /**
     * Handle /events command
     */
    handleEventsCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        if (args.length < 1) {
            return this.sendErrorMessage('Usage: /events <year>');
        }

        try {
            const year = parseInt(args[0]);
            
            if (isNaN(year)) {
                return this.sendErrorMessage('Year must be a number');
            }

            // This would need to be implemented in the DSC API
            // For now, provide a placeholder response
            let message = `<h3>📚 Historical Events</h3>`;
            message += `<p>Events for year ${year} - <em>Feature coming soon!</em></p>`;

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error getting historical events');
        }
    }

    /**
     * Handle /timeline command
     */
    handleTimelineCommand(args) {
        const readyCheck = this.checkDSCReady();
        if (readyCheck) return readyCheck;

        try {
            const scope = args.length > 0 ? args[0].toLowerCase() : 'recent';

            let message = `<h3>⏳ Dark Sun Timeline</h3>`;
            message += `<p>Timeline view (${scope}) - <em>Feature coming soon!</em></p>`;

            return this.sendMessage(message);
        } catch (error) {
            return this.sendErrorMessage('Error getting timeline information');
        }
    }

    // =================================================================
    // UTILITY METHODS
    // =================================================================

    /**
     * Check if Dark Sun Calendar is ready
     */
    checkDSCReady() {
        if (!window.DSC?.isReady || !window.DSC.isReady()) {
            return this.sendErrorMessage('Dark Sun Calendar is not ready. Please wait for the module to fully load.');
        }
        return null; // No error
    }

    /**
     * Check if user has GM permissions (used by registerCommand callback)
     */
    checkGMPermission() {
        if (!game.user?.isGM) {
            return this.sendErrorMessage('This command is only available to GMs.');
        }
        return null; // No error
    }

    /**
     * Send a message to chat (for Chat Commander compatibility)
     */
    sendMessage(content) {
        return { content: content };
    }

    /**
     * Send an error message to chat (for Chat Commander compatibility)
     */
    sendErrorMessage(message) {
        return { content: `<p style="color: red;"><strong>Error:</strong> ${message}</p>` };
    }

    /**
     * Create an error response for Chat Commander
     */
    createErrorResponse(message) {
        return { content: `<p style="color: red;"><strong>Error:</strong> ${message}</p>` };
    }

    /**
     * Add ordinal suffix to a number
     */
    addOrdinalSuffix(num) {
        const lastDigit = num % 10;
        const lastTwoDigits = num % 100;

        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
            return `${num}th`;
        }

        switch (lastDigit) {
            case 1: return `${num}st`;
            case 2: return `${num}nd`;
            case 3: return `${num}rd`;
            default: return `${num}th`;
        }
    }
}

// Global instance
let darkSunChatCommands;

// Initialize chat commands when Dark Sun Calendar is ready
Hooks.once('dark-sun-calendar:ready', () => {
    darkSunChatCommands = new DarkSunChatCommands();
    darkSunChatCommands.initialize();
});

// Also try to initialize if DSC is already ready
Hooks.once('ready', () => {
    // Small delay to ensure all modules are loaded
    setTimeout(() => {
        if (window.DSC?.isReady && window.DSC.isReady() && !darkSunChatCommands) {
            darkSunChatCommands = new DarkSunChatCommands();
            darkSunChatCommands.initialize();
        }
    }, 1000);
});

// Export for debugging
window.DarkSunChatCommands = DarkSunChatCommands;