using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public class SummaryService : ISummaryService
{
    private readonly PennywiseDbContext _context;

    public SummaryService(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(int userId)
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startOfPreviousMonth = startOfMonth.AddMonths(-1);
        var endOfPreviousMonth = startOfMonth.AddTicks(-1);

        var expenses = await _context.Expenses
            .AsNoTracking()
            .Include(e => e.Category)
            .Where(e => e.UserId == userId)
            .ToListAsync();

        var monthExpenses = expenses
            .Where(e => e.Date >= startOfMonth && e.Date <= now)
            .ToList();

        var previousMonthTotal = expenses
            .Where(e => e.Date >= startOfPreviousMonth && e.Date <= endOfPreviousMonth)
            .Sum(e => e.Amount);

        var monthTracked = monthExpenses.Sum(e => e.Amount);
        var totalTracked = expenses.Sum(e => e.Amount);
        var averageTicket = expenses.Count > 0 ? expenses.Average(e => e.Amount) : 0m;
        var activeCategories = monthExpenses.Any()
            ? monthExpenses.Select(e => e.CategoryId).Distinct().Count()
            : expenses.Select(e => e.CategoryId).Distinct().Count();

        var monthChangePercent = previousMonthTotal > 0
            ? Math.Round(((monthTracked - previousMonthTotal) / previousMonthTotal) * 100, 2)
            : 0m;

        var monthlyBaseline = previousMonthTotal > 0 ? previousMonthTotal : monthTracked;
        var remainingThisMonth = monthlyBaseline > monthTracked
            ? Math.Round(monthlyBaseline - monthTracked, 2)
            : 0m;

        var recentTransactions = expenses
            .OrderByDescending(e => e.Date)
            .Take(5)
            .Select(e => new TransactionSummaryDto
            {
                Id = e.Id,
                Title = e.Title,
                Amount = e.Amount,
                Date = e.Date,
                Category = e.Category?.Name,
                CategoryColor = e.Category?.Color
            })
            .ToList();

        return new DashboardSummaryDto
        {
            TotalTracked = totalTracked,
            MonthTracked = monthTracked,
            MonthChangePercent = monthChangePercent,
            AverageTicket = averageTicket,
            ActiveCategories = activeCategories,
            RemainingThisMonth = remainingThisMonth,
            RecentTransactions = recentTransactions
        };
    }

    public async Task<YearOverYearComparisonDto> GetYearOverYearComparisonAsync(int userId, YearOverYearRequestDto request)
    {
        var isMonthMode = request.Mode?.ToLowerInvariant() == "month";
        var currentYear = request.CurrentYear;
        var currentMonth = request.CurrentMonth ?? DateTime.UtcNow.Month;
        var previousYear = request.PreviousYear ?? currentYear - 1;
        var previousMonth = request.PreviousMonth ?? currentMonth;

        // Calculate date ranges based on mode
        DateTime currentStart, currentEnd, previousStart, previousEnd;

        if (isMonthMode)
        {
            currentStart = new DateTime(currentYear, currentMonth, 1, 0, 0, 0, DateTimeKind.Utc);
            currentEnd = currentStart.AddMonths(1).AddTicks(-1);
            previousStart = new DateTime(previousYear, previousMonth, 1, 0, 0, 0, DateTimeKind.Utc);
            previousEnd = previousStart.AddMonths(1).AddTicks(-1);
        }
        else
        {
            currentStart = new DateTime(currentYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            currentEnd = new DateTime(currentYear, 12, 31, 23, 59, 59, DateTimeKind.Utc);
            previousStart = new DateTime(previousYear, 1, 1, 0, 0, 0, DateTimeKind.Utc);
            previousEnd = new DateTime(previousYear, 12, 31, 23, 59, 59, DateTimeKind.Utc);
        }

        // Fetch expenses for both periods
        var allExpenses = await _context.Expenses
            .AsNoTracking()
            .Include(e => e.Category)
            .Where(e => e.UserId == userId &&
                ((e.Date >= currentStart && e.Date <= currentEnd) ||
                 (e.Date >= previousStart && e.Date <= previousEnd)))
            .ToListAsync();

        var currentExpenses = allExpenses.Where(e => e.Date >= currentStart && e.Date <= currentEnd).ToList();
        var previousExpenses = allExpenses.Where(e => e.Date >= previousStart && e.Date <= previousEnd).ToList();

        // Build period DTOs
        var currentPeriod = new YearOverYearPeriodDto
        {
            Year = currentYear,
            Month = isMonthMode ? currentMonth : null,
            Label = isMonthMode
                ? $"{CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(currentMonth)} {currentYear}"
                : currentYear.ToString(),
            Total = currentExpenses.Sum(e => e.Amount),
            TransactionCount = currentExpenses.Count,
            HasData = currentExpenses.Count > 0
        };

        var previousPeriod = new YearOverYearPeriodDto
        {
            Year = previousYear,
            Month = isMonthMode ? previousMonth : null,
            Label = isMonthMode
                ? $"{CultureInfo.CurrentCulture.DateTimeFormat.GetMonthName(previousMonth)} {previousYear}"
                : previousYear.ToString(),
            Total = previousExpenses.Sum(e => e.Amount),
            TransactionCount = previousExpenses.Count,
            HasData = previousExpenses.Count > 0
        };

        // Calculate totals
        var totalDifference = currentPeriod.Total - previousPeriod.Total;
        var percentageChange = previousPeriod.Total > 0
            ? Math.Round((totalDifference / previousPeriod.Total) * 100, 2)
            : 0m;

        // Build category comparisons
        var allCategories = allExpenses
            .Where(e => e.Category != null)
            .Select(e => new { e.Category!.Id, e.Category.Name, e.Category.Color })
            .Distinct()
            .ToList();

        var previousCategoryIds = previousExpenses
            .Where(e => e.Category != null)
            .Select(e => e.CategoryId)
            .Distinct()
            .ToHashSet();

        var categoryComparisons = allCategories
            .Select(cat =>
            {
                var currentAmount = currentExpenses.Where(e => e.CategoryId == cat.Id).Sum(e => e.Amount);
                var previousAmount = previousExpenses.Where(e => e.CategoryId == cat.Id).Sum(e => e.Amount);
                var difference = currentAmount - previousAmount;
                var catPercentChange = previousAmount > 0
                    ? Math.Round((difference / previousAmount) * 100, 2)
                    : 0m;

                return new YearOverYearCategoryComparisonDto
                {
                    CategoryId = cat.Id,
                    CategoryName = cat.Name,
                    CategoryColor = cat.Color,
                    CurrentAmount = currentAmount,
                    PreviousAmount = previousAmount,
                    Difference = difference,
                    PercentageChange = catPercentChange,
                    IsNewCategory = !previousCategoryIds.Contains(cat.Id)
                };
            })
            .OrderByDescending(c => Math.Abs(c.Difference))
            .ToList();

        // Build monthly data for year comparison charts
        var monthlyData = new List<YearOverYearMonthlyDataDto>();
        if (!isMonthMode)
        {
            for (int month = 1; month <= 12; month++)
            {
                var monthStart = new DateTime(currentYear, month, 1, 0, 0, 0, DateTimeKind.Utc);
                var monthEnd = monthStart.AddMonths(1).AddTicks(-1);
                var prevMonthStart = new DateTime(previousYear, month, 1, 0, 0, 0, DateTimeKind.Utc);
                var prevMonthEnd = prevMonthStart.AddMonths(1).AddTicks(-1);

                var currentMonthAmount = currentExpenses
                    .Where(e => e.Date >= monthStart && e.Date <= monthEnd)
                    .Sum(e => e.Amount);
                var previousMonthAmount = previousExpenses
                    .Where(e => e.Date >= prevMonthStart && e.Date <= prevMonthEnd)
                    .Sum(e => e.Amount);

                monthlyData.Add(new YearOverYearMonthlyDataDto
                {
                    Month = month,
                    MonthName = CultureInfo.CurrentCulture.DateTimeFormat.GetAbbreviatedMonthName(month),
                    CurrentYearAmount = currentMonthAmount,
                    PreviousYearAmount = previousMonthAmount,
                    Difference = currentMonthAmount - previousMonthAmount
                });
            }
        }

        return new YearOverYearComparisonDto
        {
            ComparisonMode = isMonthMode ? "Month" : "Year",
            CurrentPeriod = currentPeriod,
            PreviousPeriod = previousPeriod,
            TotalDifference = totalDifference,
            PercentageChange = percentageChange,
            CategoryComparisons = categoryComparisons,
            MonthlyData = monthlyData
        };
    }
}
