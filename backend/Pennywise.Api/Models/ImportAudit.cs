namespace Pennywise.Api.Models;

public class ImportAudit
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime CreatedAt { get; set; }
    public required string FileName { get; set; }
    public int Total { get; set; }
    public int Inserted { get; set; }
    public int Updated { get; set; }
    public int Skipped { get; set; }
    public string? ErrorsJson { get; set; }
    public string DuplicateStrategy { get; set; } = "skip";
    public string? Timezone { get; set; }
    public string? ExternalBatchId { get; set; }
}
