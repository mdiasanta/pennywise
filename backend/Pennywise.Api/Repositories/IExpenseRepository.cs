using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface IExpenseRepository
{
    Task<IEnumerable<Expense>> GetAllAsync(int userId);
    Task<Expense?> GetByIdAsync(int id, int userId);
    Task<Expense> CreateAsync(Expense expense);
    Task<Expense?> UpdateAsync(Expense expense);
    Task<bool> DeleteAsync(int id, int userId);
    Task<IEnumerable<Expense>> GetByDateRangeAsync(int userId, DateTime startDate, DateTime endDate);
    Task<IEnumerable<Expense>> GetByCategoryAsync(int userId, int categoryId);
}
