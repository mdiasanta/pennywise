using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Serialization;
using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class SplitwiseService : ISplitwiseService
{
    private const string SplitwiseApiBaseUrl = "https://secure.splitwise.com/api/v3.0";
    private const string SplitwiseTagName = "splitwise";
    private const string DefaultCategoryName = "Alcohol";
    
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IExpenseRepository _expenseRepository;
    private readonly ICategoryRepository _categoryRepository;
    private readonly ITagRepository _tagRepository;
    
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
    };

    public SplitwiseService(
        IHttpClientFactory httpClientFactory,
        IExpenseRepository expenseRepository,
        ICategoryRepository categoryRepository,
        ITagRepository tagRepository)
    {
        _httpClientFactory = httpClientFactory;
        _expenseRepository = expenseRepository;
        _categoryRepository = categoryRepository;
        _tagRepository = tagRepository;
    }

    public async Task<SplitwiseCurrentUserDto?> ValidateApiKeyAsync(string apiKey)
    {
        try
        {
            var client = CreateClient(apiKey);
            var response = await client.GetAsync($"{SplitwiseApiBaseUrl}/get_current_user");
            
            if (!response.IsSuccessStatusCode)
                return null;
            
            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<SplitwiseUserResponse>(content, JsonOptions);
            
            if (result?.User == null)
                return null;
            
            return new SplitwiseCurrentUserDto
            {
                Id = result.User.Id,
                FirstName = result.User.FirstName ?? string.Empty,
                LastName = result.User.LastName,
                Email = result.User.Email
            };
        }
        catch
        {
            return null;
        }
    }

    public async Task<List<SplitwiseGroupDto>> GetGroupsAsync(string apiKey)
    {
        var client = CreateClient(apiKey);
        var response = await client.GetAsync($"{SplitwiseApiBaseUrl}/get_groups");
        
        response.EnsureSuccessStatusCode();
        
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<SplitwiseGroupsResponse>(content, JsonOptions);
        
        if (result?.Groups == null)
            return new List<SplitwiseGroupDto>();
        
        return result.Groups
            .Where(g => g.Id != 0) // Filter out the non-group expenses
            .Select(g => new SplitwiseGroupDto
            {
                Id = g.Id,
                Name = g.Name ?? "Unknown Group",
                CreatedAt = g.CreatedAt,
                UpdatedAt = g.UpdatedAt,
                Members = g.Members?.Select(m => new SplitwiseGroupMemberDto
                {
                    Id = m.Id,
                    FirstName = m.FirstName ?? string.Empty,
                    LastName = m.LastName,
                    Email = m.Email
                }).ToList() ?? new List<SplitwiseGroupMemberDto>()
            })
            .ToList();
    }

    public async Task<List<SplitwiseGroupMemberDto>> GetGroupMembersAsync(string apiKey, long groupId)
    {
        var client = CreateClient(apiKey);
        var response = await client.GetAsync($"{SplitwiseApiBaseUrl}/get_group/{groupId}");
        
        response.EnsureSuccessStatusCode();
        
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<SplitwiseGroupDetailResponse>(content, JsonOptions);
        
        if (result?.Group?.Members == null)
            return new List<SplitwiseGroupMemberDto>();
        
        return result.Group.Members.Select(m => new SplitwiseGroupMemberDto
        {
            Id = m.Id,
            FirstName = m.FirstName ?? string.Empty,
            LastName = m.LastName,
            Email = m.Email
        }).ToList();
    }

    public async Task<SplitwiseImportResponseDto> ImportExpensesAsync(SplitwiseImportRequest request)
    {
        var client = CreateClient(request.ApiKey);
        
        // Get group info for display
        var groupResponse = await client.GetAsync($"{SplitwiseApiBaseUrl}/get_group/{request.GroupId}");
        groupResponse.EnsureSuccessStatusCode();
        var groupContent = await groupResponse.Content.ReadAsStringAsync();
        var groupResult = JsonSerializer.Deserialize<SplitwiseGroupDetailResponse>(groupContent, JsonOptions);
        var groupName = groupResult?.Group?.Name ?? "Unknown Group";
        
        // Find the selected user's name
        var selectedUser = groupResult?.Group?.Members?.FirstOrDefault(m => m.Id == request.SplitwiseUserId);
        var userName = selectedUser != null 
            ? (string.IsNullOrWhiteSpace(selectedUser.LastName) 
                ? selectedUser.FirstName 
                : $"{selectedUser.FirstName} {selectedUser.LastName}")
            : "Unknown User";
        
        // Build query parameters for expenses
        var queryParams = new List<string> { $"group_id={request.GroupId}", "limit=0" }; // limit=0 gets all
        
        if (request.StartDate.HasValue)
            queryParams.Add($"dated_after={request.StartDate.Value:yyyy-MM-dd}");
        
        if (request.EndDate.HasValue)
        {
            // Add 1 day for inclusive end, but protect against overflow
            var endDateForQuery = request.EndDate.Value.Date < DateTime.MaxValue.AddDays(-1) 
                ? request.EndDate.Value.AddDays(1) 
                : DateTime.MaxValue;
            queryParams.Add($"dated_before={endDateForQuery:yyyy-MM-dd}");
        }
        
        var queryString = string.Join("&", queryParams);
        var expensesResponse = await client.GetAsync($"{SplitwiseApiBaseUrl}/get_expenses?{queryString}");
        expensesResponse.EnsureSuccessStatusCode();
        
        var expensesContent = await expensesResponse.Content.ReadAsStringAsync();
        var expensesResult = JsonSerializer.Deserialize<SplitwiseExpensesResponse>(expensesContent, JsonOptions);
        
        if (expensesResult?.Expenses == null || expensesResult.Expenses.Count == 0)
        {
            return new SplitwiseImportResponseDto
            {
                DryRun = request.DryRun,
                GroupName = groupName,
                UserName = userName,
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                TotalExpenses = 0,
                PaymentsIgnored = 0,
                DuplicatesFound = 0,
                ImportableCount = 0,
                ImportedCount = 0,
                TotalAmount = 0,
                Expenses = new List<SplitwiseExpensePreviewDto>()
            };
        }
        
        // Get existing expenses for duplicate detection
        var existingExpenses = await _expenseRepository.GetAllAsync(request.UserId);
        var existingKeys = existingExpenses
            .Select(e => BuildDuplicateKey(e.Date.Date, e.Amount, e.Title))
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
        
        var previewExpenses = new List<SplitwiseExpensePreviewDto>();
        int paymentsIgnored = 0;
        int duplicatesFound = 0;
        
        foreach (var expense in expensesResult.Expenses)
        {
            // Skip deleted expenses
            if (expense.DeletedAt != null)
                continue;
            
            // Find the user's share
            var userShare = expense.Users?.FirstOrDefault(u => u.UserId == request.SplitwiseUserId);
            var owedShare = ParseDecimal(userShare?.OwedShare);
            
            // Skip if user owes nothing (they paid for others or are not involved)
            if (owedShare <= 0)
                continue;
            
            var isPayment = expense.Payment ?? false;
            var expenseDate = expense.Date ?? DateTime.UtcNow;
            var description = expense.Description ?? "Splitwise Expense";
            var totalCost = ParseDecimal(expense.Cost);
            
            // Find who paid
            var payer = expense.Users?.FirstOrDefault(u => ParseDecimal(u.PaidShare) > 0);
            var payerName = payer != null 
                ? groupResult?.Group?.Members?.FirstOrDefault(m => m.Id == payer.UserId)?.FirstName ?? "Unknown"
                : "Unknown";
            
            // Get Splitwise category
            var categoryName = expense.Category?.Name;
            
            // Check for duplicates
            var duplicateKey = BuildDuplicateKey(expenseDate.Date, owedShare, description);
            var isDuplicate = existingKeys.Contains(duplicateKey);
            
            if (isPayment)
                paymentsIgnored++;
            else if (isDuplicate)
                duplicatesFound++;
            
            previewExpenses.Add(new SplitwiseExpensePreviewDto
            {
                Id = expense.Id,
                Description = description,
                TotalCost = totalCost,
                UserOwes = owedShare,
                Date = expenseDate,
                SplitwiseCategory = categoryName,
                PaidBy = payerName,
                IsPayment = isPayment,
                IsDuplicate = isDuplicate,
                StatusMessage = isPayment 
                    ? "Payment - will be ignored" 
                    : isDuplicate 
                        ? "Duplicate found in Pennywise" 
                        : null
            });
        }
        
        var importableExpenses = previewExpenses.Where(e => e.CanImport).ToList();
        
        // Filter by selected expense IDs if provided
        if (request.SelectedExpenseIds != null && request.SelectedExpenseIds.Count > 0)
        {
            importableExpenses = importableExpenses
                .Where(e => request.SelectedExpenseIds.Contains(e.Id))
                .ToList();
        }
        
        var totalAmount = importableExpenses.Sum(e => e.UserOwes);
        int importedCount = 0;
        
        // Actually import if not a dry run
        if (!request.DryRun && importableExpenses.Count > 0)
        {
            // Ensure the "splitwise" tag exists
            var splitwiseTag = await EnsureSplitwiseTagAsync(request.UserId);
            
            // Find or create the default category (Alcohol)
            var category = await EnsureDefaultCategoryAsync(request.UserId);
            
            foreach (var expense in importableExpenses)
            {
                var newExpense = new Expense
                {
                    Title = expense.Description,
                    Description = $"Imported from Splitwise group: {groupName}. Paid by: {expense.PaidBy}. Total cost: {expense.TotalCost:C}",
                    Amount = expense.UserOwes,
                    Date = DateTime.SpecifyKind(expense.Date.Date, DateTimeKind.Utc),
                    UserId = request.UserId,
                    CategoryId = category.Id,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                
                await _expenseRepository.CreateAsync(newExpense, new List<int> { splitwiseTag.Id });
                importedCount++;
            }
        }
        
        return new SplitwiseImportResponseDto
        {
            DryRun = request.DryRun,
            GroupName = groupName,
            UserName = userName,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            TotalExpenses = previewExpenses.Count,
            PaymentsIgnored = paymentsIgnored,
            DuplicatesFound = duplicatesFound,
            ImportableCount = importableExpenses.Count,
            ImportedCount = importedCount,
            TotalAmount = totalAmount,
            Expenses = previewExpenses
        };
    }
    
    private HttpClient CreateClient(string apiKey)
    {
        if (string.IsNullOrWhiteSpace(apiKey))
            throw new ArgumentException("API key cannot be empty", nameof(apiKey));
        
        var client = _httpClientFactory.CreateClient("SplitwiseApi");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        return client;
    }
    
    private static string BuildDuplicateKey(DateTime date, decimal amount, string title)
    {
        return $"{date:yyyy-MM-dd}|{Math.Round(amount, 2)}|{title.Trim().ToLowerInvariant()}";
    }
    
    private static decimal ParseDecimal(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return 0;
        
        return decimal.TryParse(value, System.Globalization.NumberStyles.Any, 
            System.Globalization.CultureInfo.InvariantCulture, out var result) ? result : 0;
    }
    
    private async Task<Tag> EnsureSplitwiseTagAsync(int userId)
    {
        var existingTags = await _tagRepository.GetAllByUserAsync(userId);
        var splitwiseTag = existingTags.FirstOrDefault(t => 
            string.Equals(t.Name, SplitwiseTagName, StringComparison.OrdinalIgnoreCase));
        
        if (splitwiseTag != null)
            return splitwiseTag;
        
        // Create the splitwise tag
        var newTag = new Tag
        {
            Name = SplitwiseTagName,
            UserId = userId,
            Color = "#1CC29F", // Splitwise green color
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        return await _tagRepository.CreateAsync(newTag);
    }
    
    private async Task<Category> EnsureDefaultCategoryAsync(int userId)
    {
        var existingCategories = await _categoryRepository.GetAllAsync(userId);
        var alcoholCategory = existingCategories.FirstOrDefault(c => 
            string.Equals(c.Name, DefaultCategoryName, StringComparison.OrdinalIgnoreCase));
        
        if (alcoholCategory != null)
            return alcoholCategory;
        
        // If "Alcohol" doesn't exist, use the first available category
        var firstCategory = existingCategories.FirstOrDefault();
        if (firstCategory != null)
            return firstCategory;
        
        // If no categories exist, create Alcohol category
        var newCategory = new Category
        {
            Name = DefaultCategoryName,
            Description = "Alcohol and beverages",
            Color = "#8B5CF6", // Purple color
            UserId = userId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        
        return await _categoryRepository.CreateAsync(newCategory);
    }
    
    // Internal classes for Splitwise API response deserialization
    
    private class SplitwiseUserResponse
    {
        public SplitwiseUserData? User { get; set; }
    }
    
    private class SplitwiseUserData
    {
        public long Id { get; set; }
        
        [JsonPropertyName("first_name")]
        public string? FirstName { get; set; }
        
        [JsonPropertyName("last_name")]
        public string? LastName { get; set; }
        
        public string? Email { get; set; }
    }
    
    private class SplitwiseGroupsResponse
    {
        public List<SplitwiseGroupData>? Groups { get; set; }
    }
    
    private class SplitwiseGroupDetailResponse
    {
        public SplitwiseGroupData? Group { get; set; }
    }
    
    private class SplitwiseGroupData
    {
        public long Id { get; set; }
        public string? Name { get; set; }
        
        [JsonPropertyName("created_at")]
        public DateTime? CreatedAt { get; set; }
        
        [JsonPropertyName("updated_at")]
        public DateTime? UpdatedAt { get; set; }
        
        public List<SplitwiseMemberData>? Members { get; set; }
    }
    
    private class SplitwiseMemberData
    {
        public long Id { get; set; }
        
        [JsonPropertyName("first_name")]
        public string? FirstName { get; set; }
        
        [JsonPropertyName("last_name")]
        public string? LastName { get; set; }
        
        public string? Email { get; set; }
    }
    
    private class SplitwiseExpensesResponse
    {
        public List<SplitwiseExpenseData>? Expenses { get; set; }
    }
    
    private class SplitwiseExpenseData
    {
        public long Id { get; set; }
        
        [JsonPropertyName("group_id")]
        public long? GroupId { get; set; }
        
        public string? Description { get; set; }
        public bool? Payment { get; set; }
        public string? Cost { get; set; }
        public DateTime? Date { get; set; }
        
        [JsonPropertyName("deleted_at")]
        public DateTime? DeletedAt { get; set; }
        
        public SplitwiseCategoryData? Category { get; set; }
        public List<SplitwiseUserShareData>? Users { get; set; }
    }
    
    private class SplitwiseCategoryData
    {
        public long Id { get; set; }
        public string? Name { get; set; }
    }
    
    private class SplitwiseUserShareData
    {
        [JsonPropertyName("user_id")]
        public long UserId { get; set; }
        
        [JsonPropertyName("paid_share")]
        public string? PaidShare { get; set; }
        
        [JsonPropertyName("owed_share")]
        public string? OwedShare { get; set; }
        
        [JsonPropertyName("net_balance")]
        public string? NetBalance { get; set; }
    }
}
