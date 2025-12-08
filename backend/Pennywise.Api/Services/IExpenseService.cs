using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface IExpenseService
{
    Task<IEnumerable<ExpenseDto>> GetAllExpensesAsync(int userId);
    Task<ExpenseDto?> GetExpenseByIdAsync(int id, int userId);
    Task<ExpenseDto> CreateExpenseAsync(CreateExpenseDto createDto);
    Task<ExpenseDto?> UpdateExpenseAsync(int id, int userId, UpdateExpenseDto updateDto);
    Task<bool> DeleteExpenseAsync(int id, int userId);
    Task<IEnumerable<ExpenseDto>> GetExpensesByDateRangeAsync(int userId, DateTime startDate, DateTime endDate);
    Task<IEnumerable<ExpenseDto>> GetExpensesByCategoryAsync(int userId, int categoryId);
}
