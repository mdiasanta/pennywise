using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Pennywise.Api.DTOs;
using Pennywise.Api.Helpers;
using Pennywise.Api.Services;

namespace Pennywise.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly IExpenseService _expenseService;
    private readonly IExportAuditService _exportAuditService;
    private readonly IExpenseImportService _expenseImportService;

    public ExpensesController(
        IExpenseService expenseService,
        IExportAuditService exportAuditService,
        IExpenseImportService expenseImportService)
    {
        _expenseService = expenseService;
        _exportAuditService = exportAuditService;
        _expenseImportService = expenseImportService;
    }

    private int? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (int.TryParse(userIdClaim, out var userId))
            return userId;
        return null;
    }

    [HttpGet("user/{userId}")]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpenses(
        int userId,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] int? categoryId,
        [FromQuery] string? search,
        [FromQuery] string? tagIds)
    {
        IEnumerable<int>? parsedTagIds = null;
        if (!string.IsNullOrWhiteSpace(tagIds))
        {
            parsedTagIds = tagIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(id => int.TryParse(id.Trim(), out var parsed) ? parsed : (int?)null)
                .Where(id => id.HasValue)
                .Select(id => id!.Value)
                .ToList();
        }

        var expenses = await _expenseService.GetAllExpensesAsync(
            userId,
            startDate?.ToUtc(),
            endDate?.ToUtc(),
            categoryId,
            search,
            parsedTagIds);
        return Ok(expenses);
    }

    [HttpGet("template")]
    public async Task<IActionResult> GetTemplate([FromQuery] string format = "csv")
    {
        var userId = GetUserId();
        if (userId == null)
            return Unauthorized();

        try
        {
            var template = await _expenseImportService.GenerateTemplateAsync(format, userId.Value);
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
    public async Task<ActionResult<ExpenseImportResponseDto>> ImportExpenses(
        [FromForm] IFormFile file,
        [FromForm] int userId,
        [FromForm] string duplicateStrategy = "skip",
        [FromForm] string? timezone = null,
        [FromForm] bool dryRun = true,
        [FromForm] string? externalBatchId = null)
    {
        if (file == null || file.Length == 0)
        {
            return BadRequest("No file uploaded.");
        }

        if (userId <= 0)
        {
            return BadRequest("Invalid user ID.");
        }

        try
        {
            await using var stream = file.OpenReadStream();
            var result = await _expenseImportService.ImportAsync(new ExpenseImportRequest
            {
                FileStream = stream,
                FileName = file.FileName,
                UserId = userId,
                DuplicateStrategy = duplicateStrategy,
                Timezone = timezone,
                DryRun = dryRun,
                ExternalBatchId = externalBatchId
            });

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to import expenses. Please try again.");
        }
    }

    [HttpGet("export")]
    public async Task<IActionResult> ExportExpenses(
        [FromQuery] int userId,
        [FromQuery] string format = "csv",
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int? categoryId = null,
        [FromQuery] string? search = null,
        [FromQuery] string? tagIds = null)
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

            IEnumerable<int>? parsedTagIds = null;
            if (!string.IsNullOrWhiteSpace(tagIds))
            {
                parsedTagIds = tagIds.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(id => int.TryParse(id.Trim(), out var parsed) ? parsed : (int?)null)
                    .Where(id => id.HasValue)
                    .Select(id => id!.Value)
                    .ToList();
            }

            var filterParams = JsonSerializer.Serialize(new
            {
                startDate = normalizedStart,
                endDate = normalizedEnd,
                categoryId,
                search,
                tagIds = parsedTagIds
            });

            var fileName = $"expenses-{DateTime.UtcNow:yyyyMMddHHmmss}.{normalizedFormat}";
            Response.Headers["Content-Disposition"] = $"attachment; filename=\"{fileName}\"";

            if (normalizedFormat == "csv")
            {
                Response.ContentType = "text/csv";
                await WriteCsvAsync(userId, normalizedStart, normalizedEnd, categoryId, search, parsedTagIds, filterParams);
            }
            else
            {
                Response.ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
                await WriteExcelAsync(userId, normalizedStart, normalizedEnd, categoryId, search, parsedTagIds, filterParams);
            }

            return new EmptyResult();
        }
        catch (Exception)
        {
            return StatusCode(StatusCodes.Status500InternalServerError, "Failed to export expenses. Please try again.");
        }
    }

    [HttpGet("{id}/user/{userId}")]
    public async Task<ActionResult<ExpenseDto>> GetExpense(int id, int userId)
    {
        var expense = await _expenseService.GetExpenseByIdAsync(id, userId);
        if (expense == null)
            return NotFound();

        return Ok(expense);
    }

    [HttpGet("user/{userId}/daterange")]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpensesByDateRange(
        int userId,
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        var expenses = await _expenseService.GetExpensesByDateRangeAsync(
            userId,
            startDate.ToUtc(),
            endDate.ToUtc());
        return Ok(expenses);
    }

    [HttpGet("user/{userId}/category/{categoryId}")]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetExpensesByCategory(
        int userId,
        int categoryId)
    {
        var expenses = await _expenseService.GetExpensesByCategoryAsync(userId, categoryId);
        return Ok(expenses);
    }

    [HttpGet("user/{userId}/earliest-date")]
    public async Task<ActionResult<DateTime?>> GetEarliestDate(int userId)
    {
        var date = await _expenseService.GetEarliestDateByUserAsync(userId);
        return Ok(date);
    }

    [HttpPost]
    public async Task<ActionResult<ExpenseDto>> CreateExpense(CreateExpenseDto createDto)
    {
        var expense = await _expenseService.CreateExpenseAsync(createDto);
        return CreatedAtAction(
            nameof(GetExpense),
            new { id = expense.Id, userId = expense.UserId },
            expense);
    }

    [HttpPut("{id}/user/{userId}")]
    public async Task<ActionResult<ExpenseDto>> UpdateExpense(
        int id,
        int userId,
        UpdateExpenseDto updateDto)
    {
        var expense = await _expenseService.UpdateExpenseAsync(id, userId, updateDto);
        if (expense == null)
            return NotFound();

        return Ok(expense);
    }

    [HttpDelete("{id}/user/{userId}")]
    public async Task<IActionResult> DeleteExpense(int id, int userId)
    {
        var result = await _expenseService.DeleteExpenseAsync(id, userId);
        if (!result)
            return NotFound();

        return NoContent();
    }

    private async Task WriteCsvAsync(
        int userId,
        DateTime? startDate,
        DateTime? endDate,
        int? categoryId,
        string? search,
        IEnumerable<int>? tagIds,
        string filterParams)
    {
        // Use UTF-8 without BOM for better compatibility with spreadsheet tools.
        var encoding = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false);
        await using var writer = new StreamWriter(Response.Body, encoding, leaveOpen: true);
        await writer.WriteLineAsync("Date,Title,Category,Description,Amount,Tags,CreatedAt,UpdatedAt,UserId");

        var rowCount = 0;
        await foreach (var expense in _expenseService.StreamExpensesAsync(userId, startDate, endDate, categoryId, search, tagIds))
        {
            var tagsValue = expense.ExpenseTags != null && expense.ExpenseTags.Any()
                ? string.Join(";", expense.ExpenseTags.Select(et => et.Tag.Name))
                : string.Empty;

            var row = string.Join(",", new[]
            {
                EscapeCsv(expense.Date.ToString("o", CultureInfo.InvariantCulture)),
                EscapeCsv(expense.Title),
                EscapeCsv(expense.Category?.Name ?? string.Empty),
                EscapeCsv(expense.Description ?? string.Empty),
                EscapeCsv(expense.Amount.ToString(CultureInfo.InvariantCulture)),
                EscapeCsv(tagsValue),
                EscapeCsv(expense.CreatedAt.ToString("o", CultureInfo.InvariantCulture)),
                EscapeCsv(expense.UpdatedAt.ToString("o", CultureInfo.InvariantCulture)),
                EscapeCsv(expense.UserId.ToString(CultureInfo.InvariantCulture))
            });

            await writer.WriteLineAsync(row);
            rowCount++;
        }

        await writer.FlushAsync();

        try
        {
            await _exportAuditService.RecordAsync(userId, "csv", filterParams, rowCount, GetClientIp());
        }
        catch (Exception)
        {
            // Log the error but don't fail the export
            // _logger.LogError(ex, "Failed to record export audit for user {UserId}", userId);
        }
    }

    private async Task WriteExcelAsync(
        int userId,
        DateTime? startDate,
        DateTime? endDate,
        int? categoryId,
        string? search,
        IEnumerable<int>? tagIds,
        string filterParams)
    {
        using var workbook = new XLWorkbook();
        var worksheet = workbook.Worksheets.Add("Expenses");

        var headers = new[]
        {
            "Date",
            "Title",
            "Category",
            "Description",
            "Amount",
            "Tags",
            "CreatedAt",
            "UpdatedAt",
            "UserId"
        };

        for (var i = 0; i < headers.Length; i++)
        {
            worksheet.Cell(1, i + 1).Value = headers[i];
        }

        var rowNumber = 2;
        var rowCount = 0;
        await foreach (var expense in _expenseService.StreamExpensesAsync(userId, startDate, endDate, categoryId, search, tagIds))
        {
            var tagsValue = expense.ExpenseTags != null && expense.ExpenseTags.Any()
                ? string.Join(";", expense.ExpenseTags.Select(et => et.Tag.Name))
                : string.Empty;

            worksheet.Cell(rowNumber, 1).Value = expense.Date;
            worksheet.Cell(rowNumber, 2).Value = expense.Title;
            worksheet.Cell(rowNumber, 3).Value = expense.Category?.Name ?? string.Empty;
            worksheet.Cell(rowNumber, 4).Value = expense.Description ?? string.Empty;
            worksheet.Cell(rowNumber, 5).Value = expense.Amount;
            worksheet.Cell(rowNumber, 6).Value = tagsValue;
            worksheet.Cell(rowNumber, 7).Value = expense.CreatedAt;
            worksheet.Cell(rowNumber, 8).Value = expense.UpdatedAt;
            worksheet.Cell(rowNumber, 9).Value = expense.UserId;
            rowNumber++;
            rowCount++;
        }

        worksheet.Columns().AdjustToContents();

        await using var tempStream = new MemoryStream();
        workbook.SaveAs(tempStream);
        tempStream.Position = 0;
        await tempStream.CopyToAsync(Response.Body);
        await Response.Body.FlushAsync();

        try
        {
            await _exportAuditService.RecordAsync(userId, "xlsx", filterParams, rowCount, GetClientIp());
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Failed to record export audit log: {ex}");
        }
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

    private string? GetClientIp()
    {
        var forwarded = Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(forwarded))
        {
            return forwarded.Split(',')[0].Trim();
        }

        return HttpContext.Connection.RemoteIpAddress?.ToString();
    }
}
