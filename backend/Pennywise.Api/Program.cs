using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;
using Pennywise.Api.BackgroundServices;
using Pennywise.Api.Data;
using Pennywise.Api.Repositories;
using Pennywise.Api.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

// Add controllers
builder.Services.AddControllers();

// Add DbContext
builder.Services.AddDbContext<PennywiseDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

// Register repositories
builder.Services.AddScoped<IExpenseRepository, ExpenseRepository>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IExportAuditRepository, ExportAuditRepository>();
builder.Services.AddScoped<IImportAuditRepository, ImportAuditRepository>();
builder.Services.AddScoped<IAssetCategoryRepository, AssetCategoryRepository>();
builder.Services.AddScoped<IAssetRepository, AssetRepository>();
builder.Services.AddScoped<IAssetSnapshotRepository, AssetSnapshotRepository>();
builder.Services.AddScoped<IRecurringTransactionRepository, RecurringTransactionRepository>();
builder.Services.AddScoped<ITagRepository, TagRepository>();
builder.Services.AddScoped<ISplitwiseAutoImportRepository, SplitwiseAutoImportRepository>();

// Register services
builder.Services.AddScoped<IExpenseService, ExpenseService>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ISummaryService, SummaryService>();
builder.Services.AddScoped<IExportAuditService, ExportAuditService>();
builder.Services.AddScoped<IImportAuditService, ImportAuditService>();
builder.Services.AddScoped<IExpenseImportService, ExpenseImportService>();
builder.Services.AddScoped<IAssetCategoryService, AssetCategoryService>();
builder.Services.AddScoped<IAssetService, AssetService>();
builder.Services.AddScoped<IAssetSnapshotService, AssetSnapshotService>();
builder.Services.AddScoped<IAssetSnapshotImportService, AssetSnapshotImportService>();
builder.Services.AddScoped<INetWorthService, NetWorthService>();
builder.Services.AddScoped<IRecurringTransactionService, RecurringTransactionService>();
builder.Services.AddScoped<ITagService, TagService>();
builder.Services.AddScoped<ISplitwiseService, SplitwiseService>();
builder.Services.AddScoped<ICapitalOneImportService, CapitalOneImportService>();

// Register background services
builder.Services.AddHostedService<RecurringTransactionProcessor>();
builder.Services.AddHostedService<SplitwiseAutoImportProcessor>();

// Register Google token validator
builder.Services.AddHttpClient("GoogleTokenValidator");
builder.Services.AddHttpClient("SplitwiseApi");
builder.Services.AddScoped<IGoogleTokenValidator, GoogleTokenValidator>();

// Add cookie authentication
// For self-hosted deployments (e.g., Raspberry Pi) without HTTPS, set Authentication:RequireHttps=false
var requireHttps = builder.Configuration.GetValue("Authentication:RequireHttps", !builder.Environment.IsDevelopment());

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "pennywise_auth";
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = requireHttps ? SameSiteMode.None : SameSiteMode.Lax;
        options.Cookie.SecurePolicy = requireHttps ? CookieSecurePolicy.Always : CookieSecurePolicy.SameAsRequest;
        options.ExpireTimeSpan = TimeSpan.FromDays(7);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

builder.Services.AddAuthorization();

// Add CORS
var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? ["http://localhost:3000", "http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyHeader()
                  .AllowAnyMethod()
                  .AllowCredentials();
        });
});

var app = builder.Build();

// Apply migrations automatically in development
if (app.Environment.IsDevelopment())
{
    using (var scope = app.Services.CreateScope())
    {
        var db = scope.ServiceProvider.GetRequiredService<PennywiseDbContext>();
        db.Database.Migrate();
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowFrontend");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

// Map controllers
app.MapControllers();

app.Run();
