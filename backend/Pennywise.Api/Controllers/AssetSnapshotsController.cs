using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Helpers;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetSnapshotsController : ControllerBase
{
    private readonly IAssetSnapshotService _snapshotService;
    private readonly IAssetSnapshotImportService _importService;

    public AssetSnapshotsController(
        IAssetSnapshotService snapshotService,
        IAssetSnapshotImportService importService)
    {
        _snapshotService = snapshotService;
        _importService = importService;
    }

    [HttpGet("asset/{assetId}")]
    public async Task<ActionResult<IEnumerable<AssetSnapshotDto>>> GetByAsset(
        int assetId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate)
    {
        var snapshots = await _snapshotService.GetByAssetAsync(
            assetId,
            startDate?.ToUtc(),
            endDate?.ToUtc());
        return Ok(snapshots);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<AssetSnapshotDto>> GetById(int id)
    {
        var snapshot = await _snapshotService.GetByIdAsync(id);
        if (snapshot == null)
            return NotFound();

        return Ok(snapshot);
    }

    [HttpGet("asset/{assetId}/latest")]
    public async Task<ActionResult<AssetSnapshotDto>> GetLatest(int assetId)
    {
        var snapshot = await _snapshotService.GetLatestByAssetAsync(assetId);
        if (snapshot == null)
            return NotFound();

        return Ok(snapshot);
    }

    [HttpGet("template")]
    public async Task<IActionResult> GetTemplate([FromQuery] string format = "csv", [FromQuery] int assetId = 0, [FromQuery] int userId = 0)
    {
        try
        {
            var template = await _importService.GenerateTemplateAsync(format, assetId, userId);
            Response.Headers["Content-Disposition"] = $"attachment; filename=\"{template.FileName}\"";
            return File(template.Content, template.ContentType);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to generate template.");
        }
    }

    [HttpPost("import")]
    [RequestFormLimits(MultipartBodyLengthLimit = 10 * 1024 * 1024)]
    public async Task<ActionResult<AssetSnapshotImportResponseDto>> ImportBalances(
        [FromForm] IFormFile file,
        [FromForm] int assetId,
        [FromForm] int userId,
        [FromForm] string duplicateStrategy = "skip",
        [FromForm] string? timezone = null,
        [FromForm] bool dryRun = true)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded.");
        }

        if (assetId <= 0)
        {
            return BadRequest("Invalid asset ID.");
        }

        if (userId <= 0)
        {
            return BadRequest("Invalid user ID.");
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _importService.ImportAsync(new AssetSnapshotImportRequest
            {
                FileStream = stream,
                FileName = file.FileName,
                AssetId = assetId,
                UserId = userId,
                DuplicateStrategy = duplicateStrategy,
                Timezone = timezone,
                DryRun = dryRun
            });

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to import balances. Please try again.");
        }
    }

    [HttpPost]
    public async Task<ActionResult<AssetSnapshotDto>> Create(CreateAssetSnapshotDto createDto)
    {
        var snapshot = await _snapshotService.CreateAsync(createDto);
        return CreatedAtAction(nameof(GetById), new { id = snapshot.Id }, snapshot);
    }

    [HttpPost("bulk")]
    public async Task<ActionResult<BulkCreateAssetSnapshotResultDto>> CreateBulk(BulkCreateAssetSnapshotDto bulkCreateDto)
    {
        if (bulkCreateDto.Entries.Count == 0)
        {
            return BadRequest("At least one entry is required.");
        }

        // Validate that all entries have valid dates
        var invalidEntries = bulkCreateDto.Entries.Where(e => e.Date == default).ToList();
        if (invalidEntries.Count > 0)
        {
            return BadRequest("All entries must have a valid date.");
        }

        var result = await _snapshotService.CreateBulkAsync(bulkCreateDto);
        return Ok(result);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<AssetSnapshotDto>> Update(int id, UpdateAssetSnapshotDto updateDto)
    {
        var snapshot = await _snapshotService.UpdateAsync(id, updateDto);
        if (snapshot == null)
            return NotFound();

        return Ok(snapshot);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var result = await _snapshotService.DeleteAsync(id);
        if (!result)
            return NotFound();

        return NoContent();
    }
}
