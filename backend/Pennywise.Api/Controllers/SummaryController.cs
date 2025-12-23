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
        [FromQuery] int? previousMonth = null,
        [FromQuery] string? includedTagIds = null,
        [FromQuery] string? excludedTagIds = null)
    {
        var request = new YearOverYearRequestDto
        {
            Mode = mode,
            CurrentYear = currentYear ?? DateTime.UtcNow.Year,
            CurrentMonth = currentMonth,
            PreviousYear = previousYear,
            PreviousMonth = previousMonth,
            IncludedTagIds = ParseTagIds(includedTagIds),
            ExcludedTagIds = ParseTagIds(excludedTagIds)
        };

        var comparison = await _summaryService.GetYearOverYearComparisonAsync(userId, request);
        return Ok(comparison);
    }

    [HttpGet("user/{userId}/average-expenses")]
    public async Task<ActionResult<AverageExpensesResponseDto>> GetAverageExpenses(
        int userId,
        [FromQuery] string viewMode = "month",
        [FromQuery] string? years = null,
        [FromQuery] string? includedTagIds = null,
        [FromQuery] string? excludedTagIds = null)
    {
        var yearsList = new List<int>();
        var invalidYears = new List<string>();

        if (!string.IsNullOrWhiteSpace(years))
        {
            var yearParts = years.Split(',', StringSplitOptions.RemoveEmptyEntries);
            foreach (var yearPart in yearParts)
            {
                var trimmed = yearPart.Trim();
                if (int.TryParse(trimmed, out var parsed))
                {
                    yearsList.Add(parsed);
                }
                else
                {
                    invalidYears.Add(trimmed);
                }
            }
        }

        if (invalidYears.Count > 0)
        {
            return BadRequest($"Invalid year values: {string.Join(", ", invalidYears)}");
        }

        var request = new AverageExpensesRequestDto
        {
            ViewMode = viewMode,
            Years = yearsList,
            IncludedTagIds = ParseTagIds(includedTagIds),
            ExcludedTagIds = ParseTagIds(excludedTagIds)
        };

        var averages = await _summaryService.GetAverageExpensesAsync(userId, request);
        return Ok(averages);
    }

    /// <summary>
    /// Parse comma-separated tag IDs string into a list of integers
    /// </summary>
    private static List<int>? ParseTagIds(string? tagIds)
    {
        if (string.IsNullOrWhiteSpace(tagIds))
        {
            return null;
        }

        var result = new List<int>();
        var parts = tagIds.Split(',', StringSplitOptions.RemoveEmptyEntries);
        foreach (var part in parts)
        {
            if (int.TryParse(part.Trim(), out var tagId))
            {
                result.Add(tagId);
            }
        }

        return result.Count > 0 ? result : null;
    }
}
