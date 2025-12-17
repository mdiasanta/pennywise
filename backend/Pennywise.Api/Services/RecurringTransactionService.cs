using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class RecurringTransactionService : IRecurringTransactionService
{
    private readonly IRecurringTransactionRepository _recurringTransactionRepository;
    private readonly IAssetRepository _assetRepository;
    private readonly IAssetSnapshotRepository _snapshotRepository;

    public RecurringTransactionService(
        IRecurringTransactionRepository recurringTransactionRepository,
        IAssetRepository assetRepository,
        IAssetSnapshotRepository snapshotRepository)
    {
        _recurringTransactionRepository = recurringTransactionRepository;
        _assetRepository = assetRepository;
        _snapshotRepository = snapshotRepository;
    }

    public async Task<IEnumerable<RecurringTransactionDto>> GetByAssetAsync(int assetId, int userId)
    {
        // Verify the asset belongs to the user
        var asset = await _assetRepository.GetByIdAsync(assetId, userId);
        if (asset == null)
            return Enumerable.Empty<RecurringTransactionDto>();

        var transactions = await _recurringTransactionRepository.GetByAssetAsync(assetId);
        return transactions.Select(MapToDto);
    }

    public async Task<IEnumerable<RecurringTransactionDto>> GetByUserAsync(int userId)
    {
        var transactions = await _recurringTransactionRepository.GetByUserAsync(userId);
        return transactions.Select(MapToDto);
    }

    public async Task<RecurringTransactionDto?> GetByIdAsync(int id, int userId)
    {
        var transaction = await _recurringTransactionRepository.GetByIdAsync(id);
        if (transaction == null || transaction.Asset?.UserId != userId)
            return null;

        return MapToDto(transaction);
    }

    public async Task<RecurringTransactionDto> CreateAsync(CreateRecurringTransactionDto createDto, int userId)
    {
        // Verify the asset belongs to the user
        var asset = await _assetRepository.GetByIdAsync(createDto.AssetId, userId);
        if (asset == null)
            throw new ArgumentException("Asset not found or does not belong to user");

        var frequency = Enum.Parse<RecurringFrequency>(createDto.Frequency, ignoreCase: true);
        DayOfWeek? dayOfWeek = null;
        if (!string.IsNullOrEmpty(createDto.DayOfWeek))
        {
            dayOfWeek = Enum.Parse<DayOfWeek>(createDto.DayOfWeek, ignoreCase: true);
        }

        var startDate = createDto.StartDate.ToUniversalTime();
        var nextRunDate = CalculateNextRunDate(startDate, frequency, dayOfWeek, createDto.DayOfMonth, null);

        var transaction = new RecurringTransaction
        {
            AssetId = createDto.AssetId,
            Amount = createDto.Amount,
            Description = createDto.Description,
            Frequency = frequency,
            DayOfWeek = dayOfWeek,
            DayOfMonth = createDto.DayOfMonth,
            StartDate = startDate,
            EndDate = createDto.EndDate?.ToUniversalTime(),
            NextRunDate = nextRunDate,
            IsActive = true
        };

        var created = await _recurringTransactionRepository.CreateAsync(transaction);
        return MapToDto(created);
    }

    public async Task<RecurringTransactionDto?> UpdateAsync(int id, UpdateRecurringTransactionDto updateDto, int userId)
    {
        var existing = await _recurringTransactionRepository.GetByIdAsync(id);
        if (existing == null || existing.Asset?.UserId != userId)
            return null;

        if (updateDto.Amount.HasValue)
            existing.Amount = updateDto.Amount.Value;
        if (updateDto.Description != null)
            existing.Description = updateDto.Description;
        if (updateDto.IsActive.HasValue)
            existing.IsActive = updateDto.IsActive.Value;
        if (updateDto.EndDate.HasValue)
            existing.EndDate = updateDto.EndDate.Value.ToUniversalTime();

        // Handle frequency changes
        bool recalculateNextRun = false;
        if (!string.IsNullOrEmpty(updateDto.Frequency))
        {
            existing.Frequency = Enum.Parse<RecurringFrequency>(updateDto.Frequency, ignoreCase: true);
            recalculateNextRun = true;
        }
        if (updateDto.DayOfWeek != null)
        {
            existing.DayOfWeek = string.IsNullOrEmpty(updateDto.DayOfWeek)
                ? null
                : Enum.Parse<DayOfWeek>(updateDto.DayOfWeek, ignoreCase: true);
            recalculateNextRun = true;
        }
        if (updateDto.DayOfMonth.HasValue)
        {
            existing.DayOfMonth = updateDto.DayOfMonth;
            recalculateNextRun = true;
        }
        if (updateDto.StartDate.HasValue)
        {
            existing.StartDate = updateDto.StartDate.Value.ToUniversalTime();
            recalculateNextRun = true;
        }

        if (recalculateNextRun)
        {
            existing.NextRunDate = CalculateNextRunDate(
                existing.StartDate,
                existing.Frequency,
                existing.DayOfWeek,
                existing.DayOfMonth,
                existing.LastRunDate);
        }

        var updated = await _recurringTransactionRepository.UpdateAsync(existing);
        return updated != null ? MapToDto(updated) : null;
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var existing = await _recurringTransactionRepository.GetByIdAsync(id);
        if (existing == null || existing.Asset?.UserId != userId)
            return false;

        return await _recurringTransactionRepository.DeleteAsync(id);
    }

    public async Task<int> ProcessPendingTransactionsAsync()
    {
        var now = DateTime.UtcNow;
        var pendingTransactions = await _recurringTransactionRepository.GetPendingTransactionsAsync(now);
        int processedCount = 0;

        foreach (var transaction in pendingTransactions)
        {
            try
            {
                // Get the latest snapshot for this asset
                var latestSnapshot = await _snapshotRepository.GetLatestByAssetAsync(transaction.AssetId);
                var currentBalance = latestSnapshot?.Balance ?? 0;
                var newBalance = currentBalance + transaction.Amount;

                // Create a new snapshot with the updated balance
                var snapshot = new AssetSnapshot
                {
                    AssetId = transaction.AssetId,
                    Balance = newBalance,
                    Date = transaction.NextRunDate,
                    Notes = $"Recurring: {transaction.Description}"
                };
                await _snapshotRepository.CreateAsync(snapshot);

                // Update the recurring transaction
                transaction.LastRunDate = transaction.NextRunDate;
                transaction.NextRunDate = CalculateNextRunDate(
                    transaction.StartDate,
                    transaction.Frequency,
                    transaction.DayOfWeek,
                    transaction.DayOfMonth,
                    transaction.LastRunDate);

                await _recurringTransactionRepository.UpdateAsync(transaction);
                processedCount++;
            }
            catch (Exception ex)
            {
                // Log the error but continue processing other transactions
                Console.WriteLine($"Error processing recurring transaction {transaction.Id}: {ex.Message}");
            }
        }

        return processedCount;
    }

    private static DateTime CalculateNextRunDate(
        DateTime startDate,
        RecurringFrequency frequency,
        DayOfWeek? dayOfWeek,
        int? dayOfMonth,
        DateTime? lastRunDate)
    {
        var now = DateTime.UtcNow;
        var baseDate = lastRunDate ?? startDate;

        // If we haven't started yet, use the start date as base
        if (baseDate < startDate)
            baseDate = startDate;

        DateTime nextDate = baseDate;

        switch (frequency)
        {
            case RecurringFrequency.Weekly:
                nextDate = baseDate.AddDays(7);
                if (dayOfWeek.HasValue)
                {
                    // Adjust to the correct day of week
                    while (nextDate.DayOfWeek != dayOfWeek.Value)
                        nextDate = nextDate.AddDays(1);
                }
                break;

            case RecurringFrequency.Biweekly:
                nextDate = baseDate.AddDays(14);
                if (dayOfWeek.HasValue)
                {
                    // Adjust to the correct day of week
                    while (nextDate.DayOfWeek != dayOfWeek.Value)
                        nextDate = nextDate.AddDays(1);
                }
                break;

            case RecurringFrequency.Monthly:
                nextDate = baseDate.AddMonths(1);
                if (dayOfMonth.HasValue)
                {
                    var targetDay = Math.Min(dayOfMonth.Value, DateTime.DaysInMonth(nextDate.Year, nextDate.Month));
                    nextDate = new DateTime(nextDate.Year, nextDate.Month, targetDay, 0, 0, 0, DateTimeKind.Utc);
                }
                break;

            case RecurringFrequency.Quarterly:
                nextDate = baseDate.AddMonths(3);
                if (dayOfMonth.HasValue)
                {
                    var targetDay = Math.Min(dayOfMonth.Value, DateTime.DaysInMonth(nextDate.Year, nextDate.Month));
                    nextDate = new DateTime(nextDate.Year, nextDate.Month, targetDay, 0, 0, 0, DateTimeKind.Utc);
                }
                break;

            case RecurringFrequency.Yearly:
                nextDate = baseDate.AddYears(1);
                break;
        }

        // If the calculated next date is still in the past, keep advancing
        while (nextDate <= now)
        {
            switch (frequency)
            {
                case RecurringFrequency.Weekly:
                    nextDate = nextDate.AddDays(7);
                    break;
                case RecurringFrequency.Biweekly:
                    nextDate = nextDate.AddDays(14);
                    break;
                case RecurringFrequency.Monthly:
                    nextDate = nextDate.AddMonths(1);
                    break;
                case RecurringFrequency.Quarterly:
                    nextDate = nextDate.AddMonths(3);
                    break;
                case RecurringFrequency.Yearly:
                    nextDate = nextDate.AddYears(1);
                    break;
            }
        }

        // For first run, adjust to correct day if specified
        if (lastRunDate == null)
        {
            if (dayOfWeek.HasValue && (frequency == RecurringFrequency.Weekly || frequency == RecurringFrequency.Biweekly))
            {
                // Find the next occurrence of the target day
                var candidate = startDate;
                while (candidate.DayOfWeek != dayOfWeek.Value || candidate <= now)
                    candidate = candidate.AddDays(1);
                nextDate = candidate;
            }
            else if (dayOfMonth.HasValue && frequency == RecurringFrequency.Monthly)
            {
                var targetDay = Math.Min(dayOfMonth.Value, DateTime.DaysInMonth(startDate.Year, startDate.Month));
                var candidate = new DateTime(startDate.Year, startDate.Month, targetDay, 0, 0, 0, DateTimeKind.Utc);
                if (candidate <= now)
                    candidate = candidate.AddMonths(1);
                nextDate = candidate;
            }
        }

        return nextDate;
    }

    private static RecurringTransactionDto MapToDto(RecurringTransaction transaction)
    {
        return new RecurringTransactionDto
        {
            Id = transaction.Id,
            AssetId = transaction.AssetId,
            AssetName = transaction.Asset?.Name ?? string.Empty,
            Amount = transaction.Amount,
            Description = transaction.Description,
            Frequency = transaction.Frequency.ToString(),
            DayOfWeek = transaction.DayOfWeek?.ToString(),
            DayOfMonth = transaction.DayOfMonth,
            StartDate = transaction.StartDate,
            EndDate = transaction.EndDate,
            NextRunDate = transaction.NextRunDate,
            LastRunDate = transaction.LastRunDate,
            IsActive = transaction.IsActive,
            CreatedAt = transaction.CreatedAt,
            UpdatedAt = transaction.UpdatedAt
        };
    }
}
