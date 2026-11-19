using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace AutoTrack.Repositories;

public class MaintenanceTaskRepository : IMaintenanceTask
{
    private readonly MySqlDataSource _connection;

    public MaintenanceTaskRepository(MySqlDataSource connection)
    {
        _connection = connection;
    }

    public async Task<List<MaintenanceTaskDto>> GetAllAsync()
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            SELECT
                mt.TaskID AS TaskId,
                mt.MachineID AS MachineId,
                m.MachineName,
                mt.IssueID AS IssueId,
                mt.AssignedTechnicianID AS AssignedTechnicianId,
                u.FullName AS AssignedTechnicianName,
                mt.CreatedByUserID AS CreatedByUserId,
                mt.LastUpdatedByUserID AS LastUpdatedByUserId,
                mt.TaskDescription,
                mt.TaskStatus,
                mt.CreatedAt,
                mt.DueAt,
                mt.CompletedAt,
                mt.WorkPerformed,
                mt.LastUpdatedAt
            FROM MaintenanceTask mt
            INNER JOIN Machine m ON mt.MachineID = m.MachineID
            LEFT JOIN UserAccount u ON mt.AssignedTechnicianID = u.UserID
            ORDER BY mt.DueAt ASC;

            SELECT
                mtp.TaskID AS TaskId,
                mtp.PartID AS PartId,
                p.PartNumber,
                p.PartName,
                mtp.QuantityUsed
            FROM MaintenanceTaskPart mtp
            INNER JOIN Part p ON mtp.PartID = p.PartID;
            """;

        using var multi = await connection.QueryMultipleAsync(sql);

        var tasks = (await multi.ReadAsync<MaintenanceTaskDto>()).ToList();
        var partRows = (await multi.ReadAsync<TaskPartJoinRow>()).ToList();

        var partsByTask = partRows
            .GroupBy(r => r.TaskId)
            .ToDictionary(
                g => g.Key,
                g => g.Select(r => new MaintenanceTaskPartDto
                {
                    PartId = r.PartId,
                    PartNumber = r.PartNumber,
                    PartName = r.PartName,
                    QuantityUsed = r.QuantityUsed
                }).ToList()
            );

        foreach (var task in tasks)
        {
            if (partsByTask.TryGetValue(task.TaskId, out var parts))
            {
                task.PartsUsed = parts;
            }
        }

        return tasks;
    }

    public async Task<int> CreateAsync(CreateMaintenanceTaskDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            INSERT INTO MaintenanceTask (
                MachineID,
                IssueID,
                AssignedTechnicianID,
                CreatedByUserID,
                LastUpdatedByUserID,
                TaskDescription,
                TaskStatus,
                CreatedAt,
                DueAt,
                LastUpdatedAt
            )
            VALUES (
                @MachineId,
                @IssueId,
                @AssignedTechnicianId,
                @CreatedByUserId,
                @CreatedByUserId,
                @TaskDescription,
                'Scheduled',
                NOW(),
                @DueAt,
                NOW()
            );
            SELECT LAST_INSERT_ID();
            """;

        return await connection.ExecuteScalarAsync<int>(sql, dto);
    }

    public async Task<bool> UpdateAsync(int taskId, UpdateMaintenanceTaskDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        try
        {
            const string updateTaskSql = """
                UPDATE MaintenanceTask
                SET
                    MachineID = @MachineId,
                    IssueID = @IssueId,
                    AssignedTechnicianID = @AssignedTechnicianId,
                    LastUpdatedByUserID = @LastUpdatedByUserId,
                    TaskDescription = @TaskDescription,
                    DueAt = @DueAt,
                    WorkPerformed = @WorkPerformed,
                    LastUpdatedAt = NOW()
                WHERE TaskID = @TaskId;
                """;

            var affected = await connection.ExecuteAsync(updateTaskSql, new
            {
                TaskId = taskId,
                dto.MachineId,
                dto.IssueId,
                dto.AssignedTechnicianId,
                dto.LastUpdatedByUserId,
                dto.TaskDescription,
                dto.DueAt,
                dto.WorkPerformed
            }, transaction);

            if (affected == 0)
            {
                await transaction.RollbackAsync();
                return false;
            }

            const string deletePartsSql = """
                DELETE FROM MaintenanceTaskPart
                WHERE TaskID = @TaskId;
                """;

            await connection.ExecuteAsync(deletePartsSql, new { TaskId = taskId }, transaction);

            if (dto.PartsUsed.Count > 0)
            {
                // Merge duplicate PartIds if any slipped through
                var consolidatedParts = dto.PartsUsed
                    .Where(p => p.QuantityUsed > 0)
                    .GroupBy(p => p.PartId)
                    .Select(g => new
                    {
                        TaskId = taskId,
                        PartId = g.Key,
                        QuantityUsed = g.Sum(x => x.QuantityUsed)
                    })
                    .ToList();

                const string insertPartSql = """
                    INSERT INTO MaintenanceTaskPart (TaskID, PartID, QuantityUsed)
                    VALUES (@TaskId, @PartId, @QuantityUsed);
                    """;

                await connection.ExecuteAsync(insertPartSql, consolidatedParts, transaction);
            }

            await transaction.CommitAsync();
            return true;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> UpdateStatusAsync(int taskId, UpdateMaintenanceTaskStatusDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            UPDATE MaintenanceTask
            SET
                TaskStatus = @TaskStatus,
                LastUpdatedByUserID = @LastUpdatedByUserId,
                LastUpdatedAt = NOW(),
                CompletedAt = CASE
                    WHEN @TaskStatus = 'Completed' THEN NOW()
                    ELSE NULL
                END
            WHERE TaskID = @TaskId;
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            TaskId = taskId,
            dto.TaskStatus,
            dto.LastUpdatedByUserId
        });

        return affected > 0;
    }

    public async Task<List<PartDto>> GetAllPartsAsync()
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            SELECT
                PartID AS PartId,
                PartNumber,
                PartName,
                Description
            FROM Part
            ORDER BY PartNumber ASC;
            """;

        var parts = await connection.QueryAsync<PartDto>(sql);
        return parts.ToList();
    }

    private sealed class TaskPartJoinRow
    {
        public int TaskId { get; set; }
        public int PartId { get; set; }
        public string PartNumber { get; set; } = string.Empty;
        public string PartName { get; set; } = string.Empty;
        public int QuantityUsed { get; set; }
    }
}