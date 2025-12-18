// Types for Net Worth page
export type TimeRange = 'month' | 'quarter' | 'year' | 'all';
export type GroupBy = 'day' | 'week' | 'month' | 'quarter' | 'year';

// Maximum years of history to show for "All Time" view
export const ALL_TIME_LOOKBACK_YEARS = 5;

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
export const getTimeRangeLabel = (timeRange: TimeRange) => {
  switch (timeRange) {
    case 'month':
      return 'Last 30 Days';
    case 'quarter':
      return 'Last 3 Months';
    case 'year':
      return 'Last 12 Months';
    case 'all':
      return 'All Time';
  }
};
