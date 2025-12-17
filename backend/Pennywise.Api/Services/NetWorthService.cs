using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class NetWorthService : INetWorthService
{
    private const int HistoricalLookbackMonths = 12;
    private const int RecentHistoryMonthsToDisplay = 6;
    private const string UnknownAssetName = "Unknown";
    private const decimal WeeksPerMonth = 4.33m;
    private const decimal BiweeklyPerMonth = 2.17m;

    private readonly IAssetRepository _assetRepository;
    private readonly IAssetSnapshotRepository _snapshotRepository;
    private readonly IAssetCategoryRepository _categoryRepository;
    private readonly IExpenseRepository _expenseRepository;
    private readonly IRecurringTransactionRepository _recurringTransactionRepository;

    public NetWorthService(
        IAssetRepository assetRepository,
        IAssetSnapshotRepository snapshotRepository,
        IAssetCategoryRepository categoryRepository,
        IExpenseRepository expenseRepository,
        IRecurringTransactionRepository recurringTransactionRepository)
    {
        _assetRepository = assetRepository;
        _snapshotRepository = snapshotRepository;
        _categoryRepository = categoryRepository;
        _expenseRepository = expenseRepository;
        _recurringTransactionRepository = recurringTransactionRepository;
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

    public async Task<NetWorthProjectionDto> GetProjectionAsync(
        int userId, 
        decimal? goalAmount = null, 
        int projectionMonths = 12, 
        bool includeRecurringTransfers = true,
        bool includeAverageExpenses = false,
        List<CustomProjectionItemDto>? customItems = null)
    {
        // Validate projectionMonths
        projectionMonths = Math.Clamp(projectionMonths, 1, 120);
        
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
        
        // Calculate average monthly net change based on net worth history (for reference only)
        var monthlyNetChanges = new List<decimal>();
        for (int i = 1; i < history.Count; i++)
        {
            monthlyNetChanges.Add(history[i].NetWorth - history[i - 1].NetWorth);
        }
        
        var averageMonthlyNetChange = monthlyNetChanges.Count > 0 
            ? monthlyNetChanges.Average() 
            : 0;
        
        // Get recurring transactions and calculate monthly equivalent
        var recurringTransactions = (await _recurringTransactionRepository.GetByUserAsync(userId))
            .Where(rt => rt.IsActive)
            .ToList();
        
        var recurringTransferSummaries = new List<RecurringTransferSummaryDto>();
        decimal recurringTransfersMonthlyTotal = 0;
        
        foreach (var rt in recurringTransactions)
        {
            var monthlyEquivalent = CalculateMonthlyEquivalent(rt.Amount, rt.Frequency);
            recurringTransfersMonthlyTotal += monthlyEquivalent;
            
            recurringTransferSummaries.Add(new RecurringTransferSummaryDto
            {
                Id = rt.Id,
                Description = rt.Description,
                AssetName = rt.Asset?.Name ?? UnknownAssetName,
                Amount = rt.Amount,
                Frequency = rt.Frequency.ToString(),
                MonthlyEquivalent = monthlyEquivalent
            });
        }
        
        // Process custom items
        var processedCustomItems = new List<CustomProjectionItemDto>();
        decimal customItemsMonthlyTotal = 0;
        
        if (customItems != null)
        {
            foreach (var item in customItems)
            {
                decimal monthlyEquivalent;
                if (item.IsRecurring && !string.IsNullOrEmpty(item.Frequency))
                {
                    if (Enum.TryParse<RecurringFrequency>(item.Frequency, true, out var freq))
                    {
                        monthlyEquivalent = CalculateMonthlyEquivalent(item.Amount, freq);
                    }
                    else
                    {
                        monthlyEquivalent = item.Amount; // Default to monthly
                    }
                }
                else
                {
                    // One-time items spread across projection period
                    monthlyEquivalent = item.Amount / projectionMonths;
                }
                
                customItemsMonthlyTotal += monthlyEquivalent;
                processedCustomItems.Add(new CustomProjectionItemDto
                {
                    Description = item.Description,
                    Amount = item.Amount,
                    Date = item.Date,
                    IsRecurring = item.IsRecurring,
                    Frequency = item.Frequency,
                    MonthlyEquivalent = monthlyEquivalent
                });
            }
        }
        
        // Get current net worth
        var summary = await GetSummaryAsync(userId);
        var currentNetWorth = summary.NetWorth;
        
        // Calculate projected monthly change based on recurring transfers (not historical trends)
        decimal projectedMonthlyChange = 0;
        
        if (includeRecurringTransfers)
        {
            projectedMonthlyChange += recurringTransfersMonthlyTotal;
        }
        
        if (includeAverageExpenses)
        {
            projectedMonthlyChange -= averageMonthlyExpenses;
        }
        
        projectedMonthlyChange += customItemsMonthlyTotal;
        
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
            var currentMonth = projectionStart.AddMonths(i);
            var monthlyChange = projectedMonthlyChange;
            
            // Add one-time custom items that fall in this month
            if (customItems != null)
            {
                foreach (var item in customItems.Where(c => !c.IsRecurring && c.Date.HasValue))
                {
                    var itemDate = item.Date!.Value;
                    if (itemDate.Year == currentMonth.Year && itemDate.Month == currentMonth.Month)
                    {
                        monthlyChange += item.Amount;
                    }
                }
            }
            
            projectedNetWorth += monthlyChange;
            projectedHistory.Add(new NetWorthProjectionPointDto
            {
                Date = currentMonth,
                ProjectedNetWorth = projectedNetWorth,
                IsHistorical = false
            });
        }
        
        // Calculate goal information if provided
        NetWorthGoalDto? goalInfo = null;
        if (goalAmount.HasValue)
        {
            var goal = goalAmount.Value;
            bool isAchievable;
            DateTime? estimatedGoalDate = null;
            int? monthsToGoal = null;
            
            if (currentNetWorth >= goal)
            {
                // Goal already achieved
                estimatedGoalDate = DateTime.UtcNow;
                monthsToGoal = 0;
                isAchievable = true;
            }
            else if (projectedMonthlyChange > 0)
            {
                // Calculate months to reach goal
                var monthsNeeded = (int)Math.Ceiling((goal - currentNetWorth) / projectedMonthlyChange);
                monthsToGoal = monthsNeeded;
                estimatedGoalDate = DateTime.UtcNow.AddMonths(monthsNeeded);
                isAchievable = true;
            }
            else
            {
                // Net worth is declining or static, goal may not be achievable
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
        
        // Build calculation descriptions
        var monthsUsed = monthlyExpenses.Count > 0 ? monthlyExpenses.Count : HistoricalLookbackMonths;
        
        var projectionParts = new List<string>();
        if (includeRecurringTransfers)
            projectionParts.Add("recurring transfers");
        if (includeAverageExpenses)
            projectionParts.Add("average monthly expenses (subtracted)");
        if (customItems?.Count > 0)
            projectionParts.Add("custom projection items");
        
        var calculationDescriptions = new ProjectionCalculationDescriptionDto
        {
            AverageMonthlyExpenses = $"Sum of all expenses over the last {monthsUsed} months, divided by {monthsUsed}. This represents your typical monthly spending. When enabled, this amount is subtracted from the projection.",
            AverageMonthlyNetChange = $"Historical reference: The average change in net worth between consecutive months. This shows your past trend but is not used in the projection calculation.",
            RecurringTransfersMonthlyTotal = $"Sum of all active recurring transfers converted to their monthly equivalent. Weekly × {WeeksPerMonth:F2}, Biweekly × {BiweeklyPerMonth:F2}, Monthly × 1, Quarterly ÷ 3, Yearly ÷ 12.",
            CustomItemsTotal = customItems?.Count > 0 
                ? $"Sum of {customItems.Count} custom item(s). One-time items are applied in their specified month. Recurring custom items are converted to monthly equivalents."
                : "No custom items added. Add custom items for major purchases like a house, car, or other planned expenses/income.",
            ProjectedMonthlyChange = projectionParts.Count > 0
                ? $"Calculated from: {string.Join(", ", projectionParts)}. This is the expected net worth change per month."
                : "No projection factors enabled. Enable recurring transfers or add custom items to see a projection.",
            Projection = $"Starting from your current net worth ({currentNetWorth:C0}), the projection adds the monthly change each month for {projectionMonths} months. One-time custom items are applied in their specified month."
        };
        
        return new NetWorthProjectionDto
        {
            CurrentNetWorth = currentNetWorth,
            AverageMonthlyExpenses = averageMonthlyExpenses,
            AverageMonthlyNetChange = averageMonthlyNetChange,
            RecurringTransfersMonthlyTotal = recurringTransfersMonthlyTotal,
            CustomItemsMonthlyTotal = customItemsMonthlyTotal,
            ProjectedMonthlyChange = projectedMonthlyChange,
            IncludesRecurringTransfers = includeRecurringTransfers,
            IncludesAverageExpenses = includeAverageExpenses,
            ProjectedHistory = projectedHistory,
            RecurringTransfers = recurringTransferSummaries,
            CustomItems = processedCustomItems,
            Goal = goalInfo,
            CalculationDescriptions = calculationDescriptions
        };
    }
    
    private static decimal CalculateMonthlyEquivalent(decimal amount, RecurringFrequency frequency)
    {
        return frequency switch
        {
            RecurringFrequency.Weekly => amount * WeeksPerMonth,
            RecurringFrequency.Biweekly => amount * BiweeklyPerMonth,
            RecurringFrequency.Monthly => amount,
            RecurringFrequency.Quarterly => amount / 3m,
            RecurringFrequency.Yearly => amount / 12m,
            _ => amount
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
