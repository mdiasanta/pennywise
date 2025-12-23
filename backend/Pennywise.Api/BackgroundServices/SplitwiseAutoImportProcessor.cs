using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;
using Pennywise.Api.Services;

namespace Pennywise.Api.BackgroundServices;

public class SplitwiseAutoImportProcessor : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SplitwiseAutoImportProcessor> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(15); // Check every 15 minutes

    public SplitwiseAutoImportProcessor(
        IServiceProvider serviceProvider,
        ILogger<SplitwiseAutoImportProcessor> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Splitwise Auto-Import Processor starting");

        // Wait a bit on startup to let the application fully initialize
        await Task.Delay(TimeSpan.FromSeconds(60), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessPendingAutoImportsAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing Splitwise auto-imports");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("Splitwise Auto-Import Processor stopping");
    }

    private async Task ProcessPendingAutoImportsAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var autoImportRepository = scope.ServiceProvider.GetRequiredService<ISplitwiseAutoImportRepository>();
        var splitwiseService = scope.ServiceProvider.GetRequiredService<ISplitwiseService>();

        if (!splitwiseService.IsConfigured)
        {
            _logger.LogDebug("Splitwise is not configured, skipping auto-import processing");
            return;
        }

        var pendingImports = await autoImportRepository.GetPendingImportsAsync(DateTime.UtcNow);
        var pendingList = pendingImports.ToList();

        if (pendingList.Count == 0)
        {
            _logger.LogDebug("No pending Splitwise auto-imports found");
            return;
        }

        _logger.LogInformation("Processing {Count} pending Splitwise auto-imports", pendingList.Count);

        foreach (var autoImport in pendingList)
        {
            try
            {
                _logger.LogInformation(
                    "Running auto-import for user {UserId}, group {GroupName}, member {MemberName}",
                    autoImport.UserId, autoImport.GroupName, autoImport.SplitwiseMemberName);

                var dto = MapToDto(autoImport);
                var result = await splitwiseService.RunAutoImportAsync(dto);

                // Update the auto-import record with results
                autoImport.LastRunAt = DateTime.UtcNow;
                autoImport.LastRunImportedCount = result.ImportedCount;
                autoImport.LastRunError = result.Success ? null : result.ErrorMessage;
                autoImport.NextRunAt = CalculateNextRunAt(autoImport.Frequency, DateTime.UtcNow);

                await autoImportRepository.UpdateAsync(autoImport);

                if (result.Success)
                {
                    _logger.LogInformation(
                        "Auto-import completed for user {UserId}: imported {Imported}, duplicates {Duplicates}",
                        autoImport.UserId, result.ImportedCount, result.DuplicatesFound);
                }
                else
                {
                    _logger.LogWarning(
                        "Auto-import failed for user {UserId}: {Error}",
                        autoImport.UserId, result.ErrorMessage);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing auto-import {Id} for user {UserId}",
                    autoImport.Id, autoImport.UserId);

                // Update with error
                autoImport.LastRunAt = DateTime.UtcNow;
                autoImport.LastRunError = ex.Message;
                autoImport.NextRunAt = CalculateNextRunAt(autoImport.Frequency, DateTime.UtcNow);

                try
                {
                    await autoImportRepository.UpdateAsync(autoImport);
                }
                catch (Exception updateEx)
                {
                    _logger.LogError(updateEx, "Failed to update auto-import {Id} with error status", autoImport.Id);
                }
            }
        }
    }

    private static SplitwiseAutoImportDto MapToDto(SplitwiseAutoImport autoImport)
    {
        return new SplitwiseAutoImportDto
        {
            Id = autoImport.Id,
            UserId = autoImport.UserId,
            GroupId = autoImport.GroupId,
            GroupName = autoImport.GroupName,
            SplitwiseUserId = autoImport.SplitwiseUserId,
            SplitwiseMemberName = autoImport.SplitwiseMemberName,
            StartDate = autoImport.StartDate,
            Frequency = autoImport.Frequency.ToString(),
            IsActive = autoImport.IsActive,
            LastRunAt = autoImport.LastRunAt,
            NextRunAt = autoImport.NextRunAt,
            LastRunImportedCount = autoImport.LastRunImportedCount,
            LastRunError = autoImport.LastRunError,
            CreatedAt = autoImport.CreatedAt,
            UpdatedAt = autoImport.UpdatedAt
        };
    }

    public static DateTime CalculateNextRunAt(AutoImportFrequency frequency, DateTime fromDate)
    {
        return frequency switch
        {
            AutoImportFrequency.Daily => fromDate.AddDays(1),
            AutoImportFrequency.Weekly => fromDate.AddDays(7),
            AutoImportFrequency.Monthly => fromDate.AddMonths(1),
            _ => fromDate.AddDays(1)
        };
    }
}
