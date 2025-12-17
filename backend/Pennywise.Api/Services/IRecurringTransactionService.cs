using Pennywise.Api.DTOs;

namespace Pennywise.Api.Services;

public interface IRecurringTransactionService
{
    Task<IEnumerable<RecurringTransactionDto>> GetByAssetAsync(int assetId, int userId);
    Task<IEnumerable<RecurringTransactionDto>> GetByUserAsync(int userId);
    Task<RecurringTransactionDto?> GetByIdAsync(int id, int userId);
    Task<RecurringTransactionDto> CreateAsync(CreateRecurringTransactionDto createDto, int userId);
    Task<RecurringTransactionDto?> UpdateAsync(int id, UpdateRecurringTransactionDto updateDto, int userId);
    Task<bool> DeleteAsync(int id, int userId);
    Task<int> ProcessPendingTransactionsAsync();
}
