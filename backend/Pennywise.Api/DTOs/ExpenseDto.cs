namespace Pennywise.Api.DTOs;

public class CreateExpenseDto
{
    public required string Title { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public int UserId { get; set; }
    public int CategoryId { get; set; }
    public List<int>? TagIds { get; set; }
}

public class UpdateExpenseDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public decimal? Amount { get; set; }
    public DateTime? Date { get; set; }
    public int? CategoryId { get; set; }
    public List<int>? TagIds { get; set; }
}

public class ExpenseDto
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public string? Description { get; set; }
    public decimal Amount { get; set; }
    public DateTime Date { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int UserId { get; set; }
    public int CategoryId { get; set; }
    public string? CategoryName { get; set; }
    public string? CategoryColor { get; set; }
    public List<TagDto> Tags { get; set; } = new List<TagDto>();
}
