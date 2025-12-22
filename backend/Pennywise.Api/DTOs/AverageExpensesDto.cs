namespace Pennywise.Api.DTOs;

/// <summary>
/// Request parameters for average expenses calculation
/// </summary>
public class AverageExpensesRequestDto
{
    /// <summary>
    /// View mode: "category" or "month"
    /// </summary>
    public string ViewMode { get; set; } = "month";

    /// <summary>
    /// List of years to include in the average calculation
    /// </summary>
    public List<int> Years { get; set; } = [];
}

/// <summary>
/// Response DTO for average expenses data
/// </summary>
public class AverageExpensesResponseDto
{
    /// <summary>
    /// The view mode (Category or Month)
    /// </summary>
    public string ViewMode { get; set; } = "Month";

    /// <summary>
    /// Years included in the calculation
    /// </summary>
    public List<int> SelectedYears { get; set; } = [];

    /// <summary>
    /// Total average across all selected years
    /// </summary>
    public decimal TotalAverage { get; set; }

    /// <summary>
    /// Average per month (for monthly view mode)
    /// </summary>
    public IEnumerable<AverageExpensesByMonthDto> MonthlyAverages { get; set; } = [];

    /// <summary>
    /// Average per category (for category view mode)
    /// </summary>
    public IEnumerable<AverageExpensesByCategoryDto> CategoryAverages { get; set; } = [];

    /// <summary>
    /// Individual year data for line chart visualization
    /// </summary>
    public IEnumerable<YearlyExpenseDataDto> YearlyData { get; set; } = [];
}

/// <summary>
/// Monthly average expenses data point
/// </summary>
public class AverageExpensesByMonthDto
{
    /// <summary>
    /// Month number (1-12)
    /// </summary>
    public int Month { get; set; }

    /// <summary>
    /// Month name (e.g., "Jan", "Feb")
    /// </summary>
    public string MonthName { get; set; } = string.Empty;

    /// <summary>
    /// Average spending for this month across selected years
    /// </summary>
    public decimal Average { get; set; }

    /// <summary>
    /// Minimum spending for this month across selected years
    /// </summary>
    public decimal Min { get; set; }

    /// <summary>
    /// Maximum spending for this month across selected years
    /// </summary>
    public decimal Max { get; set; }
}

/// <summary>
/// Category average expenses data point
/// </summary>
public class AverageExpensesByCategoryDto
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
    /// Average spending for this category across selected years
    /// </summary>
    public decimal Average { get; set; }

    /// <summary>
    /// Minimum spending for this category across selected years
    /// </summary>
    public decimal Min { get; set; }

    /// <summary>
    /// Maximum spending for this category across selected years
    /// </summary>
    public decimal Max { get; set; }
}

/// <summary>
/// Individual year expense data for line chart
/// </summary>
public class YearlyExpenseDataDto
{
    /// <summary>
    /// Year
    /// </summary>
    public int Year { get; set; }

    /// <summary>
    /// Total spending for this year
    /// </summary>
    public decimal Total { get; set; }

    /// <summary>
    /// Monthly breakdown for this year
    /// </summary>
    public IEnumerable<MonthlyExpenseDataDto> MonthlyData { get; set; } = [];

    /// <summary>
    /// Category breakdown for this year
    /// </summary>
    public IEnumerable<CategoryExpenseDataDto> CategoryData { get; set; } = [];
}

/// <summary>
/// Monthly expense data point for a specific year
/// </summary>
public class MonthlyExpenseDataDto
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
    /// Total spending for this month
    /// </summary>
    public decimal Amount { get; set; }
}

/// <summary>
/// Category expense data point for a specific year
/// </summary>
public class CategoryExpenseDataDto
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
    /// Total spending for this category
    /// </summary>
    public decimal Amount { get; set; }
}
