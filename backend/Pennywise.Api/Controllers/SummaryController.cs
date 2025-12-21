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
}
