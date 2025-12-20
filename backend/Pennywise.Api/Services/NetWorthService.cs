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

            // For the current period, use the actual endDate (or period end, whichever is earlier)
            // This ensures we include snapshots from the current incomplete period
            var periodEnd = GetPeriodEnd(date, groupBy);
            var effectiveEndDate = periodEnd > endDate ? endDate : periodEnd;

            foreach (var asset in assets)
            {
                // Get the most recent snapshot for this asset up to the effective end date
                var assetSnapshots = snapshots
                    .Where(s => s.AssetId == asset.Id && s.Date <= effectiveEndDate)
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

        // Get all assets for the user (needed for interest-based calculations)
        var assets = await _assetRepository.GetAllByUserAsync(userId);

        var recurringTransferSummaries = new List<RecurringTransferSummaryDto>();
        decimal recurringTransfersMonthlyTotal = 0;

        // Filter recurring transactions that are still active (no end date or end date in the future)
        var activeRecurringTransactions = recurringTransactions
            .Where(rt => !rt.EndDate.HasValue || rt.EndDate.Value > DateTime.UtcNow)
            .ToList();

        // Separate interest-based and fixed-amount recurring transactions
        var interestBasedTransactions = activeRecurringTransactions
            .Where(rt => rt.InterestRate.HasValue && rt.InterestRate.Value > 0)
            .ToList();
        var fixedAmountTransactions = activeRecurringTransactions
            .Where(rt => !rt.InterestRate.HasValue || rt.InterestRate.Value == 0)
            .ToList();

        // Get current balances for assets with interest-based recurring transactions
        var assetBalances = new Dictionary<int, decimal>();
        foreach (var rt in interestBasedTransactions)
        {
            if (!assetBalances.ContainsKey(rt.AssetId))
            {
                var asset = assets.FirstOrDefault(a => a.Id == rt.AssetId);
                var latestSnapshot = asset?.Snapshots?.OrderByDescending(s => s.Date).FirstOrDefault();
                assetBalances[rt.AssetId] = latestSnapshot?.Balance ?? 0;
            }
        }

        foreach (var rt in activeRecurringTransactions)
        {
            var isInterestBased = rt.InterestRate.HasValue && rt.InterestRate.Value > 0;
            decimal monthlyEquivalent;

            if (isInterestBased)
            {
                // For interest-based, calculate monthly equivalent based on current balance
                var currentBalance = assetBalances.GetValueOrDefault(rt.AssetId, 0);
                monthlyEquivalent = CalculateInterestMonthlyEquivalent(currentBalance, rt.InterestRate.Value, rt.IsCompounding);
            }
            else
            {
                monthlyEquivalent = CalculateMonthlyEquivalent(rt.Amount, rt.Frequency);
            }

            recurringTransfersMonthlyTotal += monthlyEquivalent;

            recurringTransferSummaries.Add(new RecurringTransferSummaryDto
            {
                Id = rt.Id,
                Description = rt.Description,
                AssetName = rt.Asset?.Name ?? UnknownAssetName,
                Amount = rt.Amount,
                Frequency = rt.Frequency.ToString(),
                MonthlyEquivalent = monthlyEquivalent,
                InterestRate = rt.InterestRate,
                IsCompounding = rt.IsCompounding,
                IsInterestBased = isInterestBased
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
                    // Recurring custom items are added to the monthly total
                    if (Enum.TryParse<RecurringFrequency>(item.Frequency, true, out var freq))
                    {
                        monthlyEquivalent = CalculateMonthlyEquivalent(item.Amount, freq);
                    }
                    else
                    {
                        monthlyEquivalent = item.Amount; // Default to monthly
                    }
                    customItemsMonthlyTotal += monthlyEquivalent;
                }
                else
                {
                    // One-time items are NOT added to monthly total - they're applied only in their specific month
                    // (handled in the projection loop below)
                    monthlyEquivalent = 0;
                }

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

        // Clone asset balances for projection tracking (interest compounds on updated balance)
        var projectedAssetBalances = new Dictionary<int, decimal>(assetBalances);

        for (int i = 0; i < projectionMonths; i++)
        {
            var currentMonth = projectionStart.AddMonths(i);

            // Start with fixed recurring transactions monthly change
            decimal monthlyChange = 0;

            if (includeRecurringTransfers)
            {
                // Add fixed-amount recurring transactions
                foreach (var rt in fixedAmountTransactions)
                {
                    // Check if this transaction is still active in this month
                    if (rt.EndDate.HasValue &&
                        (rt.EndDate.Value.Year < currentMonth.Year ||
                        (rt.EndDate.Value.Year == currentMonth.Year && rt.EndDate.Value.Month < currentMonth.Month)))
                    {
                        continue; // Transaction ended
                    }
                    monthlyChange += CalculateMonthlyEquivalent(rt.Amount, rt.Frequency);
                }

                // Calculate and add interest-based recurring transactions
                foreach (var rt in interestBasedTransactions)
                {
                    // Check if this transaction is still active in this month
                    if (rt.EndDate.HasValue &&
                        (rt.EndDate.Value.Year < currentMonth.Year ||
                        (rt.EndDate.Value.Year == currentMonth.Year && rt.EndDate.Value.Month < currentMonth.Month)))
                    {
                        continue; // Transaction ended
                    }

                    var currentBalance = projectedAssetBalances.GetValueOrDefault(rt.AssetId, 0);
                    var interestPayment = CalculateInterestMonthlyEquivalent(currentBalance, rt.InterestRate!.Value, rt.IsCompounding);

                    // Add interest to the asset balance for compound effect
                    projectedAssetBalances[rt.AssetId] = currentBalance + interestPayment;
                    monthlyChange += interestPayment;
                }
            }

            // Add average expenses if enabled
            if (includeAverageExpenses)
            {
                monthlyChange -= averageMonthlyExpenses;
            }

            // Add custom items monthly contribution
            monthlyChange += customItemsMonthlyTotal;

            // Adjust for recurring transactions that end during this month (legacy check for custom items with frequency)
            // Note: The logic above already handles end dates for recurring transactions

            // Add one-time custom items that fall in this month (or first month if no date specified)
            if (customItems != null)
            {
                foreach (var item in customItems.Where(c => !c.IsRecurring))
                {
                    if (item.Date.HasValue)
                    {
                        // Item has a specific date - apply in that month
                        if (item.Date.Value.Year == currentMonth.Year && item.Date.Value.Month == currentMonth.Month)
                        {
                            monthlyChange += item.Amount;
                        }
                    }
                    else if (i == 0)
                    {
                        // Item has no date - apply in the first projection month
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
        // Use the projected history we just calculated to find when the goal is reached
        NetWorthGoalDto? goalInfo = null;
        if (goalAmount.HasValue)
        {
            var goal = goalAmount.Value;
            var isAchievable = false;
            DateTime? estimatedGoalDate = null;
            int? monthsToGoal = null;

            if (currentNetWorth >= goal)
            {
                // Goal already achieved
                estimatedGoalDate = DateTime.UtcNow;
                monthsToGoal = 0;
                isAchievable = true;
            }
            else
            {
                // Find the first projected month where we reach the goal
                var projectedPoints = projectedHistory.Where(p => !p.IsHistorical).ToList();
                for (int i = 0; i < projectedPoints.Count; i++)
                {
                    if (projectedPoints[i].ProjectedNetWorth >= goal)
                    {
                        monthsToGoal = i + 1;
                        estimatedGoalDate = projectedPoints[i].Date;
                        isAchievable = true;
                        break;
                    }
                }

                // If goal not reached within projection period but trending positive, estimate when
                if (!isAchievable && projectedMonthlyChange > 0)
                {
                    // Calculate from the end of projection period
                    var lastProjectedPoint = projectedPoints.LastOrDefault();
                    if (lastProjectedPoint != null)
                    {
                        var remainingToGoal = goal - lastProjectedPoint.ProjectedNetWorth;
                        var additionalMonthsNeeded = (int)Math.Ceiling(remainingToGoal / projectedMonthlyChange);
                        monthsToGoal = projectionMonths + additionalMonthsNeeded;
                        estimatedGoalDate = lastProjectedPoint.Date.AddMonths(additionalMonthsNeeded);
                        isAchievable = true;
                    }
                }
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
            RecurringTransfersMonthlyTotal = $"Sum of all active recurring transfers converted to their monthly equivalent. Weekly × {WeeksPerMonth:F2}, Biweekly × {BiweeklyPerMonth:F2}, Monthly × 1, Quarterly ÷ 3, Yearly ÷ 12. Interest-based transactions (APR/APY) are calculated based on current asset balances and compound over time in the projection.",
            CustomItemsTotal = customItems?.Count > 0
                ? $"Sum of {customItems.Count} custom item(s). One-time items are applied in their specified month. Recurring custom items are converted to monthly equivalents."
                : "No custom items added. Add custom items for major purchases like a house, car, or other planned expenses/income.",
            ProjectedMonthlyChange = projectionParts.Count > 0
                ? $"Calculated from: {string.Join(", ", projectionParts)}. This is the expected net worth change per month. Note: Interest-based recurring transactions compound over time, so monthly gains may increase."
                : "No projection factors enabled. Enable recurring transfers or add custom items to see a projection.",
            Projection = $"Starting from your current net worth ({currentNetWorth:C0}), the projection adds the monthly change each month for {projectionMonths} months. Interest-based recurring transactions compound on the projected balance. One-time custom items are applied in their specified month."
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

    /// <summary>
    /// Calculate the monthly interest payment based on balance and annual rate
    /// </summary>
    private static decimal CalculateInterestMonthlyEquivalent(decimal balance, decimal annualRatePercent, bool isCompounding)
    {
        // Convert annual rate from percentage to decimal (e.g., 3.5% -> 0.035)
        var rate = annualRatePercent / 100m;

        // Monthly rate
        // For APY (isCompounding=true), we calculate the effective monthly rate
        // For APR (isCompounding=false), we simply divide by 12
        if (isCompounding)
        {
            // APY represents the effective annual yield with compounding
            // To get monthly: (1 + APY)^(1/12) - 1
            // For simplicity and to avoid complex math, we use APY/12 which is close enough for projection
            return Math.Round(balance * (rate / 12m), 2);
        }
        else
        {
            // APR - simple interest divided by 12
            return Math.Round(balance * (rate / 12m), 2);
        }
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

    public async Task<LiabilityPayoffEstimateDto> GetLiabilityPayoffEstimateAsync(
        int userId,
        List<LiabilityPayoffSettingsDto>? settings = null)
    {
        const int MaxPayoffMonths = 360; // 30 years max

        var assets = await _assetRepository.GetAllByUserAsync(userId);
        var liabilities = assets.Where(a => a.AssetCategory?.IsLiability == true).ToList();

        // Get recurring transactions for liabilities (payments)
        var recurringTransactions = (await _recurringTransactionRepository.GetByUserAsync(userId))
            .Where(rt => rt.IsActive && liabilities.Any(l => l.Id == rt.AssetId))
            .ToList();

        var settingsDict = settings?.ToDictionary(s => s.AssetId) ?? new Dictionary<int, LiabilityPayoffSettingsDto>();

        var liabilityItems = new List<LiabilityPayoffItemDto>();
        decimal totalLiabilities = 0;
        decimal totalMonthlyPayment = 0;
        DateTime? overallPayoffDate = null;

        foreach (var liability in liabilities)
        {
            var latestSnapshot = liability.Snapshots?.OrderByDescending(s => s.Date).FirstOrDefault();
            var currentBalance = latestSnapshot?.Balance ?? 0;

            if (currentBalance <= 0) continue; // Skip if paid off

            totalLiabilities += currentBalance;

            // Get settings for this liability
            settingsDict.TryGetValue(liability.Id, out var liabilitySettings);

            // Calculate monthly payment from recurring transactions or settings
            decimal monthlyPayment = 0;
            var liabilityRecurring = recurringTransactions.Where(rt => rt.AssetId == liability.Id).ToList();

            if (liabilitySettings?.MonthlyPayment.HasValue == true)
            {
                monthlyPayment = liabilitySettings.MonthlyPayment.Value;
            }
            else
            {
                foreach (var rt in liabilityRecurring)
                {
                    // Recurring transactions for liabilities are typically negative (reducing balance)
                    // But payments are stored as negative amounts, so we take the absolute value
                    monthlyPayment += Math.Abs(CalculateMonthlyEquivalent(rt.Amount, rt.Frequency));
                }
            }

            totalMonthlyPayment += monthlyPayment;

            // Interest rate (from settings, default to 0 if not provided)
            var annualInterestRate = liabilitySettings?.InterestRate ?? 0;
            var monthlyInterestRate = annualInterestRate / 100m / 12m;

            // Calculate payoff schedule
            var payoffSchedule = new List<LiabilityPayoffPointDto>();
            var balance = currentBalance;
            var totalInterestPaid = 0m;
            var currentDate = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(1);
            DateTime? payoffDate = null;
            int monthsToPayoff = 0;

            if (monthlyPayment > 0)
            {
                for (int month = 0; month < MaxPayoffMonths && balance > 0; month++)
                {
                    var monthDate = currentDate.AddMonths(month);
                    var interest = balance * monthlyInterestRate;
                    var payment = Math.Min(monthlyPayment, balance + interest);
                    var principal = payment - interest;

                    balance = Math.Max(0, balance - principal);
                    totalInterestPaid += interest;
                    monthsToPayoff = month + 1;

                    payoffSchedule.Add(new LiabilityPayoffPointDto
                    {
                        Date = monthDate,
                        Balance = balance,
                        Payment = payment,
                        Interest = interest,
                        Principal = principal
                    });

                    if (balance <= 0)
                    {
                        payoffDate = monthDate;
                        break;
                    }
                }
            }

            // Track the latest payoff date across all liabilities
            if (payoffDate.HasValue && (!overallPayoffDate.HasValue || payoffDate.Value > overallPayoffDate.Value))
            {
                overallPayoffDate = payoffDate;
            }

            liabilityItems.Add(new LiabilityPayoffItemDto
            {
                AssetId = liability.Id,
                Name = liability.Name,
                Color = liability.Color,
                CurrentBalance = currentBalance,
                MonthlyPayment = monthlyPayment,
                InterestRate = annualInterestRate,
                EstimatedPayoffDate = payoffDate,
                MonthsToPayoff = payoffDate.HasValue ? monthsToPayoff : null,
                TotalInterestPaid = totalInterestPaid,
                PayoffSchedule = payoffSchedule,
                HasRecurringPayment = liabilityRecurring.Any()
            });
        }

        // Calculate overall months to payoff
        int? overallMonthsToPayoff = null;
        if (overallPayoffDate.HasValue)
        {
            var now = DateTime.UtcNow;
            overallMonthsToPayoff = ((overallPayoffDate.Value.Year - now.Year) * 12) + (overallPayoffDate.Value.Month - now.Month);
        }

        return new LiabilityPayoffEstimateDto
        {
            Liabilities = liabilityItems,
            TotalLiabilities = totalLiabilities,
            TotalMonthlyPayment = totalMonthlyPayment,
            OverallPayoffDate = overallPayoffDate,
            MonthsToPayoff = overallMonthsToPayoff
        };
    }

    public async Task<DateTime?> GetEarliestSnapshotDateAsync(int userId)
    {
        return await _snapshotRepository.GetEarliestDateByUserAsync(userId);
    }
}
