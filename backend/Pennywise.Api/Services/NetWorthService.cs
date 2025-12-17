using Pennywise.Api.DTOs;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class NetWorthService : INetWorthService
{
    private const int HistoricalLookbackMonths = 12;
    private const int RecentHistoryMonthsToDisplay = 6;

    private readonly IAssetRepository _assetRepository;
    private readonly IAssetSnapshotRepository _snapshotRepository;
    private readonly IAssetCategoryRepository _categoryRepository;
    private readonly IExpenseRepository _expenseRepository;

    public NetWorthService(
        IAssetRepository assetRepository,
        IAssetSnapshotRepository snapshotRepository,
        IAssetCategoryRepository categoryRepository,
        IExpenseRepository expenseRepository)
    {
        _assetRepository = assetRepository;
        _snapshotRepository = snapshotRepository;
        _categoryRepository = categoryRepository;
        _expenseRepository = expenseRepository;
    }

    public async Task<NetWorthSummaryDto> GetSummaryAsync(int userId, DateTime? asOfDate = null)
    {
        var targetDate = asOfDate ?? DateTime.UtcNow;
        var assets = await _assetRepository.GetAllByUserAsync(userId);
        var categories = await _categoryRepository.GetAllAsync();

        var categorySummaries = new List<AssetCategorySummaryDto>();
        decimal totalAssets = 0;
        decimal totalLiabilities = 0;

        foreach (var category in categories)
        {
            var categoryAssets = assets.Where(a => a.AssetCategoryId == category.Id).ToList();
            if (!categoryAssets.Any())
                continue;

            var assetSummaries = new List<AssetSummaryDto>();
            decimal categoryTotal = 0;

            foreach (var asset in categoryAssets)
            {
                var latestSnapshot = asset.Snapshots?.OrderByDescending(s => s.Date).FirstOrDefault();
                var balance = latestSnapshot?.Balance ?? 0;

                assetSummaries.Add(new AssetSummaryDto
                {
                    AssetId = asset.Id,
                    AssetName = asset.Name,
                    Color = asset.Color,
                    Balance = balance,
                    LastUpdated = latestSnapshot?.Date
                });

                categoryTotal += balance;
            }

            if (category.IsLiability)
                totalLiabilities += categoryTotal;
            else
                totalAssets += categoryTotal;

            categorySummaries.Add(new AssetCategorySummaryDto
            {
                CategoryId = category.Id,
                CategoryName = category.Name,
                Color = category.Color,
                IsLiability = category.IsLiability,
                TotalBalance = categoryTotal,
                Assets = assetSummaries
            });
        }

        // Calculate change from last period (30 days ago)
        var previousDate = targetDate.AddDays(-30);
        var previousSnapshots = await _snapshotRepository.GetByUserAsync(userId, null, previousDate);

        decimal previousNetWorth = 0;
        foreach (var asset in assets)
        {
            var assetSnapshots = previousSnapshots.Where(s => s.AssetId == asset.Id);
            var latestPreviousSnapshot = assetSnapshots.OrderByDescending(s => s.Date).FirstOrDefault();

            if (latestPreviousSnapshot != null)
            {
                var isLiability = asset.AssetCategory?.IsLiability ?? false;
                if (isLiability)
                    previousNetWorth -= latestPreviousSnapshot.Balance;
                else
                    previousNetWorth += latestPreviousSnapshot.Balance;
            }
        }

        var currentNetWorth = totalAssets - totalLiabilities;
        var change = currentNetWorth - previousNetWorth;
        var changePercent = previousNetWorth != 0 ? (change / Math.Abs(previousNetWorth)) * 100 : 0;

        return new NetWorthSummaryDto
        {
            TotalAssets = totalAssets,
            TotalLiabilities = totalLiabilities,
            NetWorth = currentNetWorth,
            ChangeFromLastPeriod = change,
            ChangePercent = changePercent,
            AssetsByCategory = categorySummaries
        };
    }

    public async Task<IEnumerable<NetWorthHistoryPointDto>> GetHistoryAsync(int userId, DateTime startDate, DateTime endDate, string groupBy = "month")
    {
        // Fetch all snapshots up to endDate (no startDate filter) so we can find
        // the most recent snapshot for any date in the range, even if the snapshot
        // was created before the startDate
        var snapshots = await _snapshotRepository.GetByUserAsync(userId, null, endDate);
        var assets = await _assetRepository.GetAllByUserAsync(userId);

        var history = new List<NetWorthHistoryPointDto>();
        var dates = GenerateDatePoints(startDate, endDate, groupBy);

        foreach (var date in dates)
        {
            decimal totalAssets = 0;
            decimal totalLiabilities = 0;

            foreach (var asset in assets)
            {
                // Get the most recent snapshot for this asset up to this date
                var assetSnapshots = snapshots
                    .Where(s => s.AssetId == asset.Id && s.Date <= date)
                    .OrderByDescending(s => s.Date)
                    .FirstOrDefault();

                if (assetSnapshots != null)
                {
                    var isLiability = asset.AssetCategory?.IsLiability ?? false;
                    if (isLiability)
                        totalLiabilities += assetSnapshots.Balance;
                    else
                        totalAssets += assetSnapshots.Balance;
                }
            }

            history.Add(new NetWorthHistoryPointDto
            {
                Date = date,
                TotalAssets = totalAssets,
                TotalLiabilities = totalLiabilities,
                NetWorth = totalAssets - totalLiabilities
            });
        }

        return history;
    }

    public async Task<NetWorthComparisonDto> GetComparisonAsync(int userId, DateTime startDate, DateTime endDate, string groupBy = "month")
    {
        var netWorthHistory = (await GetHistoryAsync(userId, startDate, endDate, groupBy)).ToList();

        // Get expense history
        var expenses = await _expenseRepository.GetByDateRangeAsync(userId, startDate, endDate);
        var expenseHistory = new List<ExpenseHistoryPointDto>();
        var dates = GenerateDatePoints(startDate, endDate, groupBy);

        foreach (var date in dates)
        {
            var periodEnd = GetPeriodEnd(date, groupBy);
            var periodExpenses = expenses
                .Where(e => e.Date >= date && e.Date < periodEnd)
                .Sum(e => e.Amount);

            expenseHistory.Add(new ExpenseHistoryPointDto
            {
                Date = date,
                TotalExpenses = periodExpenses
            });
        }

        // Update net worth history with expense data
        for (int i = 0; i < netWorthHistory.Count && i < expenseHistory.Count; i++)
        {
            netWorthHistory[i].TotalExpenses = expenseHistory[i].TotalExpenses;
        }

        return new NetWorthComparisonDto
        {
            NetWorthHistory = netWorthHistory,
            ExpenseHistory = expenseHistory
        };
    }

    public async Task<NetWorthProjectionDto> GetProjectionAsync(int userId, decimal? goalAmount = null, int projectionMonths = 12)
    {
        // Get historical data from the configured lookback period
        var endDate = DateTime.UtcNow;
        var startDate = endDate.AddMonths(-HistoricalLookbackMonths);
        
        var history = (await GetHistoryAsync(userId, startDate, endDate, "month")).ToList();
        var expenses = await _expenseRepository.GetByDateRangeAsync(userId, startDate, endDate);
        
        // Calculate average monthly expenses
        var monthlyExpenses = expenses
            .GroupBy(e => new { e.Date.Year, e.Date.Month })
            .Select(g => g.Sum(e => e.Amount))
            .ToList();
        
        var averageMonthlyExpenses = monthlyExpenses.Count > 0 
            ? monthlyExpenses.Average() 
            : 0;
        
        // Calculate average monthly net change based on net worth history
        var monthlyNetChanges = new List<decimal>();
        for (int i = 1; i < history.Count; i++)
        {
            monthlyNetChanges.Add(history[i].NetWorth - history[i - 1].NetWorth);
        }
        
        var averageMonthlyNetChange = monthlyNetChanges.Count > 0 
            ? monthlyNetChanges.Average() 
            : 0;
        
        // Get current net worth
        var summary = await GetSummaryAsync(userId);
        var currentNetWorth = summary.NetWorth;
        
        // Build projection points
        var projectedHistory = new List<NetWorthProjectionPointDto>();
        
        // Add recent historical points for context in the chart
        var recentHistory = history.TakeLast(RecentHistoryMonthsToDisplay);
        foreach (var point in recentHistory)
        {
            projectedHistory.Add(new NetWorthProjectionPointDto
            {
                Date = point.Date,
                ProjectedNetWorth = point.NetWorth,
                IsHistorical = true
            });
        }
        
        // Add future projection points
        var projectionStart = new DateTime(endDate.Year, endDate.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
        var projectedNetWorth = currentNetWorth;
        
        for (int i = 0; i < projectionMonths; i++)
        {
            projectedNetWorth += averageMonthlyNetChange;
            projectedHistory.Add(new NetWorthProjectionPointDto
            {
                Date = projectionStart.AddMonths(i),
                ProjectedNetWorth = projectedNetWorth,
                IsHistorical = false
            });
        }
        
        // Calculate goal information if provided
        NetWorthGoalDto? goalInfo = null;
        if (goalAmount.HasValue)
        {
            var goal = goalAmount.Value;
            var isAchievable = averageMonthlyNetChange > 0 || currentNetWorth >= goal;
            DateTime? estimatedGoalDate = null;
            int? monthsToGoal = null;
            
            if (currentNetWorth >= goal)
            {
                // Goal already achieved
                estimatedGoalDate = DateTime.UtcNow;
                monthsToGoal = 0;
                isAchievable = true;
            }
            else if (averageMonthlyNetChange > 0)
            {
                // Calculate months to reach goal
                var monthsNeeded = (int)Math.Ceiling((goal - currentNetWorth) / averageMonthlyNetChange);
                monthsToGoal = monthsNeeded;
                estimatedGoalDate = DateTime.UtcNow.AddMonths(monthsNeeded);
                isAchievable = true;
            }
            else
            {
                // Net worth is declining, goal may not be achievable
                isAchievable = false;
            }
            
            goalInfo = new NetWorthGoalDto
            {
                GoalAmount = goal,
                EstimatedGoalDate = estimatedGoalDate,
                MonthsToGoal = monthsToGoal,
                IsAchievable = isAchievable
            };
        }
        
        return new NetWorthProjectionDto
        {
            CurrentNetWorth = currentNetWorth,
            AverageMonthlyExpenses = averageMonthlyExpenses,
            AverageMonthlyNetChange = averageMonthlyNetChange,
            ProjectedHistory = projectedHistory,
            Goal = goalInfo
        };
    }

    private static IEnumerable<DateTime> GenerateDatePoints(DateTime startDate, DateTime endDate, string groupBy)
    {
        var dates = new List<DateTime>();
        var current = GetPeriodStart(startDate, groupBy);

        while (current <= endDate)
        {
            dates.Add(current);
            current = groupBy.ToLower() switch
            {
                "day" => current.AddDays(1),
                "week" => current.AddDays(7),
                "month" => current.AddMonths(1),
                "quarter" => current.AddMonths(3),
                "year" => current.AddYears(1),
                _ => current.AddMonths(1)
            };
        }

        return dates;
    }

    private static DateTime GetPeriodStart(DateTime date, string groupBy)
    {
        return groupBy.ToLower() switch
        {
            "day" => date.Date,
            "week" => date.Date.AddDays(-(int)date.DayOfWeek),
            "month" => new DateTime(date.Year, date.Month, 1, 0, 0, 0, DateTimeKind.Utc),
            "quarter" => new DateTime(date.Year, ((date.Month - 1) / 3) * 3 + 1, 1, 0, 0, 0, DateTimeKind.Utc),
            "year" => new DateTime(date.Year, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            _ => new DateTime(date.Year, date.Month, 1, 0, 0, 0, DateTimeKind.Utc)
        };
    }

    private static DateTime GetPeriodEnd(DateTime periodStart, string groupBy)
    {
        return groupBy.ToLower() switch
        {
            "day" => periodStart.AddDays(1),
            "week" => periodStart.AddDays(7),
            "month" => periodStart.AddMonths(1),
            "quarter" => periodStart.AddMonths(3),
            "year" => periodStart.AddYears(1),
            _ => periodStart.AddMonths(1)
        };
    }
}
