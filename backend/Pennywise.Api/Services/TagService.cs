using Pennywise.Api.DTOs;
using Pennywise.Api.Models;
using Pennywise.Api.Repositories;

namespace Pennywise.Api.Services;

public class TagService : ITagService
{
    private readonly ITagRepository _tagRepository;

    public TagService(ITagRepository tagRepository)
    {
        _tagRepository = tagRepository;
    }

    public async Task<IEnumerable<TagDto>> GetAllByUserAsync(int userId)
    {
        var tags = await _tagRepository.GetAllByUserAsync(userId);
        return tags.Select(MapToDto);
    }

    public async Task<TagDto?> GetByIdAsync(int id, int userId)
    {
        var tag = await _tagRepository.GetByIdAsync(id, userId);
        return tag != null ? MapToDto(tag) : null;
    }

    public async Task<TagDto> CreateAsync(int userId, CreateTagDto createDto)
    {
        // Check for duplicate tag name for this user
        var existingTag = await _tagRepository.GetByNameAsync(createDto.Name, userId);
        if (existingTag != null)
        {
            throw new InvalidOperationException($"A tag with the name '{createDto.Name}' already exists.");
        }

        var tag = new Tag
        {
            Name = createDto.Name,
            Color = createDto.Color,
            UserId = userId
        };

        var created = await _tagRepository.CreateAsync(tag);
        return MapToDto(created);
    }

    public async Task<TagDto?> UpdateAsync(int id, int userId, UpdateTagDto updateDto)
    {
        var existing = await _tagRepository.GetByIdAsync(id, userId);
        if (existing == null)
            return null;

        // Check for duplicate tag name if name is being changed
        if (updateDto.Name != null && updateDto.Name != existing.Name)
        {
            var duplicateTag = await _tagRepository.GetByNameAsync(updateDto.Name, userId);
            if (duplicateTag != null)
            {
                throw new InvalidOperationException($"A tag with the name '{updateDto.Name}' already exists.");
            }
        }

        var tag = new Tag
        {
            Id = id,
            Name = updateDto.Name ?? existing.Name,
            Color = updateDto.Color ?? existing.Color,
            UserId = userId
        };

        var updated = await _tagRepository.UpdateAsync(tag);
        return updated != null ? MapToDto(updated) : null;
    }

    public async Task<bool> DeleteAsync(int id, int userId)
    {
        return await _tagRepository.DeleteAsync(id, userId);
    }

    private static TagDto MapToDto(Tag tag)
    {
        return new TagDto
        {
            Id = tag.Id,
            Name = tag.Name,
            Color = tag.Color,
            CreatedAt = tag.CreatedAt,
            UpdatedAt = tag.UpdatedAt,
            UserId = tag.UserId
        };
    }
}
