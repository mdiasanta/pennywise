// Types for Net Worth page
// TimeRange can be a preset, a custom year (e.g., 'year-2024'), or a month-year (e.g., 'month-2024-01')
export type TimeRange =
  | 'month'
  | 'quarter'
  | 'year'
  | 'all'
  | `year-${number}`
  | `month-${number}-${string}`;
export type GroupBy = 'day' | 'week' | 'month' | 'quarter' | 'year';

// Maximum years of history to show for "All Time" view
export const ALL_TIME_LOOKBACK_YEARS = 20;

// Default number of years to show in year picker dropdown
export const YEAR_PICKER_YEARS_BACK = 20;

// Year filter prefix constant
const YEAR_FILTER_PREFIX = 'year-';

// Month-year filter prefix constant
const MONTH_YEAR_FILTER_PREFIX = 'month-';

// Check if a time range is a specific year filter
export const isYearFilter = (timeRange: string): boolean => {
  return (
    timeRange.startsWith(YEAR_FILTER_PREFIX) &&
    !isNaN(parseInt(timeRange.slice(YEAR_FILTER_PREFIX.length)))
  );
};

// Check if a time range is a specific month-year filter (e.g., 'month-2024-01')
export const isMonthYearFilter = (timeRange: string): boolean => {
  if (!timeRange.startsWith(MONTH_YEAR_FILTER_PREFIX)) {
    return false;
  }
  const parts = timeRange.slice(MONTH_YEAR_FILTER_PREFIX.length).split('-');
  if (parts.length !== 2) {
    return false;
  }
  const year = parseInt(parts[0]);
  const month = parseInt(parts[1]);
  return !isNaN(year) && !isNaN(month) && month >= 1 && month <= 12;
};

// Extract year from a year filter
export const getYearFromFilter = (timeRange: string): number | null => {
  if (isYearFilter(timeRange)) {
    return parseInt(timeRange.slice(YEAR_FILTER_PREFIX.length));
  }
  return null;
};

// Extract year and month from a month-year filter
export const getMonthYearFromFilter = (
  timeRange: string
): { year: number; month: number } | null => {
  if (!isMonthYearFilter(timeRange)) {
    return null;
  }
  const parts = timeRange.slice(MONTH_YEAR_FILTER_PREFIX.length).split('-');
  return {
    year: parseInt(parts[0]),
    month: parseInt(parts[1]),
  };
};

// Get month name from month number (1-12)
export const getMonthName = (month: number): string => {
  const date = new Date(2000, month - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'long' }).format(date);
};

// Get short month name from month number (1-12)
export const getShortMonthName = (month: number): string => {
  const date = new Date(2000, month - 1, 1);
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
};

// Get all months for a given year (or current year if not specified)
export const getMonthsForYear = (year?: number): { value: string; label: string }[] => {
  const targetYear = year ?? new Date().getFullYear();
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  const months: { value: string; label: string }[] = [];

  // If showing current year, only show months up to current month
  const maxMonth = targetYear === currentYear ? currentMonth : 12;

  for (let month = 1; month <= maxMonth; month++) {
    const paddedMonth = month.toString().padStart(2, '0');
    months.push({
      value: `month-${targetYear}-${paddedMonth}`,
      label: getMonthName(month),
    });
  }

  return months;
};

// Generate available years for selection (from current year back to a specified number of years)
export const getAvailableYears = (yearsBack: number = YEAR_PICKER_YEARS_BACK): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let i = 0; i <= yearsBack; i++) {
    years.push(currentYear - i);
  }
  return years;
};

// Generate available years from earliest date to current year
export const getAvailableYearsFromDate = (earliestDate: string | null): number[] => {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];

  if (earliestDate) {
    // Parse year directly from ISO date string to avoid timezone issues
    // e.g., "2023-01-15" -> 2023 (don't use new Date() which can shift dates)
    const earliestYear = parseInt(earliestDate.substring(0, 4), 10);
    for (let year = currentYear; year >= earliestYear; year--) {
      years.push(year);
    }
  } else {
    // Fallback to default behavior if no earliest date
    return getAvailableYears();
  }

  return years;
};

// Get date range for a specific year filter
// Returns null if the time range is not a year filter
export const getYearFilterDateRange = (
  timeRange: string
): { startDate: string; endDate: string } | null => {
  if (!isYearFilter(timeRange)) {
    return null;
  }

  const year = getYearFromFilter(timeRange);
  if (!year) {
    return null;
  }

  const startDate = new Date(year, 0, 1);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(year, 11, 31);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

// Get date range for a specific month-year filter
// Returns null if the time range is not a month-year filter
export const getMonthYearFilterDateRange = (
  timeRange: string
): { startDate: string; endDate: string } | null => {
  const monthYear = getMonthYearFromFilter(timeRange);
  if (!monthYear) {
    return null;
  }

  const { year, month } = monthYear;

  // Month is 0-indexed in JavaScript Date
  const startDate = new Date(year, month - 1, 1);
  startDate.setHours(0, 0, 0, 0);

  // Get last day of the month
  const endDate = new Date(year, month, 0);
  endDate.setHours(23, 59, 59, 999);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

// Palette of visually distinct, accessible colors for assets
export const ASSET_COLOR_PALETTE = [
  '#4ECDC4', // Teal
  '#FF6B6B', // Coral
  '#45B7D1', // Sky Blue
  '#96CEB4', // Sage Green
  '#FFEAA7', // Pale Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Mustard
  '#BB8FCE', // Lavender
  '#85C1E9', // Light Blue
  '#F8B500', // Golden Yellow
  '#16A085', // Dark Teal
  '#E74C3C', // Red
  '#3498DB', // Blue
  '#9B59B6', // Purple
  '#1ABC9C', // Turquoise
  '#F39C12', // Orange
  '#2ECC71', // Green
  '#E91E63', // Pink
  '#00BCD4', // Cyan
];

// Format currency values
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

// Format date for display (using UTC to prevent timezone shift)
export const formatDate = (dateString: string) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(dateString));
};

// Format date for chart axis (using UTC to prevent timezone shift)
export const formatChartDate = (dateString: string, groupBy: GroupBy) => {
  const date = new Date(dateString);
  if (groupBy === 'day') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }
  if (groupBy === 'week') {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date);
  }
  if (groupBy === 'year') {
    return new Intl.DateTimeFormat('en-US', { year: 'numeric', timeZone: 'UTC' }).format(date);
  }
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(date);
};

// Get human-readable time range label
export const getTimeRangeLabel = (timeRange: TimeRange): string => {
  if (isMonthYearFilter(timeRange)) {
    const monthYear = getMonthYearFromFilter(timeRange);
    if (monthYear) {
      return `${getMonthName(monthYear.month)} ${monthYear.year}`;
    }
    return 'Custom Month';
  }
  if (isYearFilter(timeRange)) {
    const year = getYearFromFilter(timeRange);
    return year?.toString() || 'Custom Year';
  }
  switch (timeRange) {
    case 'month':
      return 'Last 30 Days';
    case 'quarter':
      return 'Last 3 Months';
    case 'year':
      return 'Last 12 Months';
    case 'all':
      return 'All Time';
    default:
      return timeRange;
  }
};
