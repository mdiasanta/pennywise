using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface IExpenseRepository
{
    Task<IEnumerable<Expense>> GetAllAsync(
        int userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? categoryId = null,
        string? search = null,
        IEnumerable<int>? tagIds = null);
    IAsyncEnumerable<Expense> StreamAllAsync(
        int userId,
        DateTime? startDate = null,
        DateTime? endDate = null,
        int? categoryId = null,
        string? search = null,
        IEnumerable<int>? tagIds = null);
    Task<Expense?> GetByIdAsync(int id, int userId);
    Task<Expense> CreateAsync(Expense expense, IEnumerable<int>? tagIds = null);
    Task<Expense?> UpdateAsync(Expense expense, IEnumerable<int>? tagIds = null);
    Task<bool> DeleteAsync(int id, int userId);
    Task<IEnumerable<Expense>> GetByDateRangeAsync(int userId, DateTime startDate, DateTime endDate);
    Task<IEnumerable<Expense>> GetByCategoryAsync(int userId, int categoryId);
}
