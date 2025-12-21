using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SummaryController : ControllerBase
{
    private readonly ISummaryService _summaryService;

    public SummaryController(ISummaryService summaryService)
    {
        _summaryService = summaryService;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<DashboardSummaryDto>> GetSummary(int userId)
    {
        var summary = await _summaryService.GetDashboardSummaryAsync(userId);
        return Ok(summary);
    }

    [HttpGet("user/{userId}/year-over-year")]
    public async Task<ActionResult<YearOverYearComparisonDto>> GetYearOverYearComparison(
        int userId,
        [FromQuery] string mode = "month",
        [FromQuery] int? currentYear = null,
        [FromQuery] int? currentMonth = null,
        [FromQuery] int? previousYear = null,
        [FromQuery] int? previousMonth = null)
    {
        var request = new YearOverYearRequestDto
        {
            Mode = mode,
            CurrentYear = currentYear ?? DateTime.UtcNow.Year,
            CurrentMonth = currentMonth,
            PreviousYear = previousYear,
            PreviousMonth = previousMonth
        };

        var comparison = await _summaryService.GetYearOverYearComparisonAsync(userId, request);
        return Ok(comparison);
    }

    [HttpGet("user/{userId}/average-expenses")]
    public async Task<ActionResult<AverageExpensesResponseDto>> GetAverageExpenses(
        int userId,
        [FromQuery] string viewMode = "month",
        [FromQuery] string? years = null)
    {
        var yearsList = new List<int>();
        if (!string.IsNullOrWhiteSpace(years))
        {
            yearsList = years.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(y => int.TryParse(y.Trim(), out var parsed) ? parsed : (int?)null)
                .Where(y => y.HasValue)
                .Select(y => y!.Value)
                .ToList();
        }

        var request = new AverageExpensesRequestDto
        {
            ViewMode = viewMode,
            Years = yearsList
        };

        var averages = await _summaryService.GetAverageExpensesAsync(userId, request);
        return Ok(averages);
    }
}
