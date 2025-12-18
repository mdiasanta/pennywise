using System.Globalization;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class ExpenseImportService : IExpenseImportService
{
    private const int MaxRows = 5000;
    private const long MaxFileBytes = 10 * 1024 * 1024; // 10 MB
    private static readonly string[] SupportedFormats = ["csv", "xlsx"];

    private readonly IExpenseRepository _expenseRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly IImportAuditService _importAuditService;

    public ExpenseImportService(
        IExpenseRepository expenseRepository,
        ICategoryRepository categoryRepository,
        IImportAuditService importAuditService)
    {
        _expenseRepository = expenseRepository;
        _categoryRepository = categoryRepository;
        _importAuditService = importAuditService;
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> GenerateTemplateAsync(string format, int userId)
    {
        var normalized = NormalizeFormat(format);
        var categories = (await _categoryRepository.GetAllAsync(userId)).Select(c => c.Name).ToList();
        var safeCategories = categories.Count == 0 ? new List<string> { "General" } : categories;
        var exampleCategory = safeCategories.First();

        if (normalized == "csv")
        {
            var csv = BuildCsvTemplate(exampleCategory);
            return (Encoding.UTF8.GetBytes(csv), "text/csv", "expenses-template.csv");
        }

        var xlsxBytes = BuildExcelTemplate(safeCategories, exampleCategory);
        return (xlsxBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "expenses-template.xlsx");
    }

    public async Task<ExpenseImportResponseDto> ImportAsync(ExpenseImportRequest request)
    {
        if (request.FileStream == null)
            throw new InvalidOperationException("No file content received.");

        var normalizedStrategy = NormalizeStrategy(request.DuplicateStrategy);
        var timeZone = ResolveTimeZone(request.Timezone);

        await using var buffer = new MemoryStream();
        await request.FileStream.CopyToAsync(buffer);
        if (buffer.Length == 0)
            throw new InvalidOperationException("No file content received.");

        if (buffer.Length > MaxFileBytes)
            throw new InvalidOperationException("File is too large. Please upload a file smaller than 10 MB.");

        buffer.Position = 0;

        var extension = Path.GetExtension(request.FileName)?.Trim('.').ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(extension) || !SupportedFormats.Contains(extension))
            throw new InvalidOperationException("Unsupported file type. Please upload a CSV or XLSX file.");

        var parsedRows = extension == "csv"
            ? ParseCsv(buffer)
            : ParseExcel(buffer);

        var categories = (await _categoryRepository.GetAllAsync(request.UserId))
            .ToDictionary(c => c.Name.Trim(), c => c, StringComparer.OrdinalIgnoreCase);
        if (categories.Count == 0)
        {
            throw new InvalidOperationException("No categories exist. Create at least one category before importing.");
        }

        var existingExpenses = await _expenseRepository.GetAllAsync(request.UserId);
        var existingKeys = new Dictionary<string, Expense>();
        foreach (var expense in existingExpenses)
        {
            var key = BuildKey(expense.Date, expense.Amount, expense.CategoryId, expense.Title);
            if (!existingKeys.ContainsKey(key))
            {
                existingKeys[key] = expense;
            }
        }

        var seenKeys = new HashSet<string>(existingKeys.Keys);
        var rows = new List<ExpenseImportRowResultDto>();

        int inserted = 0, updated = 0, skipped = 0, total = 0;

        foreach (var parsedRow in parsedRows)
        {
            if (rows.Count >= MaxRows)
            {
                rows.Add(new ExpenseImportRowResultDto
                {
                    RowNumber = parsedRow.RowNumber,
                    Status = "error",
                    Message = $"Row limit exceeded. Maximum allowed rows is {MaxRows}."
                });
                break;
            }

            var validation = ValidateRow(parsedRow, categories, timeZone);
            if (validation.Error != null)
            {
                rows.Add(new ExpenseImportRowResultDto
                {
                    RowNumber = parsedRow.RowNumber,
                    Status = "error",
                    Message = validation.Error
                });
                total++;
                continue;
            }

            var normalizedTitle = validation.Title.Trim();
            var key = BuildKey(validation.DateUtc, validation.Amount, validation.Category!.Id, normalizedTitle);

            if (seenKeys.Contains(key))
            {
                if (normalizedStrategy == "update" && existingKeys.TryGetValue(key, out var existingExpense))
                {
                    updated++;
                    rows.Add(new ExpenseImportRowResultDto
                    {
                        RowNumber = parsedRow.RowNumber,
                        Status = "updated",
                        Message = request.DryRun
                            ? "Would update existing expense"
                            : "Updated existing expense"
                    });

                    if (!request.DryRun)
                    {
                        existingExpense.Title = normalizedTitle;
                        existingExpense.Description = validation.Notes;
                        existingExpense.Amount = validation.Amount;
                        existingExpense.Date = validation.DateUtc;
                        existingExpense.CategoryId = validation.Category!.Id;
                        await _expenseRepository.UpdateAsync(existingExpense);
                    }
                }
                else
                {
                    skipped++;
                    rows.Add(new ExpenseImportRowResultDto
                    {
                        RowNumber = parsedRow.RowNumber,
                        Status = "skipped",
                        Message = "Duplicate detected. Skipped based on strategy."
                    });
                }

                total++;
                continue;
            }

            inserted++;
            rows.Add(new ExpenseImportRowResultDto
            {
                RowNumber = parsedRow.RowNumber,
                Status = request.DryRun ? "valid" : "inserted",
                Message = request.DryRun ? "Valid row" : "Inserted"
            });

            if (!request.DryRun)
            {
                var expense = new Expense
                {
                    Title = normalizedTitle,
                    Description = validation.Notes,
                    Amount = validation.Amount,
                    Date = validation.DateUtc,
                    UserId = request.UserId,
                    CategoryId = validation.Category!.Id
                };
                await _expenseRepository.CreateAsync(expense);
            }

            seenKeys.Add(key);
            total++;
        }

        var response = new ExpenseImportResponseDto
        {
            FileName = request.FileName,
            DryRun = request.DryRun,
            DuplicateStrategy = normalizedStrategy,
            Timezone = timeZone?.Id,
            TotalRows = total,
            Inserted = inserted,
            Updated = updated,
            Skipped = skipped,
            Rows = rows
        };

        if (!request.DryRun)
        {
            var errors = rows.Where(r => r.Status == "error").ToList();
            await _importAuditService.RecordAsync(new ImportAudit
            {
                UserId = request.UserId,
                FileName = request.FileName,
                Total = total,
                Inserted = inserted,
                Updated = updated,
                Skipped = skipped,
                DuplicateStrategy = normalizedStrategy,
                Timezone = timeZone?.Id,
                ExternalBatchId = request.ExternalBatchId,
                ErrorsJson = errors.Count > 0 ? JsonSerializer.Serialize(errors) : null
            });
        }

        return response;
    }

    private static string NormalizeFormat(string format)
    {
        var normalized = string.IsNullOrWhiteSpace(format)
            ? "csv"
            : format.Trim().ToLowerInvariant();

        if (!SupportedFormats.Contains(normalized))
            throw new InvalidOperationException("Unsupported format. Use csv or xlsx.");

        return normalized;
    }

    private static string NormalizeStrategy(string? strategy)
    {
        return string.Equals(strategy, "update", StringComparison.OrdinalIgnoreCase) ? "update" : "skip";
    }

    private static TimeZoneInfo? ResolveTimeZone(string? timeZoneId)
    {
        if (string.IsNullOrWhiteSpace(timeZoneId))
            return null;

        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            throw new InvalidOperationException($"Unknown time zone: {timeZoneId}");
        }
        catch (InvalidTimeZoneException)
        {
            throw new InvalidOperationException($"Unknown time zone: {timeZoneId}");
        }
    }

    private static string BuildCsvTemplate(string exampleCategory)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Date,Amount,Category,Description,Notes");
        builder.AppendLine(
            $"{DateTime.UtcNow:yyyy-MM-dd},42.50,\"{exampleCategory}\",\"Grocery run\",\"Weekly produce\"");
        builder.AppendLine(
            $"{DateTime.UtcNow.AddDays(-2):yyyy-MM-dd},18.00,\"{exampleCategory}\",\"Coffee with team\",\"\"");
        return builder.ToString();
    }

    private static byte[] BuildExcelTemplate(IReadOnlyCollection<string> categories, string exampleCategory)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Import");

        var headers = new[]
        {
            "Date",
            "Amount",
            "Category",
            "Description",
            "Notes"
        };

        for (var i = 0; i < headers.Length; i++)
        {
            sheet.Cell(1, i + 1).Value = headers[i];
        }

        sheet.Cell(2, 1).Value = DateTime.UtcNow.Date;
        sheet.Cell(2, 2).Value = 42.50;
        sheet.Cell(2, 3).Value = exampleCategory;
        sheet.Cell(2, 4).Value = "Grocery run";
        sheet.Cell(2, 5).Value = "Weekly produce";
        sheet.Cell(3, 1).Value = DateTime.UtcNow.AddDays(-2).Date;
        sheet.Cell(3, 2).Value = 18.00;
        sheet.Cell(3, 3).Value = exampleCategory;
        sheet.Cell(3, 4).Value = "Coffee with team";

        var categoriesSheet = workbook.Worksheets.Add("Categories");
        categoriesSheet.Cell(1, 1).Value = "Name";
        var row = 2;
        foreach (var category in categories)
        {
            categoriesSheet.Cell(row, 1).Value = category;
            row++;
        }

        var validationRange = "Categories!$A$2:$A$" + (row - 1);
        sheet.Range($"C2:C{MaxRows + 1}").CreateDataValidation().List($"={validationRange}", true);
        sheet.Columns().AdjustToContents();

        var instructions = workbook.Worksheets.Add("Instructions");
        instructions.Cell(1, 1).Value = "Expense Import Template";
        instructions.Cell(2, 1).Value = "Required columns: Date (yyyy-MM-dd), Amount (> 0), Category (must match existing), Description.";
        instructions.Cell(3, 1).Value = "Optional columns: Notes.";
        instructions.Cell(4, 1).Value = "Use Categories sheet dropdown for valid categories.";

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    private static string BuildKey(DateTime dateUtc, decimal amount, int categoryId, string title)
    {
        return $"{dateUtc:O}|{Math.Round(amount, 2)}|{categoryId}|{title.Trim().ToLowerInvariant()}";
    }

    private static IEnumerable<ParsedRow> ParseCsv(Stream stream)
    {
        stream.Position = 0;
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        var headerLine = reader.ReadLine();
        if (string.IsNullOrWhiteSpace(headerLine))
            yield break;

        var headers = SplitCsvLine(headerLine);
        var rowNumber = 1;
        while (!reader.EndOfStream)
        {
            var line = reader.ReadLine();
            rowNumber++;
            if (line == null || string.IsNullOrWhiteSpace(line))
                continue;

            var values = SplitCsvLine(line);
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < headers.Count && i < values.Count; i++)
            {
                map[headers[i]] = values[i];
            }

            if (map.Values.All(string.IsNullOrWhiteSpace))
                continue;

            yield return new ParsedRow(rowNumber, map);
        }
    }

    private static IEnumerable<ParsedRow> ParseExcel(Stream stream)
    {
        stream.Position = 0;
        using var workbook = new XLWorkbook(stream);
        var worksheet = workbook.Worksheet("Import") ?? workbook.Worksheets.FirstOrDefault();
        if (worksheet == null)
            throw new InvalidOperationException("The Excel file does not contain a worksheet named 'Import'.");
        var headerRow = worksheet.Row(1);
        var headers = new List<string>();
        var column = 1;
        while (!headerRow.Cell(column).IsEmpty())
        {
            headers.Add(headerRow.Cell(column).GetString());
            column++;
        }

        var rowNumber = 2;
        while (!worksheet.Row(rowNumber).IsEmpty())
        {
            var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (var i = 0; i < headers.Count; i++)
            {
                map[headers[i]] = worksheet.Row(rowNumber).Cell(i + 1).GetString();
            }

            if (map.Values.All(string.IsNullOrWhiteSpace))
            {
                rowNumber++;
                continue;
            }

            yield return new ParsedRow(rowNumber, map);
            rowNumber++;
        }
    }

    private static List<string> SplitCsvLine(string line)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        var insideQuotes = false;

        for (var i = 0; i < line.Length; i++)
        {
            var ch = line[i];
            if (ch == '"')
            {
                if (insideQuotes && i + 1 < line.Length && line[i + 1] == '"')
                {
                    current.Append('"');
                    i++;
                    continue;
                }
                insideQuotes = !insideQuotes;
                continue;
            }

            if (ch == ',' && !insideQuotes)
            {
                result.Add(current.ToString().Trim());
                current.Clear();
            }
            else
            {
                current.Append(ch);
            }
        }

        result.Add(current.ToString().Trim());
        return result.Select(value => value.Replace("\"\"", "\"").Trim()).ToList();
    }

    private static (DateTime DateUtc, decimal Amount, Category? Category, string Title, string? Notes, string? Error) ValidateRow(
        ParsedRow row,
        Dictionary<string, Category> categories,
        TimeZoneInfo? timeZone)
    {
        var missingFields = new List<string>();

        if (!row.Values.TryGetValue("Date", out var dateValue) || string.IsNullOrWhiteSpace(dateValue))
            missingFields.Add("Date");
        if (!row.Values.TryGetValue("Amount", out var amountValue) || string.IsNullOrWhiteSpace(amountValue))
            missingFields.Add("Amount");
        if (!row.Values.TryGetValue("Category", out var categoryValue) || string.IsNullOrWhiteSpace(categoryValue))
            missingFields.Add("Category");

        var title = row.Values.GetValueOrDefault("Description") ?? row.Values.GetValueOrDefault("Title") ?? string.Empty;
        if (string.IsNullOrWhiteSpace(title))
            missingFields.Add("Description");

        if (missingFields.Count > 0)
        {
            return (default, default, null, string.Empty, null, $"Missing required fields: {string.Join(", ", missingFields)}");
        }

        if (!DateTime.TryParse(dateValue, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        {
            return (default, default, null, string.Empty, null, "Invalid date format. Use yyyy-MM-dd.");
        }

        var normalizedDate = DateTime.SpecifyKind(parsedDate, DateTimeKind.Unspecified);
        var dateUtc = timeZone != null
            ? TimeZoneInfo.ConvertTimeToUtc(normalizedDate, timeZone)
            : DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);

        if (!decimal.TryParse(amountValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var amount) || amount <= 0)
        {
            return (default, default, null, string.Empty, null, "Amount must be a positive number.");
        }

        if (!categories.TryGetValue(categoryValue.Trim(), out var category) || category == null)
        {
            return (default, default, null, string.Empty, null, $"Category '{categoryValue}' does not exist. Please use an existing category.");
        }

        var notes = row.Values.TryGetValue("Notes", out var noteVal) ? noteVal : null;
        return (dateUtc, decimal.Round(amount, 2), category, title.Trim(), string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(), null);
    }

    private sealed record ParsedRow(int RowNumber, Dictionary<string, string> Values);
}
