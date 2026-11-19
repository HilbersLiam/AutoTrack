using System;
using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using MySqlConnector;
using Dapper;

namespace AutoTrack.Repositories;

public class IssueReportRepository : IIssueReport
{
    private readonly MySqlDataSource _connection;

    public IssueReportRepository(MySqlDataSource connection)
    {
        _connection = connection;
    }
    
    public async Task CreateIssueAsync(CreateIssueReportDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            INSERT INTO IssueReport (MachineId, ReportedByUserId, Description, Priority, IssueStatus)
            VALUES (@MachineId, @ReportedByUserId, @Description, @Priority, @IssueStatus);
            """;

        await connection.ExecuteAsync(sql, dto);
    }

    public async Task<List<IssueReportDto>> GetAllAsync()
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            SELECT 
                ir.IssueId AS IssueId,
                ir.MachineId AS MachineId,
                m.MachineName,
                ir.ReportedByUserId AS ReportedByUserId,
                u.FullName AS ReportedByName,
                ir.Description,
                ir.Priority,
                ir.IssueStatus,
                ir.ReportedAt,
                ir.ResolvedAt
            FROM IssueReport ir
            INNER JOIN Machine m ON ir.MachineId = m.MachineId
            INNER JOIN UserAccount u ON ir.ReportedByUserID = u.UserID
            ORDER BY ir.ReportedAt DESC;
            """;

        var issueReports = await connection.QueryAsync<IssueReportDto>(sql);
        return issueReports.ToList();
    }

        public async Task UpdateIssueAsync(int issueId, UpdateIssueStatusDto dto)
        {
            await using var connection = await _connection.OpenConnectionAsync();

            const string sql = """
                UPDATE IssueReport
                SET 
                    IssueStatus = @IssueStatus,
                    ResolvedAt = CASE 
                        WHEN @IssueStatus = 'Resolved' THEN NOW() 
                        ELSE NULL 
                    END
                WHERE IssueId = @IssueId;
                """;

            await connection.ExecuteAsync(sql, new
            {
                IssueId = issueId,
                dto.IssueStatus
            });
        }
}
