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
}
