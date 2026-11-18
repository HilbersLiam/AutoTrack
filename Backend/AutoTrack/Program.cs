using DotEnv.Core;
using MySqlConnector;

// Load the .env variables
new EnvLoader().Load();

var builder = WebApplication.CreateBuilder(args);

// Register MySql DataSource
builder.Services.AddMySqlDataSource(builder.Configuration.GetConnectionString("Default")!);

builder.Services.AddControllers();

builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
