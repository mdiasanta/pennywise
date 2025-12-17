using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public interface IRecurringTransactionRepository
{
    Task<IEnumerable<RecurringTransaction>> GetByAssetAsync(int assetId);
    Task<IEnumerable<RecurringTransaction>> GetByUserAsync(int userId);
    Task<IEnumerable<RecurringTransaction>> GetPendingTransactionsAsync(DateTime asOfDate);
    Task<RecurringTransaction?> GetByIdAsync(int id);
    Task<RecurringTransaction> CreateAsync(RecurringTransaction recurringTransaction);
    Task<RecurringTransaction?> UpdateAsync(RecurringTransaction recurringTransaction);
    Task<bool> DeleteAsync(int id);
}
