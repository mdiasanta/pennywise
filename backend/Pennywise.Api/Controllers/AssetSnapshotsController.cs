using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Helpers;
using Pennywise.Api.Repositories;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AssetSnapshotsController : ControllerBase
{
    private readonly IAssetSnapshotService _snapshotService;
    private readonly IAssetSnapshotImportService _importService;
    private readonly IAssetSnapshotRepository _snapshotRepository;

    public AssetSnapshotsController(
        IAssetSnapshotService snapshotService,
        IAssetSnapshotImportService importService,
        IAssetSnapshotRepository snapshotRepository)
    {
        _snapshotService = snapshotService;
        _importService = importService;
        _snapshotRepository = snapshotRepository;
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

    [HttpGet("export")]
    public async Task<IActionResult> Export(
        [FromQuery] int userId,
        [FromQuery] int? assetId = null,
        [FromQuery] string format = "csv",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            if (userId <= 0)
            {
                return BadRequest("Invalid user ID.");
            }

            var normalizedFormat = string.IsNullOrWhiteSpace(format)
                ? "csv"
                : format.Trim().ToLowerInvariant();

            if (normalizedFormat != "csv" && normalizedFormat != "xlsx")
            {
                return BadRequest("Unsupported format. Use csv or xlsx.");
            }

            var normalizedStart = startDate?.ToUtc();
            var normalizedEnd = endDate?.ToUtc();

            var filePrefix = assetId.HasValue ? $"account-{assetId}-balances" : "all-accounts-balances";
            var fileName = $"{filePrefix}-{DateTime.UtcNow:yyyyMMddHHmmss}.{normalizedFormat}";
            Response.Headers["Content-Disposition"] = $"attachment; filename=\"{fileName}\"";

            if (normalizedFormat == "csv")
            {
                Response.ContentType = "text/csv";
                await WriteCsvAsync(userId, assetId, normalizedStart, normalizedEnd);
            }
            else
            {
                Response.ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                await WriteExcelAsync(userId, assetId, normalizedStart, normalizedEnd);
            }

            return new EmptyResult();
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to export balances. Please try again.");
        }
    }

    private async Task WriteCsvAsync(int userId, int? assetId, DateTime? startDate, DateTime? endDate)
    {
        var encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
        await using var writer = new StreamWriter(Response.Body, encoding, leaveOpen: true);
        await writer.WriteLineAsync("Date,Account,Category,Type,Balance,Notes,CreatedAt,UpdatedAt");

        var snapshots = assetId.HasValue
            ? _snapshotRepository.StreamByAssetAsync(assetId.Value, startDate, endDate)
            : _snapshotRepository.StreamByUserAsync(userId, startDate, endDate);

        await foreach (var snapshot in snapshots)
        {
            var assetType = snapshot.Asset?.AssetCategory?.IsLiability == true ? "Liability" : "Asset";
            var row = string.Join(",", new[]
            {
                EscapeCsv(snapshot.Date.ToString("o", CultureInfo.InvariantCulture)),
                EscapeCsv(snapshot.Asset?.Name ?? string.Empty),
                EscapeCsv(snapshot.Asset?.AssetCategory?.Name ?? string.Empty),
                EscapeCsv(assetType),
                EscapeCsv(snapshot.Balance.ToString(CultureInfo.InvariantCulture)),
                EscapeCsv(snapshot.Notes ?? string.Empty),
                EscapeCsv(snapshot.CreatedAt.ToString("o", CultureInfo.InvariantCulture)),
                EscapeCsv(snapshot.UpdatedAt.ToString("o", CultureInfo.InvariantCulture))
            });

            await writer.WriteLineAsync(row);
        }

        await writer.FlushAsync();
    }

    private async Task WriteExcelAsync(int userId, int? assetId, DateTime? startDate, DateTime? endDate)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Balances");

        var headers = new[] { "Date", "Account", "Category", "Type", "Balance", "Notes", "CreatedAt", "UpdatedAt" };
        for (var i = 0; i < headers.Length; i++)
        {
            worksheet.Cell(1, i + 1).Value = headers[i];
        }

        var snapshots = assetId.HasValue
            ? _snapshotRepository.StreamByAssetAsync(assetId.Value, startDate, endDate)
            : _snapshotRepository.StreamByUserAsync(userId, startDate, endDate);

        var rowNumber = 2;
        await foreach (var snapshot in snapshots)
        {
            var assetType = snapshot.Asset?.AssetCategory?.IsLiability == true ? "Liability" : "Asset";
            worksheet.Cell(rowNumber, 1).Value = snapshot.Date;
            worksheet.Cell(rowNumber, 2).Value = snapshot.Asset?.Name ?? string.Empty;
            worksheet.Cell(rowNumber, 3).Value = snapshot.Asset?.AssetCategory?.Name ?? string.Empty;
            worksheet.Cell(rowNumber, 4).Value = assetType;
            worksheet.Cell(rowNumber, 5).Value = snapshot.Balance;
            worksheet.Cell(rowNumber, 6).Value = snapshot.Notes ?? string.Empty;
            worksheet.Cell(rowNumber, 7).Value = snapshot.CreatedAt;
            worksheet.Cell(rowNumber, 8).Value = snapshot.UpdatedAt;
            rowNumber++;
        }

        worksheet.Columns().AdjustToContents();

        await using var tempStream = new MemoryStream();
        workbook.SaveAs(tempStream);
        tempStream.Position = 0;
        await tempStream.CopyToAsync(Response.Body);
        await Response.Body.FlushAsync();
    }

    private static string EscapeCsv(string value)
    {
        var needsQuotes = value.Contains(',') || value.Contains('"') || value.Contains('\n') || value.Contains('\r');
        if (needsQuotes)
        {
            return $"\"{value.Replace("\"", "\"\"")}\"";
        }
        return value;
    }
}
