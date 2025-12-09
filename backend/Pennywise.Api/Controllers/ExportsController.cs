using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ExportsController : ControllerBase
{
    private readonly IExportAuditService _exportAuditService;

    public ExportsController(IExportAuditService exportAuditService)
    {
        _exportAuditService = exportAuditService;
    }

    [HttpGet("audit")]
    public async Task<ActionResult<IEnumerable<ExportAuditDto>>> GetAudit([FromQuery] int? userId)
    {
        var audits = await _exportAuditService.GetRecentAsync(userId);
        return Ok(audits);
    }
}
