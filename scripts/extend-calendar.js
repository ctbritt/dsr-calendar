Hooks.on("calendarDataReady", (data) => {
  console.log("calendarDataReady fired", data);
  // Calculate week length from JSON
  const weekLength = data.days?.values?.length || 7;
  let offset = 0;
  data.months?.values?.forEach((m) => {
    m.dayOffset = offset;
    m.startingWeekday = offset % weekLength;
    if (typeof m.intercalary === "undefined") m.intercalary = false;
    offset += m.days;
  });
  // Add year.name if missing
  if (data.year && typeof data.year.name === "undefined") {
    data.year.name = "";
  }
  // Add isRestDay and isHoliday to each day
  data.days?.values?.forEach((d) => {
    if (typeof d.isRestDay === "undefined") d.isRestDay = false;
    if (typeof d.isHoliday === "undefined") d.isHoliday = false;
  });
  // Epochs remain as a top-level array; no changes needed
  console.log("CalendarData after extension", data);

  // Retrieve moons from the JSON data instead of hardcoding
  if (data.moons && Array.isArray(data.moons)) {
    // The moons data is already available from the JSON file
    console.log("Moons data retrieved from JSON:", data.moons);
  } else {
    console.warn("No moons data found in calendar JSON");
  }
});