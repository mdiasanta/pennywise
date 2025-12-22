using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CapitalOneController : ControllerBase
{
    private readonly ICapitalOneImportService _capitalOneImportService;
    private const long MaxFileBytes = 10 * 1024 * 1024; // 10 MB

    public CapitalOneController(ICapitalOneImportService capitalOneImportService)
    {
        _capitalOneImportService = capitalOneImportService;
    }

    private int? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    /// <summary>
    /// Previews expenses that would be imported from a Capital One CSV (dry run)
    /// </summary>
    [HttpPost("preview")]
    [RequestSizeLimit(MaxFileBytes)]
    public async Task<ActionResult<CapitalOneImportResponseDto>> PreviewImport(
        IFormFile file,
        [FromForm] string cardType)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        if (file == null || file.Length == 0)
            return BadRequest("No file provided");

        if (file.Length > MaxFileBytes)
            return BadRequest("File is too large. Please upload a file smaller than 10 MB.");

        var extension = Path.GetExtension(file.FileName)?.Trim('.').ToLowerInvariant();
        if (extension != "csv")
            return BadRequest("Only CSV files are supported");

        if (!Enum.TryParse<CapitalOneCardType>(cardType, true, out var parsedCardType))
            return BadRequest("Invalid card type. Must be 'QuickSilver' or 'VentureX'");

        try
        {
            await using var stream = file.OpenReadStream();
            var request = new CapitalOneImportRequest
            {
                CardType = parsedCardType,
                UserId = userId.Value,
                DryRun = true
            };

            var result = await _capitalOneImportService.ImportAsync(stream, file.FileName, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                "Failed to preview Capital One import. Please try again.");
        }
    }

    /// <summary>
    /// Imports expenses from a Capital One CSV
    /// </summary>
    [HttpPost("import")]
    [RequestSizeLimit(MaxFileBytes)]
    public async Task<ActionResult<CapitalOneImportResponseDto>> ImportExpenses(
        IFormFile file,
        [FromForm] string cardType,
        [FromForm] string? selectedRowNumbers,
        [FromForm] string? categoryOverrides)
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        if (file == null || file.Length == 0)
            return BadRequest("No file provided");

        if (file.Length > MaxFileBytes)
            return BadRequest("File is too large. Please upload a file smaller than 10 MB.");

        var extension = Path.GetExtension(file.FileName)?.Trim('.').ToLowerInvariant();
        if (extension != "csv")
            return BadRequest("Only CSV files are supported");

        if (!Enum.TryParse<CapitalOneCardType>(cardType, true, out var parsedCardType))
            return BadRequest("Invalid card type. Must be 'QuickSilver' or 'VentureX'");

        // Parse selected row numbers
        List<int>? parsedRowNumbers = null;
        if (!string.IsNullOrWhiteSpace(selectedRowNumbers))
        {
            try
            {
                parsedRowNumbers = selectedRowNumbers
                    .Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(int.Parse)
                    .ToList();
            }
            catch
            {
                return BadRequest("Invalid format for selectedRowNumbers");
            }
        }

        // Parse category overrides
        List<CapitalOneExpenseCategoryOverrideDto>? parsedOverrides = null;
        if (!string.IsNullOrWhiteSpace(categoryOverrides))
        {
            try
            {
                parsedOverrides = System.Text.Json.JsonSerializer.Deserialize<List<CapitalOneExpenseCategoryOverrideDto>>(
                    categoryOverrides,
                    new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }
            catch
            {
                return BadRequest("Invalid format for categoryOverrides");
            }
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var request = new CapitalOneImportRequest
            {
                CardType = parsedCardType,
                UserId = userId.Value,
                DryRun = false,
                SelectedRowNumbers = parsedRowNumbers,
                CategoryOverrides = parsedOverrides
            };

            var result = await _capitalOneImportService.ImportAsync(stream, file.FileName, request);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError,
                "Failed to import from Capital One. Please try again.");
        }
    }
}
