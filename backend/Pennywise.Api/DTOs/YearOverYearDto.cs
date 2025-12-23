namespace Pennywise.Api.DTOs;

/// <summary>
/// Response DTO for year-over-year comparison data
/// </summary>
public class YearOverYearComparisonDto
{
    /// <summary>
    /// The comparison mode (Month or Year)
    /// </summary>
    public string ComparisonMode { get; set; } = "Month";

    /// <summary>
    /// The current period being compared
    /// </summary>
    public YearOverYearPeriodDto CurrentPeriod { get; set; } = new();

    /// <summary>
    /// The previous period being compared against
    /// </summary>
    public YearOverYearPeriodDto PreviousPeriod { get; set; } = new();

    /// <summary>
    /// The difference in total spending (current - previous)
    /// </summary>
    public decimal TotalDifference { get; set; }

    /// <summary>
    /// The percentage change ((current - previous) / previous * 100)
    /// </summary>
    public decimal PercentageChange { get; set; }

    /// <summary>
    /// Category-level comparison breakdown
    /// </summary>
    public IEnumerable<YearOverYearCategoryComparisonDto> CategoryComparisons { get; set; } = [];

    /// <summary>
    /// Monthly totals for chart visualization (when comparing full years)
    /// </summary>
    public IEnumerable<YearOverYearMonthlyDataDto> MonthlyData { get; set; } = [];
}

/// <summary>
/// Represents a single period in the year-over-year comparison
/// </summary>
public class YearOverYearPeriodDto
{
    /// <summary>
    /// The year of this period
    /// </summary>
    public int Year { get; set; }

    /// <summary>
    /// The month of this period (1-12, or null for full year comparison)
    /// </summary>
    public int? Month { get; set; }

    /// <summary>
    /// Human-readable label for this period (e.g., "December 2024" or "2024")
    /// </summary>
    public string Label { get; set; } = string.Empty;

    /// <summary>
    /// Total spending in this period
    /// </summary>
    public decimal Total { get; set; }

    /// <summary>
    /// Number of transactions in this period
    /// </summary>
    public int TransactionCount { get; set; }

    /// <summary>
    /// Whether data exists for this period
    /// </summary>
    public bool HasData { get; set; }
}

/// <summary>
/// Category-level comparison between two periods
/// </summary>
public class YearOverYearCategoryComparisonDto
{
    /// <summary>
    /// Category ID
    /// </summary>
    public int CategoryId { get; set; }

    /// <summary>
    /// Category name
    /// </summary>
    public string CategoryName { get; set; } = string.Empty;

    /// <summary>
    /// Category color
    /// </summary>
    public string? CategoryColor { get; set; }

    /// <summary>
    /// Spending in the current period
    /// </summary>
    public decimal CurrentAmount { get; set; }

    /// <summary>
    /// Spending in the previous period
    /// </summary>
    public decimal PreviousAmount { get; set; }

    /// <summary>
    /// Difference (current - previous)
    /// </summary>
    public decimal Difference { get; set; }

    /// <summary>
    /// Percentage change
    /// </summary>
    public decimal PercentageChange { get; set; }

    /// <summary>
    /// Whether this category existed in the previous period
    /// </summary>
    public bool IsNewCategory { get; set; }
}

/// <summary>
/// Monthly data point for trend visualization
/// </summary>
public class YearOverYearMonthlyDataDto
{
    /// <summary>
    /// Month number (1-12)
    /// </summary>
    public int Month { get; set; }

    /// <summary>
    /// Month name
    /// </summary>
    public string MonthName { get; set; } = string.Empty;

    /// <summary>
    /// Spending in the current year for this month
    /// </summary>
    public decimal CurrentYearAmount { get; set; }

    /// <summary>
    /// Spending in the previous year for this month
    /// </summary>
    public decimal PreviousYearAmount { get; set; }

    /// <summary>
    /// Difference for this month
    /// </summary>
    public decimal Difference { get; set; }
}

/// <summary>
/// Request parameters for year-over-year comparison
/// </summary>
public class YearOverYearRequestDto
{
    /// <summary>
    /// Comparison mode: "month" or "year"
    /// </summary>
    public string Mode { get; set; } = "month";

    /// <summary>
    /// The year for the current period
    /// </summary>
    public int CurrentYear { get; set; }

    /// <summary>
    /// The month for the current period (1-12, required when mode is "month")
    /// </summary>
    public int? CurrentMonth { get; set; }

    /// <summary>
    /// The year for the previous period (defaults to currentYear - 1)
    /// </summary>
    public int? PreviousYear { get; set; }

    /// <summary>
    /// The month for the previous period (defaults to currentMonth when mode is "month")
    /// </summary>
    public int? PreviousMonth { get; set; }

    /// <summary>
    /// Tag IDs to include in the comparison (only expenses with these tags)
    /// </summary>
    public List<int>? IncludedTagIds { get; set; }

    /// <summary>
    /// Tag IDs to exclude from the comparison (exclude expenses with these tags)
    /// </summary>
    public List<int>? ExcludedTagIds { get; set; }
}
