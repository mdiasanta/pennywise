using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public class ExpenseImportRequest
{
    public required Stream FileStream { get; init; }
    public required string FileName { get; init; }
    public int UserId { get; init; }
    public string DuplicateStrategy { get; init; } = "skip";
    public string? Timezone { get; init; }
    public bool DryRun { get; init; } = true;
    public string? ExternalBatchId { get; init; }
}

public interface IExpenseImportService
{
    Task<(byte[] Content, string ContentType, string FileName)> GenerateTemplateAsync(string format, int userId);
    Task<ExpenseImportResponseDto> ImportAsync(ExpenseImportRequest request);
}
