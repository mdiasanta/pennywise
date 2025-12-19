using Pennywise.Api.Models;
using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface IExpenseService
{
    Task<IEnumerable<ExpenseDto>> GetAllExpensesAsync(
        int userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? categoryId = null,
        string? search = null,
        IEnumerable<int>? tagIds = null);
    Task<ExpenseDto?> GetExpenseByIdAsync(int id, int userId);
    Task<ExpenseDto> CreateExpenseAsync(CreateExpenseDto createDto);
    Task<ExpenseDto?> UpdateExpenseAsync(int id, int userId, UpdateExpenseDto updateDto);
    Task<bool> DeleteExpenseAsync(int id, int userId);
    Task<IEnumerable<ExpenseDto>> GetExpensesByDateRangeAsync(int userId, DateTime startDate, DateTime endDate);
    Task<IEnumerable<ExpenseDto>> GetExpensesByCategoryAsync(int userId, int categoryId);
    IAsyncEnumerable<Expense> StreamExpensesAsync(
        int userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? categoryId = null,
        string? search = null,
        IEnumerable<int>? tagIds = null);
}
