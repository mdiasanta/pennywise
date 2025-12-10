namespace Pennywise.Api.DTOs;

public class ExportAuditDto
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public DateTime Timestamp { get; set; }
    public string Format { get; set; } = string.Empty;
    public string? FilterParams { get; set; }
    public int? RowCount { get; set; }
    public string? ClientIp { get; set; }
}
