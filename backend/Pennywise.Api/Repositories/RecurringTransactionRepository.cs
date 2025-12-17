using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class RecurringTransactionRepository : IRecurringTransactionRepository
{
    private readonly PennywiseDbContext _context;

    public RecurringTransactionRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<RecurringTransaction>> GetByAssetAsync(int assetId)
    {
        return await _context.RecurringTransactions
            .AsNoTracking()
            .Include(r => r.Asset)
            .Where(r => r.AssetId == assetId)
            .OrderBy(r => r.NextRunDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<RecurringTransaction>> GetByUserAsync(int userId)
    {
        return await _context.RecurringTransactions
            .AsNoTracking()
            .Include(r => r.Asset)
            .Where(r => r.Asset.UserId == userId)
            .OrderBy(r => r.NextRunDate)
            .ToListAsync();
    }

    public async Task<IEnumerable<RecurringTransaction>> GetPendingTransactionsAsync(DateTime asOfDate)
    {
        return await _context.RecurringTransactions
            .Include(r => r.Asset)
            .Where(r => r.IsActive && r.NextRunDate <= asOfDate && (r.EndDate == null || r.EndDate >= asOfDate))
            .OrderBy(r => r.NextRunDate)
            .ToListAsync();
    }

    public async Task<RecurringTransaction?> GetByIdAsync(int id)
    {
        return await _context.RecurringTransactions
            .AsNoTracking()
            .Include(r => r.Asset)
            .FirstOrDefaultAsync(r => r.Id == id);
    }

    public async Task<RecurringTransaction> CreateAsync(RecurringTransaction recurringTransaction)
    {
        recurringTransaction.CreatedAt = DateTime.UtcNow;
        recurringTransaction.UpdatedAt = DateTime.UtcNow;
        _context.RecurringTransactions.Add(recurringTransaction);
        await _context.SaveChangesAsync();

        await _context.Entry(recurringTransaction).Reference(r => r.Asset).LoadAsync();
        return recurringTransaction;
    }

    public async Task<RecurringTransaction?> UpdateAsync(RecurringTransaction recurringTransaction)
    {
        var existing = await _context.RecurringTransactions.FindAsync(recurringTransaction.Id);
        if (existing == null)
            return null;

        existing.Amount = recurringTransaction.Amount;
        existing.Description = recurringTransaction.Description;
        existing.Frequency = recurringTransaction.Frequency;
        existing.DayOfWeek = recurringTransaction.DayOfWeek;
        existing.DayOfMonth = recurringTransaction.DayOfMonth;
        existing.StartDate = recurringTransaction.StartDate;
        existing.EndDate = recurringTransaction.EndDate;
        existing.NextRunDate = recurringTransaction.NextRunDate;
        existing.LastRunDate = recurringTransaction.LastRunDate;
        existing.IsActive = recurringTransaction.IsActive;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await _context.Entry(existing).Reference(r => r.Asset).LoadAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var recurringTransaction = await _context.RecurringTransactions.FindAsync(id);
        if (recurringTransaction == null)
            return false;

        _context.RecurringTransactions.Remove(recurringTransaction);
        await _context.SaveChangesAsync();
        return true;
    }
}
