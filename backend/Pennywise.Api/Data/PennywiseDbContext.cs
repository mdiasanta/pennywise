using Microsoft.EntityFrameworkCore;
using Pennywise.Api.Models;

namespace Pennywise.Api.Data;

public class PennywiseDbContext : DbContext
{
    public PennywiseDbContext(DbContextOptions<PennywiseDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users { get; set; }
    public DbSet<Category> Categories { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<Tag> Tags { get; set; }
    public DbSet<ExpenseTag> ExpenseTags { get; set; }
    public DbSet<ExportAudit> ExportAudits { get; set; }
    public DbSet<ImportAudit> ImportAudits { get; set; }
    public DbSet<AssetCategory> AssetCategories { get; set; }
    public DbSet<Asset> Assets { get; set; }
    public DbSet<AssetSnapshot> AssetSnapshots { get; set; }
    public DbSet<RecurringTransaction> RecurringTransactions { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // User configuration
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Username).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Email).IsRequired().HasMaxLength(255);
            entity.HasIndex(e => e.Email).IsUnique();
            entity.Property(e => e.GoogleSubjectId).HasMaxLength(255);
            entity.HasIndex(e => e.GoogleSubjectId).IsUnique();
            entity.Property(e => e.PictureUrl).HasMaxLength(2048);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // Category configuration
        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Color).HasMaxLength(7);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // UserId is optional - null means default/global category
            entity.HasOne(e => e.User)
                .WithMany(u => u.Categories)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Expense configuration
        modelBuilder.Entity<Expense>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Title).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Date).IsRequired();
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Relationships
            entity.HasOne(e => e.User)
                .WithMany(u => u.Expenses)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Category)
                .WithMany(c => c.Expenses)
                .HasForeignKey(e => e.CategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Tag configuration
        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(50);
            entity.Property(e => e.Color).HasMaxLength(7);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.User)
                .WithMany(u => u.Tags)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.UserId, e.Name }).IsUnique();
        });

        // ExpenseTag (many-to-many join table) configuration
        modelBuilder.Entity<ExpenseTag>(entity =>
        {
            entity.HasKey(et => new { et.ExpenseId, et.TagId });

            entity.HasOne(et => et.Expense)
                .WithMany(e => e.ExpenseTags)
                .HasForeignKey(et => et.ExpenseId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(et => et.Tag)
                .WithMany(t => t.ExpenseTags)
                .HasForeignKey(et => et.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Export audit configuration
        modelBuilder.Entity<ExportAudit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Format).IsRequired().HasMaxLength(10);
            entity.Property(e => e.FilterParams).HasMaxLength(2000);
            entity.Property(e => e.ClientIp).HasMaxLength(45);
            entity.Property(e => e.Timestamp).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.Timestamp);
            entity.HasIndex(e => e.UserId);
        });

        modelBuilder.Entity<ImportAudit>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.FileName).IsRequired().HasMaxLength(255);
            entity.Property(e => e.DuplicateStrategy).IsRequired().HasMaxLength(20);
            entity.Property(e => e.Timezone).HasMaxLength(100);
            entity.Property(e => e.ExternalBatchId).HasMaxLength(100);
            entity.Property(e => e.ErrorsJson).HasMaxLength(4000);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.HasIndex(e => e.CreatedAt);
            entity.HasIndex(e => e.UserId);
        });

        // AssetCategory configuration
        modelBuilder.Entity<AssetCategory>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(100);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.Color).HasMaxLength(7);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
        });

        // Asset configuration
        modelBuilder.Entity<Asset>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Name).IsRequired().HasMaxLength(200);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Color).HasMaxLength(7);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            // Relationships
            entity.HasOne(e => e.User)
                .WithMany(u => u.Assets)
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.AssetCategory)
                .WithMany(c => c.Assets)
                .HasForeignKey(e => e.AssetCategoryId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // AssetSnapshot configuration
        modelBuilder.Entity<AssetSnapshot>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Balance).HasPrecision(18, 2);
            entity.Property(e => e.Date).IsRequired();
            entity.Property(e => e.Notes).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Asset)
                .WithMany(a => a.Snapshots)
                .HasForeignKey(e => e.AssetId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => new { e.AssetId, e.Date });
        });

        // RecurringTransaction configuration
        modelBuilder.Entity<RecurringTransaction>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Amount).HasPrecision(18, 2);
            entity.Property(e => e.Description).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            entity.Property(e => e.UpdatedAt).HasDefaultValueSql("CURRENT_TIMESTAMP");

            entity.HasOne(e => e.Asset)
                .WithMany()
                .HasForeignKey(e => e.AssetId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasIndex(e => e.NextRunDate);
            entity.HasIndex(e => e.IsActive);
        });

        // Seed data for asset categories
        modelBuilder.Entity<AssetCategory>().HasData(
            new AssetCategory { Id = 1, Name = "Checking", Description = "Checking accounts", Color = "#4ECDC4", IsLiability = false, SortOrder = 1, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AssetCategory { Id = 2, Name = "Savings", Description = "Savings accounts", Color = "#45B7D1", IsLiability = false, SortOrder = 2, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AssetCategory { Id = 3, Name = "401k", Description = "401k retirement accounts", Color = "#F7DC6F", IsLiability = false, SortOrder = 3, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AssetCategory { Id = 4, Name = "Roth IRA", Description = "Roth IRA retirement accounts", Color = "#98D8C8", IsLiability = false, SortOrder = 4, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AssetCategory { Id = 5, Name = "Brokerage", Description = "Brokerage investment accounts", Color = "#FFA07A", IsLiability = false, SortOrder = 5, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AssetCategory { Id = 6, Name = "Other Assets", Description = "Other assets like property, vehicles", Color = "#B19CD9", IsLiability = false, SortOrder = 6, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AssetCategory { Id = 7, Name = "Credit Cards", Description = "Credit card debt", Color = "#FF6B6B", IsLiability = true, SortOrder = 7, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AssetCategory { Id = 8, Name = "Loans", Description = "Personal loans, auto loans", Color = "#E74C3C", IsLiability = true, SortOrder = 8, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AssetCategory { Id = 9, Name = "Mortgage", Description = "Home mortgage", Color = "#C0392B", IsLiability = true, SortOrder = 9, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new AssetCategory { Id = 10, Name = "Student Loans", Description = "Student loan debt", Color = "#D35400", IsLiability = true, SortOrder = 10, CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );

        // Seed data for categories
        modelBuilder.Entity<Category>().HasData(
            new Category { Id = 1, Name = "Food & Dining", Description = "Groceries, restaurants, and dining out", Color = "#FF6B6B", CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 2, Name = "Transportation", Description = "Gas, public transport, car maintenance", Color = "#4ECDC4", CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 3, Name = "Shopping", Description = "Clothing, electronics, and general shopping", Color = "#45B7D1", CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 4, Name = "Entertainment", Description = "Movies, games, hobbies, and recreation", Color = "#FFA07A", CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 5, Name = "Bills & Utilities", Description = "Rent, electricity, water, internet", Color = "#98D8C8", CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 6, Name = "Healthcare", Description = "Medical expenses, pharmacy, insurance", Color = "#F7DC6F", CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) },
            new Category { Id = 7, Name = "Other", Description = "Miscellaneous expenses", Color = "#B19CD9", CreatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc), UpdatedAt = new DateTime(2025, 1, 1, 0, 0, 0, DateTimeKind.Utc) }
        );
    }
}
