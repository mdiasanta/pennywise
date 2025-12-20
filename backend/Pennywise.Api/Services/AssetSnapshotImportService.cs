using System.Globalization;
using System.Text;
using ClosedXML.Excel;
using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class AssetSnapshotImportService : IAssetSnapshotImportService
{
    private const int MaxRows = 5000;
    private const long MaxFileBytes = 10 * 1024 * 1024; // 10 MB
    private static readonly string[] SupportedFormats = ["csv", "xlsx"];

    private readonly IAssetSnapshotRepository _snapshotRepository;
    private readonly IAssetRepository _assetRepository;

    public AssetSnapshotImportService(
        IAssetSnapshotRepository snapshotRepository,
        IAssetRepository assetRepository)
    {
        _snapshotRepository = snapshotRepository;
        _assetRepository = assetRepository;
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> GenerateTemplateAsync(string format, int assetId, int userId)
    {
        var normalized = NormalizeFormat(format);
        var asset = assetId > 0 ? await _assetRepository.GetByIdAsync(assetId, userId) : null;
        var assetName = asset?.Name ?? "Account";

        if (normalized == "csv")
        {
            var csv = BuildCsvTemplate(assetName);
            return (Encoding.UTF8.GetBytes(csv), "text/csv", "balances-template.csv");
        }

        var xlsxBytes = BuildExcelTemplate(assetName);
        return (xlsxBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "balances-template.xlsx");
    }

    public async Task<AssetSnapshotImportResponseDto> ImportAsync(AssetSnapshotImportRequest request)
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

        // Verify asset exists
        var asset = await _assetRepository.GetByIdAsync(request.AssetId, request.UserId);
        if (asset == null)
            throw new InvalidOperationException("Asset not found.");

        var parsedRows = extension == "csv"
            ? ParseCsv(buffer)
            : ParseExcel(buffer);

        // Get existing snapshots for duplicate detection
        var existingSnapshots = await _snapshotRepository.GetByAssetAsync(request.AssetId);
        var existingByDate = existingSnapshots.ToDictionary(s => s.Date.Date, s => s);

        var seenDates = new HashSet<DateTime>(existingByDate.Keys);
        var rows = new List<AssetSnapshotImportRowResultDto>();

        // Cache the strategy check outside the loop for better performance
        var shouldUpdate = string.Equals(normalizedStrategy, "update", StringComparison.OrdinalIgnoreCase);

        int inserted = 0, updated = 0, skipped = 0, total = 0;

        foreach (var parsedRow in parsedRows)
        {
            if (rows.Count >= MaxRows)
            {
                rows.Add(new AssetSnapshotImportRowResultDto
                {
                    RowNumber = parsedRow.RowNumber,
                    Status = "error",
                    Message = $"Row limit exceeded. Maximum allowed rows is {MaxRows}."
                });
                total++;
                break;
            }

            var validation = ValidateRow(parsedRow, timeZone);
            if (validation.Error != null)
            {
                rows.Add(new AssetSnapshotImportRowResultDto
                {
                    RowNumber = parsedRow.RowNumber,
                    Status = "error",
                    Message = validation.Error
                });
                total++;
                continue;
            }

            var dateKey = validation.DateUtc.Date;

            if (seenDates.Contains(dateKey))
            {
                if (shouldUpdate && existingByDate.TryGetValue(dateKey, out var existingSnapshot))
                {
                    updated++;
                    rows.Add(new AssetSnapshotImportRowResultDto
                    {
                        RowNumber = parsedRow.RowNumber,
                        Status = "updated",
                        Message = request.DryRun
                            ? "Would update existing balance"
                            : "Updated existing balance"
                    });

                    if (!request.DryRun)
                    {
                        existingSnapshot.Balance = validation.Balance;
                        existingSnapshot.Notes = validation.Notes;
                        await _snapshotRepository.UpdateAsync(existingSnapshot);
                    }
                }
                else
                {
                    skipped++;
                    rows.Add(new AssetSnapshotImportRowResultDto
                    {
                        RowNumber = parsedRow.RowNumber,
                        Status = "skipped",
                        Message = "Duplicate date detected. Skipped based on strategy."
                    });
                }

                total++;
                continue;
            }

            inserted++;
            rows.Add(new AssetSnapshotImportRowResultDto
            {
                RowNumber = parsedRow.RowNumber,
                Status = request.DryRun ? "valid" : "inserted",
                Message = request.DryRun ? "Valid row" : "Inserted"
            });

            if (!request.DryRun)
            {
                var snapshot = new AssetSnapshot
                {
                    AssetId = request.AssetId,
                    Balance = validation.Balance,
                    Date = validation.DateUtc,
                    Notes = validation.Notes
                };
                await _snapshotRepository.CreateAsync(snapshot);
            }

            seenDates.Add(dateKey);
            total++;
        }

        return new AssetSnapshotImportResponseDto
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

    private static string BuildCsvTemplate(string assetName)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Date,Balance,Notes");
        builder.AppendLine($"{DateTime.UtcNow:yyyy-MM-dd},1000.00,\"Opening balance for {assetName}\"");
        builder.AppendLine($"{DateTime.UtcNow.AddDays(-30):yyyy-MM-dd},950.50,\"Previous month balance\"");
        return builder.ToString();
    }

    private static byte[] BuildExcelTemplate(string assetName)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Import");

        var headers = new[] { "Date", "Balance", "Notes" };

        for (var i = 0; i < headers.Length; i++)
        {
            sheet.Cell(1, i + 1).Value = headers[i];
        }

        sheet.Cell(2, 1).Value = DateTime.UtcNow.Date;
        sheet.Cell(2, 2).Value = 1000.00;
        sheet.Cell(2, 3).Value = $"Opening balance for {assetName}";
        sheet.Cell(3, 1).Value = DateTime.UtcNow.AddDays(-30).Date;
        sheet.Cell(3, 2).Value = 950.50;
        sheet.Cell(3, 3).Value = "Previous month balance";

        var instructions = workbook.Worksheets.Add("Instructions");
        instructions.Cell(1, 1).Value = "Balance Import Template";
        instructions.Cell(2, 1).Value = "Required columns: Date (yyyy-MM-dd), Balance (number).";
        instructions.Cell(3, 1).Value = "Optional columns: Notes.";
        instructions.Cell(4, 1).Value = "Balance can be positive or negative (for liabilities).";
        instructions.Cell(5, 1).Value = "If a balance already exists for a date, it will be updated or skipped based on strategy.";

        sheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
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

    private static (DateTime DateUtc, decimal Balance, string? Notes, string? Error) ValidateRow(
        ParsedRow row,
        TimeZoneInfo? timeZone)
    {
        var missingFields = new List<string>();

        if (!row.Values.TryGetValue("Date", out var dateValue) || string.IsNullOrWhiteSpace(dateValue))
            missingFields.Add("Date");
        if (!row.Values.TryGetValue("Balance", out var balanceValue) || string.IsNullOrWhiteSpace(balanceValue))
            missingFields.Add("Balance");

        if (missingFields.Count > 0)
        {
            return (default, default, null, $"Missing required fields: {string.Join(", ", missingFields)}");
        }

        if (!DateTime.TryParse(dateValue, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        {
            return (default, default, null, "Invalid date format. Use yyyy-MM-dd.");
        }

        var normalizedDate = DateTime.SpecifyKind(parsedDate, DateTimeKind.Unspecified);
        var dateUtc = timeZone != null
            ? TimeZoneInfo.ConvertTimeToUtc(normalizedDate, timeZone)
            : DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);

        if (!decimal.TryParse(balanceValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var balance))
        {
            return (default, default, null, "Balance must be a valid number.");
        }

        var notes = row.Values.TryGetValue("Notes", out var noteVal) ? noteVal : null;
        return (dateUtc, decimal.Round(balance, 2), string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(), null);
    }

    private static (DateTime DateUtc, decimal Balance, string? Notes, string? Account, string? Error) ValidateBulkRow(
        ParsedRow row,
        TimeZoneInfo? timeZone)
    {
        var missingFields = new List<string>();

        if (!row.Values.TryGetValue("Date", out var dateValue) || string.IsNullOrWhiteSpace(dateValue))
            missingFields.Add("Date");
        if (!row.Values.TryGetValue("Balance", out var balanceValue) || string.IsNullOrWhiteSpace(balanceValue))
            missingFields.Add("Balance");
        if (!row.Values.TryGetValue("Account", out var accountValue) || string.IsNullOrWhiteSpace(accountValue))
            missingFields.Add("Account");

        if (missingFields.Count > 0)
        {
            return (default, default, null, null, $"Missing required fields: {string.Join(", ", missingFields)}");
        }

        if (!DateTime.TryParse(dateValue, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
        {
            return (default, default, null, null, "Invalid date format. Use yyyy-MM-dd.");
        }

        var normalizedDate = DateTime.SpecifyKind(parsedDate, DateTimeKind.Unspecified);
        var dateUtc = timeZone != null
            ? TimeZoneInfo.ConvertTimeToUtc(normalizedDate, timeZone)
            : DateTime.SpecifyKind(parsedDate, DateTimeKind.Utc);

        if (!decimal.TryParse(balanceValue, NumberStyles.Number, CultureInfo.InvariantCulture, out var balance))
        {
            return (default, default, null, null, "Balance must be a valid number.");
        }

        var notes = row.Values.TryGetValue("Notes", out var noteVal) ? noteVal : null;
        return (dateUtc, decimal.Round(balance, 2), string.IsNullOrWhiteSpace(notes) ? null : notes.Trim(), accountValue!.Trim(), null);
    }

    public async Task<(byte[] Content, string ContentType, string FileName)> GenerateBulkTemplateAsync(string format, int userId)
    {
        var normalized = NormalizeFormat(format);
        var assets = await _assetRepository.GetAllByUserAsync(userId);

        if (normalized == "csv")
        {
            var csv = BuildBulkCsvTemplate(assets);
            return (Encoding.UTF8.GetBytes(csv), "text/csv", "all-accounts-balances-template.csv");
        }

        var xlsxBytes = BuildBulkExcelTemplate(assets);
        return (xlsxBytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "all-accounts-balances-template.xlsx");
    }

    private static string BuildBulkCsvTemplate(IEnumerable<Asset> assets)
    {
        var builder = new StringBuilder();
        builder.AppendLine("Account,Date,Balance,Notes");

        var assetList = assets.ToList();
        if (assetList.Count == 0)
        {
            builder.AppendLine($"\"My Checking Account\",{DateTime.UtcNow:yyyy-MM-dd},1000.00,\"Example balance\"");
            builder.AppendLine($"\"My Savings Account\",{DateTime.UtcNow:yyyy-MM-dd},5000.00,\"Example balance\"");
        }
        else
        {
            foreach (var asset in assetList.Take(3))
            {
                builder.AppendLine($"\"{asset.Name}\",{DateTime.UtcNow:yyyy-MM-dd},1000.00,\"Example balance for {asset.Name}\"");
            }
        }

        return builder.ToString();
    }

    private static byte[] BuildBulkExcelTemplate(IEnumerable<Asset> assets)
    {
        using var workbook = new XLWorkbook();
        var sheet = workbook.Worksheets.Add("Import");

        var headers = new[] { "Account", "Date", "Balance", "Notes" };

        for (var i = 0; i < headers.Length; i++)
        {
            sheet.Cell(1, i + 1).Value = headers[i];
        }

        var assetList = assets.ToList();
        var row = 2;

        if (assetList.Count == 0)
        {
            sheet.Cell(row, 1).Value = "My Checking Account";
            sheet.Cell(row, 2).Value = DateTime.UtcNow.Date;
            sheet.Cell(row, 3).Value = 1000.00;
            sheet.Cell(row, 4).Value = "Example balance";
            row++;
            sheet.Cell(row, 1).Value = "My Savings Account";
            sheet.Cell(row, 2).Value = DateTime.UtcNow.Date;
            sheet.Cell(row, 3).Value = 5000.00;
            sheet.Cell(row, 4).Value = "Example balance";
        }
        else
        {
            foreach (var asset in assetList.Take(5))
            {
                sheet.Cell(row, 1).Value = asset.Name;
                sheet.Cell(row, 2).Value = DateTime.UtcNow.Date;
                sheet.Cell(row, 3).Value = 1000.00;
                sheet.Cell(row, 4).Value = $"Example balance for {asset.Name}";
                row++;
            }
        }

        // Add accounts reference sheet
        var accountsSheet = workbook.Worksheets.Add("Accounts");
        accountsSheet.Cell(1, 1).Value = "Your Existing Accounts";
        accountsSheet.Cell(1, 2).Value = "Type";
        accountsSheet.Cell(1, 3).Value = "Category";

        var accountRow = 2;
        foreach (var asset in assetList)
        {
            accountsSheet.Cell(accountRow, 1).Value = asset.Name;
            accountsSheet.Cell(accountRow, 2).Value = asset.AssetCategory?.IsLiability == true ? "Liability" : "Asset";
            accountsSheet.Cell(accountRow, 3).Value = asset.AssetCategory?.Name ?? "Unknown";
            accountRow++;
        }

        if (assetList.Count == 0)
        {
            accountsSheet.Cell(2, 1).Value = "(No accounts yet - create accounts first or they will be auto-created)";
        }

        var instructions = workbook.Worksheets.Add("Instructions");
        instructions.Cell(1, 1).Value = "Bulk Balance Import Template";
        instructions.Cell(2, 1).Value = "Required columns: Account (exact name), Date (yyyy-MM-dd), Balance (number).";
        instructions.Cell(3, 1).Value = "Optional columns: Notes.";
        instructions.Cell(4, 1).Value = "Account names must match existing accounts exactly (case-insensitive).";
        instructions.Cell(5, 1).Value = "See the 'Accounts' sheet for a list of your existing accounts.";
        instructions.Cell(6, 1).Value = "Balance can be positive or negative (for liabilities).";
        instructions.Cell(7, 1).Value = "If a balance already exists for an account+date, it will be updated or skipped based on strategy.";

        sheet.Columns().AdjustToContents();
        accountsSheet.Columns().AdjustToContents();

        using var ms = new MemoryStream();
        workbook.SaveAs(ms);
        return ms.ToArray();
    }

    public async Task<AssetSnapshotImportResponseDto> BulkImportAsync(BulkAssetSnapshotImportRequest request)
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

        // Get all assets for this user
        var allAssets = await _assetRepository.GetAllByUserAsync(request.UserId);
        var assetsByName = allAssets.ToDictionary(a => a.Name.ToLowerInvariant(), a => a);

        // Get all existing snapshots for this user's assets
        var allSnapshots = new Dictionary<int, Dictionary<DateTime, AssetSnapshot>>();
        foreach (var asset in allAssets)
        {
            var snapshots = await _snapshotRepository.GetByAssetAsync(asset.Id);
            allSnapshots[asset.Id] = snapshots.ToDictionary(s => s.Date.Date, s => s);
        }

        var rows = new List<AssetSnapshotImportRowResultDto>();
        var shouldUpdate = string.Equals(normalizedStrategy, "update", StringComparison.OrdinalIgnoreCase);

        int inserted = 0, updated = 0, skipped = 0, total = 0;

        foreach (var parsedRow in parsedRows)
        {
            if (rows.Count >= MaxRows)
            {
                rows.Add(new AssetSnapshotImportRowResultDto
                {
                    RowNumber = parsedRow.RowNumber,
                    Status = "error",
                    Message = $"Row limit exceeded. Maximum allowed rows is {MaxRows}."
                });
                total++;
                break;
            }

            var validation = ValidateBulkRow(parsedRow, timeZone);
            if (validation.Error != null)
            {
                rows.Add(new AssetSnapshotImportRowResultDto
                {
                    RowNumber = parsedRow.RowNumber,
                    Status = "error",
                    Message = validation.Error
                });
                total++;
                continue;
            }

            // Find the asset by name (case-insensitive)
            var accountNameLower = validation.Account!.ToLowerInvariant();
            if (!assetsByName.TryGetValue(accountNameLower, out var asset))
            {
                rows.Add(new AssetSnapshotImportRowResultDto
                {
                    RowNumber = parsedRow.RowNumber,
                    Status = "error",
                    Message = $"Account '{validation.Account}' not found. Please create the account first or check the spelling."
                });
                total++;
                continue;
            }

            var dateKey = validation.DateUtc.Date;

            // Check for existing snapshot
            if (!allSnapshots.TryGetValue(asset.Id, out var assetSnapshots))
            {
                assetSnapshots = new Dictionary<DateTime, AssetSnapshot>();
                allSnapshots[asset.Id] = assetSnapshots;
            }

            if (assetSnapshots.ContainsKey(dateKey))
            {
                if (shouldUpdate && assetSnapshots.TryGetValue(dateKey, out var existingSnapshot))
                {
                    updated++;
                    rows.Add(new AssetSnapshotImportRowResultDto
                    {
                        RowNumber = parsedRow.RowNumber,
                        Status = "updated",
                        Message = request.DryRun
                            ? $"Would update balance for {asset.Name}"
                            : $"Updated balance for {asset.Name}"
                    });

                    if (!request.DryRun)
                    {
                        existingSnapshot.Balance = validation.Balance;
                        existingSnapshot.Notes = validation.Notes;
                        await _snapshotRepository.UpdateAsync(existingSnapshot);
                    }
                }
                else
                {
                    skipped++;
                    rows.Add(new AssetSnapshotImportRowResultDto
                    {
                        RowNumber = parsedRow.RowNumber,
                        Status = "skipped",
                        Message = $"Duplicate date for {asset.Name}. Skipped based on strategy."
                    });
                }

                total++;
                continue;
            }

            inserted++;
            rows.Add(new AssetSnapshotImportRowResultDto
            {
                RowNumber = parsedRow.RowNumber,
                Status = request.DryRun ? "valid" : "inserted",
                Message = request.DryRun ? $"Valid row for {asset.Name}" : $"Inserted for {asset.Name}"
            });

            if (!request.DryRun)
            {
                var snapshot = new AssetSnapshot
                {
                    AssetId = asset.Id,
                    Balance = validation.Balance,
                    Date = validation.DateUtc,
                    Notes = validation.Notes
                };
                var created = await _snapshotRepository.CreateAsync(snapshot);
                assetSnapshots[dateKey] = created;
            }
            else
            {
                // Track for duplicate detection in dry run
                assetSnapshots[dateKey] = new AssetSnapshot { Date = validation.DateUtc };
            }

            total++;
        }

        return new AssetSnapshotImportResponseDto
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
    }

    private sealed record ParsedRow(int RowNumber, Dictionary<string, string> Values);
}
