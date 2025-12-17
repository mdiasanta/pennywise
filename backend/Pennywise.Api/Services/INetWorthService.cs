using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface INetWorthService
{
    Task<NetWorthSummaryDto> GetSummaryAsync(int userId, DateTime? asOfDate = null);
    Task<NetWorthComparisonDto> GetComparisonAsync(int userId, DateTime startDate, DateTime endDate, string groupBy = "month");
    Task<IEnumerable<NetWorthHistoryPointDto>> GetHistoryAsync(int userId, DateTime startDate, DateTime endDate, string groupBy = "month");
    Task<NetWorthProjectionDto> GetProjectionAsync(int userId, decimal? goalAmount = null, int projectionMonths = 12);
}
