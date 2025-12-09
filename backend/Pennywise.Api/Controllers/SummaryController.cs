using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
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
}
