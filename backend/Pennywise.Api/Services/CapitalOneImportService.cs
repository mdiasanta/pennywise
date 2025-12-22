using System.Globalization;
using System.Text;
using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class CapitalOneImportService : ICapitalOneImportService
{
    // Pennywise category names for mapping
    private const string FoodAndDiningCategoryName = "Food & Dining";
    private const string TransportationCategoryName = "Transportation";
    private const string ShoppingCategoryName = "Shopping";
    private const string EntertainmentCategoryName = "Entertainment";
    private const string BillsAndUtilitiesCategoryName = "Bills & Utilities";
    private const string HealthcareCategoryName = "Healthcare";
    private const string VacationCategoryName = "Vacation";
    private const string AlcoholCategoryName = "Alcohol";
    private const string FallbackCategoryName = "Other";

    private readonly IExpenseRepository _expenseRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly ITagRepository _tagRepository;

    public CapitalOneImportService(
        IExpenseRepository expenseRepository,
        ICategoryRepository categoryRepository,
        ITagRepository tagRepository)
    {
        _expenseRepository = expenseRepository;
        _categoryRepository = categoryRepository;
        _tagRepository = tagRepository;
    }

    public async Task<CapitalOneImportResponseDto> ImportAsync(
        Stream fileStream,
        string fileName,
        CapitalOneImportRequest request)
    {
        // Parse the CSV
        var parsedRows = ParseCsv(fileStream);
        
        if (parsedRows.Count == 0)
        {
            return new CapitalOneImportResponseDto
            {
                DryRun = request.DryRun,
                CardType = request.CardType.ToString(),
                FileName = fileName,
                TotalTransactions = 0,
                CreditsSkipped = 0,
                DuplicatesFound = 0,
                ImportableCount = 0,
                ImportedCount = 0,
                TotalAmount = 0,
                Expenses = new List<CapitalOneExpensePreviewDto>(),
                AvailableCategories = new List<CategoryDto>()
            };
        }

        // Get existing expenses for duplicate detection
        var existingExpenses = await _expenseRepository.GetAllAsync(request.UserId);
        var existingKeys = existingExpenses
            .Select(e => BuildDuplicateKey(e.Date.Date, e.Amount, e.Title))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // Load Pennywise categories for mapping
        var categories = (await _categoryRepository.GetAllAsync(request.UserId)).ToList();
        if (categories.Count == 0)
            throw new InvalidOperationException("No categories exist. Create at least one category before importing.");

        var categoriesByName = categories
            .GroupBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => g.First(), StringComparer.OrdinalIgnoreCase);

        var categoriesById = categories
            .GroupBy(c => c.Id)
            .ToDictionary(g => g.Key, g => g.First());

        var fallbackCategory = GetCategoryByName(categoriesByName, FallbackCategoryName) ?? categories.First();

        var previewExpenses = new List<CapitalOneExpensePreviewDto>();
        int creditsSkipped = 0;
        int duplicatesFound = 0;

        foreach (var row in parsedRows)
        {
            // Check if this is a credit (payment/refund) - these have values in the Credit column
            var isCredit = row.CreditAmount.HasValue && row.CreditAmount.Value > 0;
            
            // Get the debit amount (expense)
            var amount = row.DebitAmount ?? 0;

            // Map Capital One category to Pennywise
            var mappedCategoryName = MapCapitalOneCategoryToPennywise(row.Category);
            var mappedCategory = GetCategoryByName(categoriesByName, mappedCategoryName) ?? fallbackCategory;

            // Check for duplicates
            var duplicateKey = BuildDuplicateKey(row.TransactionDate.Date, amount, row.Description);
            var isDuplicate = existingKeys.Contains(duplicateKey);

            if (isCredit)
                creditsSkipped++;
            else if (isDuplicate)
                duplicatesFound++;

            previewExpenses.Add(new CapitalOneExpensePreviewDto
            {
                RowNumber = row.RowNumber,
                TransactionDate = row.TransactionDate,
                PostedDate = row.PostedDate,
                CardNumber = row.CardNumber,
                Description = row.Description,
                CapitalOneCategory = row.Category,
                Amount = amount,
                MappedCategoryId = mappedCategory.Id,
                MappedCategoryName = mappedCategory.Name,
                IsCredit = isCredit,
                IsDuplicate = isDuplicate,
                StatusMessage = isCredit
                    ? "Credit/payment - will be skipped"
                    : isDuplicate
                        ? "Duplicate found in Pennywise"
                        : null
            });
        }

        var importableExpenses = previewExpenses.Where(e => e.CanImport).ToList();

        // Filter by selected row numbers if provided
        if (request.SelectedRowNumbers != null && request.SelectedRowNumbers.Count > 0)
        {
            importableExpenses = importableExpenses
                .Where(e => request.SelectedRowNumbers.Contains(e.RowNumber))
                .ToList();
        }

        var totalAmount = importableExpenses.Sum(e => e.Amount);
        int importedCount = 0;

        // Actually import if not a dry run
        if (!request.DryRun && importableExpenses.Count > 0)
        {
            // Ensure the card tag exists
            var cardTag = await EnsureCardTagAsync(request.UserId, request.CardType);

            var overridesByRowNumber = (request.CategoryOverrides ?? new List<CapitalOneExpenseCategoryOverrideDto>())
                .GroupBy(o => o.RowNumber)
                .ToDictionary(g => g.Key, g => g.Last().CategoryId);

            foreach (var expense in importableExpenses)
            {
                var mappedCategoryName = MapCapitalOneCategoryToPennywise(expense.CapitalOneCategory);
                var mappedCategory = GetCategoryByName(categoriesByName, mappedCategoryName) ?? fallbackCategory;

                // If the user selected a category override in the UI, honor it (when valid).
                var category = mappedCategory;
                if (overridesByRowNumber.TryGetValue(expense.RowNumber, out var overrideCategoryId) &&
                    categoriesById.TryGetValue(overrideCategoryId, out var overrideCategory))
                {
                    category = overrideCategory;
                }

                var newExpense = new Expense
                {
                    Title = expense.Description,
                    Description = $"Imported from Capital One {request.CardType}. Card ending in {expense.CardNumber}. Original category: {expense.CapitalOneCategory}",
                    Amount = expense.Amount,
                    Date = DateTime.SpecifyKind(expense.TransactionDate.Date, DateTimeKind.Utc),
                    UserId = request.UserId,
                    CategoryId = category.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                await _expenseRepository.CreateAsync(newExpense, new List<int> { cardTag.Id });
                importedCount++;
            }
        }

        return new CapitalOneImportResponseDto
        {
            DryRun = request.DryRun,
            CardType = request.CardType.ToString(),
            FileName = fileName,
            TotalTransactions = previewExpenses.Count,
            CreditsSkipped = creditsSkipped,
            DuplicatesFound = duplicatesFound,
            ImportableCount = importableExpenses.Count,
            ImportedCount = importedCount,
            TotalAmount = totalAmount,
            Expenses = previewExpenses,
            AvailableCategories = categories.Select(MapToDto).ToList()
        };
    }

    private static List<ParsedCapitalOneRow> ParseCsv(Stream stream)
    {
        stream.Position = 0;
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, leaveOpen: true);
        
        var headerLine = reader.ReadLine();
        if (string.IsNullOrWhiteSpace(headerLine))
            return new List<ParsedCapitalOneRow>();

        // Expected headers: Transaction Date,Posted Date,Card No.,Description,Category,Debit,Credit
        var headers = SplitCsvLine(headerLine);
        var headerIndices = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        for (int i = 0; i < headers.Count; i++)
        {
            headerIndices[headers[i].Trim()] = i;
        }

        // Validate required headers
        var requiredHeaders = new[] { "Transaction Date", "Posted Date", "Card No.", "Description", "Category", "Debit", "Credit" };
        foreach (var required in requiredHeaders)
        {
            if (!headerIndices.ContainsKey(required))
            {
                throw new InvalidOperationException($"Missing required header: {required}. Expected headers: {string.Join(", ", requiredHeaders)}");
            }
        }

        var rows = new List<ParsedCapitalOneRow>();
        int rowNumber = 1; // Start from 1 for user-friendly row numbers

        while (!reader.EndOfStream)
        {
            var line = reader.ReadLine();
            if (string.IsNullOrWhiteSpace(line))
                continue;

            var values = SplitCsvLine(line);
            
            var transactionDateStr = GetValue(values, headerIndices, "Transaction Date");
            var postedDateStr = GetValue(values, headerIndices, "Posted Date");
            var cardNo = GetValue(values, headerIndices, "Card No.");
            var description = GetValue(values, headerIndices, "Description");
            var category = GetValue(values, headerIndices, "Category");
            var debitStr = GetValue(values, headerIndices, "Debit");
            var creditStr = GetValue(values, headerIndices, "Credit");

            // Parse dates
            if (!DateTime.TryParse(transactionDateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var transactionDate))
            {
                rowNumber++;
                continue; // Skip invalid rows
            }

            if (!DateTime.TryParse(postedDateStr, CultureInfo.InvariantCulture, DateTimeStyles.None, out var postedDate))
            {
                postedDate = transactionDate; // Fall back to transaction date
            }

            // Parse amounts
            decimal? debitAmount = null;
            decimal? creditAmount = null;

            if (!string.IsNullOrWhiteSpace(debitStr) && debitStr != ".")
            {
                if (decimal.TryParse(debitStr, NumberStyles.Currency, CultureInfo.InvariantCulture, out var debit))
                {
                    debitAmount = debit;
                }
            }

            if (!string.IsNullOrWhiteSpace(creditStr) && creditStr != ".")
            {
                if (decimal.TryParse(creditStr, NumberStyles.Currency, CultureInfo.InvariantCulture, out var credit))
                {
                    creditAmount = credit;
                }
            }

            rows.Add(new ParsedCapitalOneRow
            {
                RowNumber = rowNumber,
                TransactionDate = transactionDate,
                PostedDate = postedDate,
                CardNumber = cardNo,
                Description = description,
                Category = category,
                DebitAmount = debitAmount,
                CreditAmount = creditAmount
            });

            rowNumber++;
        }

        return rows;
    }

    private static string GetValue(List<string> values, Dictionary<string, int> headerIndices, string header)
    {
        if (headerIndices.TryGetValue(header, out var index) && index < values.Count)
        {
            return values[index];
        }
        return string.Empty;
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
        return result;
    }

    private static string BuildDuplicateKey(DateTime date, decimal amount, string title)
    {
        return $"{date:yyyy-MM-dd}|{Math.Round(amount, 2)}|{title.Trim().ToLowerInvariant()}";
    }

    private async Task<Tag> EnsureCardTagAsync(int userId, CapitalOneCardType cardType)
    {
        var tagName = cardType.ToString();
        var existingTags = await _tagRepository.GetAllByUserAsync(userId);
        var cardTag = existingTags.FirstOrDefault(t =>
            string.Equals(t.Name, tagName, StringComparison.OrdinalIgnoreCase));

        if (cardTag != null)
            return cardTag;

        // Create the card tag with appropriate color
        var color = cardType switch
        {
            CapitalOneCardType.QuickSilver => "#4169E1", // Royal blue for QuickSilver
            CapitalOneCardType.VentureX => "#8B0000", // Dark red for VentureX
            _ => "#808080" // Gray fallback
        };

        var newTag = new Tag
        {
            Name = tagName,
            UserId = userId,
            Color = color,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        return await _tagRepository.CreateAsync(newTag);
    }

    private static Category? GetCategoryByName(Dictionary<string, Category> categoriesByName, string name)
    {
        return categoriesByName.TryGetValue(name, out var category) ? category : null;
    }

    private static string MapCapitalOneCategoryToPennywise(string? capitalOneCategory)
    {
        if (string.IsNullOrWhiteSpace(capitalOneCategory))
            return FallbackCategoryName;

        var normalized = capitalOneCategory.Trim().ToLowerInvariant();

        // Vacation / Travel
        if (ContainsAny(normalized, "travel", "airline", "airfare", "lodging", "hotel", "rental car", "other travel"))
            return VacationCategoryName;

        // Alcohol / Bars
        if (ContainsAny(normalized, "bar", "nightlife"))
            return AlcoholCategoryName;

        // Food & Dining
        if (ContainsAny(normalized, "dining", "restaurant", "groceries", "grocery", "food", "coffee shop", "cafe"))
            return FoodAndDiningCategoryName;

        // Transportation
        if (ContainsAny(normalized, "gas", "fuel", "automotive", "parking", "tolls", "public transit", "rideshare", "taxi", "uber", "lyft"))
            return TransportationCategoryName;

        // Bills & Utilities
        if (ContainsAny(normalized, "phone", "internet", "cable", "utility", "utilities", "electric", "water", "subscription", "streaming", "software subscription"))
            return BillsAndUtilitiesCategoryName;

        // Healthcare
        if (ContainsAny(normalized, "health", "medical", "pharmacy", "doctor", "dental", "vision", "hospital"))
            return HealthcareCategoryName;

        // Entertainment
        if (ContainsAny(normalized, "entertainment", "movies", "movie", "music", "concert", "sports", "recreation", "hobby", "video games", "amusement"))
            return EntertainmentCategoryName;

        // Shopping
        if (ContainsAny(normalized, "merchandise", "shopping", "electronics", "clothing", "department store", "home improvement", "pet supplies", "books"))
            return ShoppingCategoryName;

        return FallbackCategoryName;
    }

    private static bool ContainsAny(string normalized, params string[] needles)
    {
        foreach (var needle in needles)
        {
            if (normalized.Contains(needle, StringComparison.Ordinal))
                return true;
        }

        return false;
    }

    private static CategoryDto MapToDto(Category category)
    {
        return new CategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            Color = category.Color,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt,
            IsDefault = category.UserId == null
        };
    }

    private class ParsedCapitalOneRow
    {
        public int RowNumber { get; init; }
        public DateTime TransactionDate { get; init; }
        public DateTime PostedDate { get; init; }
        public string CardNumber { get; init; } = string.Empty;
        public string Description { get; init; } = string.Empty;
        public string Category { get; init; } = string.Empty;
        public decimal? DebitAmount { get; init; }
        public decimal? CreditAmount { get; init; }
    }
}
