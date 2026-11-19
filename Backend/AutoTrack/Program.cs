using AutoTrack.Repositories;
using AutoTrack.Repositories.Interfaces;
using DotEnv.Core;
using MySqlConnector;

// Load the .env variables
new EnvLoader().Load();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
// Register MySql DataSource
builder.Services.AddMySqlDataSource(builder.Configuration.GetConnectionString("Default")!);
builder.Services.AddScoped<IProductionArea, ProductionAreaRepository>();
builder.Services.AddScoped<IIssueReport, IssueReportRepository>();
builder.Services.AddScoped<IMaintenanceTask, MaintenanceTaskRepository>();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5174")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.UseCors("ReactApp");

app.MapControllers();

app.Run();
