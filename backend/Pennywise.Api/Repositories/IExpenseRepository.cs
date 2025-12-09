using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface IExpenseRepository
{
    Task<IEnumerable<Expense>> GetAllAsync(
        int userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? categoryId = null,
        string? search = null);
    IAsyncEnumerable<Expense> StreamAllAsync(
        int userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? categoryId = null,
        string? search = null);
    Task<Expense?> GetByIdAsync(int id, int userId);
    Task<Expense> CreateAsync(Expense expense);
    Task<Expense?> UpdateAsync(Expense expense);
    Task<bool> DeleteAsync(int id, int userId);
    Task<IEnumerable<Expense>> GetByDateRangeAsync(int userId, DateTime startDate, DateTime endDate);
    Task<IEnumerable<Expense>> GetByCategoryAsync(int userId, int categoryId);
}
