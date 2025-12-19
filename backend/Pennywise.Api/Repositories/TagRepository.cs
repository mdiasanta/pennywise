using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Data;
using Pennywise.Api.Models;

namespace Pennywise.Api.Repositories;

public class TagRepository : ITagRepository
{
    private readonly PennywiseDbContext _context;

    public TagRepository(PennywiseDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Tag>> GetAllByUserAsync(int userId)
    {
        return await _context.Tags
            .AsNoTracking()
            .Where(t => t.UserId == userId)
            .OrderBy(t => t.Name)
            .ToListAsync();
    }

    public async Task<Tag?> GetByIdAsync(int id, int userId)
    {
        return await _context.Tags
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);
    }

    public async Task<Tag?> GetByNameAsync(string name, int userId)
    {
        return await _context.Tags
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Name == name && t.UserId == userId);
    }

    public async Task<Tag> CreateAsync(Tag tag)
    {
        tag.CreatedAt = DateTime.UtcNow;
        tag.UpdatedAt = DateTime.UtcNow;
        _context.Tags.Add(tag);
        await _context.SaveChangesAsync();
        return tag;
    }

    public async Task<Tag?> UpdateAsync(Tag tag)
    {
        var existing = await _context.Tags.FindAsync(tag.Id);
        if (existing == null || existing.UserId != tag.UserId)
            return null;

        existing.Name = tag.Name;
        existing.Color = tag.Color;
        existing.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        var tag = await _context.Tags
            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

        if (tag == null)
            return false;

        _context.Tags.Remove(tag);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<IEnumerable<Tag>> GetByIdsAsync(IEnumerable<int> ids, int userId)
    {
        return await _context.Tags
            .AsNoTracking()
            .Where(t => ids.Contains(t.Id) && t.UserId == userId)
            .ToListAsync();
    }
}
