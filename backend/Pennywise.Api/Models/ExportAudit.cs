namespace Pennywise.Api.Models;

public class ExportAudit
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime Timestamp { get; set; }
    public required string Format { get; set; }
    public string? FilterParams { get; set; }
    public int? RowCount { get; set; }
    public string? ClientIp { get; set; }
}
