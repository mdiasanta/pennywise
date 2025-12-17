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

    public AssetSnapshotsController(IAssetSnapshotService snapshotService)
    {
        _snapshotService = snapshotService;
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
