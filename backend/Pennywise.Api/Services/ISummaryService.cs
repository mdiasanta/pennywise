using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface ISummaryService
{
    Task<DashboardSummaryDto> GetDashboardSummaryAsync(int userId);
    Task<YearOverYearComparisonDto> GetYearOverYearComparisonAsync(int userId, YearOverYearRequestDto request);
    Task<AverageExpensesResponseDto> GetAverageExpensesAsync(int userId, AverageExpensesRequestDto request);
}
