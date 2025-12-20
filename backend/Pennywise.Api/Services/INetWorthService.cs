using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface INetWorthService
{
    Task<NetWorthSummaryDto> GetSummaryAsync(int userId, DateTime? asOfDate = null);
    Task<NetWorthComparisonDto> GetComparisonAsync(int userId, DateTime startDate, DateTime endDate, string groupBy = "month");
    Task<IEnumerable<NetWorthHistoryPointDto>> GetHistoryAsync(int userId, DateTime startDate, DateTime endDate, string groupBy = "month");
    Task<NetWorthProjectionDto> GetProjectionAsync(
        int userId,
        decimal? goalAmount = null,
        int projectionMonths = 12,
        bool includeRecurringTransfers = true,
        bool includeAverageExpenses = false,
        List<CustomProjectionItemDto>? customItems = null);
    Task<LiabilityPayoffEstimateDto> GetLiabilityPayoffEstimateAsync(
        int userId,
        List<LiabilityPayoffSettingsDto>? settings = null);
    Task<DateTime?> GetEarliestSnapshotDateAsync(int userId);
}
