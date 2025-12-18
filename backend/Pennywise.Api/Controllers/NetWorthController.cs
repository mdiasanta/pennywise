using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Helpers;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class NetWorthController : ControllerBase
{
    private readonly INetWorthService _netWorthService;

    public NetWorthController(INetWorthService netWorthService)
    {
        _netWorthService = netWorthService;
    }

    [HttpGet("user/{userId}/summary")]
    public async Task<ActionResult<NetWorthSummaryDto>> GetSummary(
        int userId,
        [FromQuery] DateTime? asOfDate)
    {
        var summary = await _netWorthService.GetSummaryAsync(userId, asOfDate?.ToUtc());
        return Ok(summary);
    }

    [HttpGet("user/{userId}/history")]
    public async Task<ActionResult<IEnumerable<NetWorthHistoryPointDto>>> GetHistory(
        int userId,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string groupBy = "month")
    {
        var history = await _netWorthService.GetHistoryAsync(
            userId,
            startDate.ToUtc(),
            endDate.ToUtc(),
            groupBy);
        return Ok(history);
    }

    [HttpGet("user/{userId}/comparison")]
    public async Task<ActionResult<NetWorthComparisonDto>> GetComparison(
        int userId,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string groupBy = "month")
    {
        var comparison = await _netWorthService.GetComparisonAsync(
            userId,
            startDate.ToUtc(),
            endDate.ToUtc(),
            groupBy);
        return Ok(comparison);
    }

    [HttpGet("user/{userId}/projection")]
    public async Task<ActionResult<NetWorthProjectionDto>> GetProjection(
        int userId,
        [FromQuery] decimal? goalAmount = null,
        [FromQuery] int projectionMonths = 12,
        [FromQuery] bool includeRecurringTransfers = true,
        [FromQuery] bool includeAverageExpenses = false)
    {
        if (projectionMonths < 1 || projectionMonths > 120)
        {
            return BadRequest("projectionMonths must be between 1 and 120.");
        }
        var projection = await _netWorthService.GetProjectionAsync(userId, goalAmount, projectionMonths, includeRecurringTransfers, includeAverageExpenses);
        return Ok(projection);
    }

    [HttpPost("user/{userId}/projection")]
    public async Task<ActionResult<NetWorthProjectionDto>> GetProjectionWithCustomItems(
        int userId,
        [FromQuery] decimal? goalAmount = null,
        [FromQuery] int projectionMonths = 12,
        [FromQuery] bool includeRecurringTransfers = true,
        [FromQuery] bool includeAverageExpenses = false,
        [FromBody] List<CustomProjectionItemDto>? customItems = null)
    {
        if (projectionMonths < 1 || projectionMonths > 120)
        {
            return BadRequest("projectionMonths must be between 1 and 120.");
        }
        var projection = await _netWorthService.GetProjectionAsync(userId, goalAmount, projectionMonths, includeRecurringTransfers, includeAverageExpenses, customItems);
        return Ok(projection);
    }

    [HttpGet("user/{userId}/liability-payoff")]
    public async Task<ActionResult<LiabilityPayoffEstimateDto>> GetLiabilityPayoff(int userId)
    {
        var estimate = await _netWorthService.GetLiabilityPayoffEstimateAsync(userId);
        return Ok(estimate);
    }

    [HttpPost("user/{userId}/liability-payoff")]
    public async Task<ActionResult<LiabilityPayoffEstimateDto>> GetLiabilityPayoffWithSettings(
        int userId,
        [FromBody] List<LiabilityPayoffSettingsDto>? settings = null)
    {
        var estimate = await _netWorthService.GetLiabilityPayoffEstimateAsync(userId, settings);
        return Ok(estimate);
    }
}
