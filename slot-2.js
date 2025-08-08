// Prompt user to input the date and time, then set and display the current in-world date and time using the custom calendar
const components = await promptAndSetCalendarDate();
if (!components) {
  ui.notifications.warn("Calendar date was not set.");
  return;
}

console.warn("Slot 2 components", components);
