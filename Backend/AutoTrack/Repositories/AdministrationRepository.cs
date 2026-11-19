using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace AutoTrack.Repositories;

public class AdministrationRepository : IAdministration
{
    private readonly MySqlDataSource _connection;

    public AdministrationRepository(MySqlDataSource connection)
    {
        _connection = connection;
    }

    public async Task<List<ProductionAreaDto>> GetAreasAsync()
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            SELECT
                AreaID AS AreaId,
                AreaName,
                Description
            FROM ProductionArea
            ORDER BY AreaName ASC;
            """;

        var rows = await connection.QueryAsync<ProductionAreaDto>(sql);
        return rows.ToList();
    }

    public async Task<int> CreateAreaAsync(UpsertProductionAreaDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            INSERT INTO ProductionArea (AreaName, Description)
            VALUES (@AreaName, @Description);
            SELECT LAST_INSERT_ID();
            """;

        return await connection.ExecuteScalarAsync<int>(sql, new
        {
            dto.AreaName,
            Description = string.IsNullOrWhiteSpace(dto.Description)
                ? $"Automotive plant production area: {dto.AreaName}."
                : dto.Description.Trim()
        });
    }

    public async Task<bool> UpdateAreaAsync(int areaId, UpsertProductionAreaDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            UPDATE ProductionArea
            SET AreaName = @AreaName,
                Description = @Description
            WHERE AreaID = @AreaId;
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            AreaId = areaId,
            dto.AreaName,
            Description = string.IsNullOrWhiteSpace(dto.Description)
                ? $"Automotive plant production area: {dto.AreaName}."
                : dto.Description.Trim()
        });

        return affected > 0;
    }

    public async Task<List<MachineSystemDto>> GetSystemsAsync()
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            SELECT
                ms.SystemID AS SystemId,
                ms.AreaID AS AreaId,
                pa.AreaName,
                ms.SystemName,
                ms.Description
            FROM MachineSystem ms
            INNER JOIN ProductionArea pa ON ms.AreaID = pa.AreaID
            ORDER BY pa.AreaName ASC, ms.SystemName ASC;
            """;

        var rows = await connection.QueryAsync<MachineSystemDto>(sql);
        return rows.ToList();
    }

    public async Task<int> CreateSystemAsync(UpsertMachineSystemDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            INSERT INTO MachineSystem (AreaID, SystemName, Description)
            VALUES (@AreaId, @SystemName, @Description);
            SELECT LAST_INSERT_ID();
            """;

        return await connection.ExecuteScalarAsync<int>(sql, new
        {
            dto.AreaId,
            dto.SystemName,
            Description = string.IsNullOrWhiteSpace(dto.Description)
                ? $"{dto.SystemName} system."
                : dto.Description.Trim()
        });
    }

    public async Task<bool> UpdateSystemAsync(int systemId, UpsertMachineSystemDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            UPDATE MachineSystem
            SET AreaID = @AreaId,
                SystemName = @SystemName,
                Description = @Description
            WHERE SystemID = @SystemId;
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            SystemId = systemId,
            dto.AreaId,
            dto.SystemName,
            Description = string.IsNullOrWhiteSpace(dto.Description)
                ? $"{dto.SystemName} system."
                : dto.Description.Trim()
        });

        return affected > 0;
    }

    public async Task<List<AdminMachineDto>> GetMachinesAsync()
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            SELECT
                m.MachineID AS MachineId,
                m.SystemID AS SystemId,
                ms.SystemName,
                ms.AreaID AS AreaId,
                pa.AreaName,
                m.MachineName,
                m.Location,
                m.Description,
                m.IsArchived,
                COALESCE(
                    (
                        SELECT msh.Status
                        FROM MachineStatusHistory msh
                        WHERE msh.MachineID = m.MachineID
                        ORDER BY msh.ChangedAt DESC, msh.StatusHistoryID DESC
                        LIMIT 1
                    ),
                    'Operational'
                ) AS Status
            FROM Machine m
            INNER JOIN MachineSystem ms ON m.SystemID = ms.SystemID
            INNER JOIN ProductionArea pa ON ms.AreaID = pa.AreaID
            ORDER BY m.MachineName ASC;
            """;

        var rows = await connection.QueryAsync<AdminMachineDto>(sql);
        return rows.ToList();
    }

    public async Task<int> CreateMachineAsync(CreateAdminMachineDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        try
        {
            const string insertMachineSql = """
                INSERT INTO Machine (SystemID, MachineName, Location, Description, IsArchived)
                VALUES (@SystemId, @MachineName, @Location, @Description, 0);
                SELECT LAST_INSERT_ID();
                """;

            var machineId = await connection.ExecuteScalarAsync<int>(insertMachineSql, new
            {
                dto.SystemId,
                dto.MachineName,
                Location = dto.Location.Trim(),
                Description = string.IsNullOrWhiteSpace(dto.Description)
                    ? "Automotive equipment fixture."
                    : dto.Description.Trim()
            }, transaction);

            const string insertStatusSql = """
                INSERT INTO MachineStatusHistory (MachineID, ChangedByUserID, Status, ChangedAt)
                VALUES (@MachineId, @ChangedByUserId, @Status, NOW());
                """;

            await connection.ExecuteAsync(insertStatusSql, new
            {
                MachineId = machineId,
                dto.ChangedByUserId,
                dto.Status
            }, transaction);

            await transaction.CommitAsync();
            return machineId;
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }

    public async Task<bool> UpdateMachineAsync(int machineId, UpdateAdminMachineDto dto)
    {
        await using var connection = await _connection.OpenConnectionAsync();
        await using var transaction = await connection.BeginTransactionAsync();

        try
        {
            const string currentStatusSql = """
                SELECT Status
                FROM MachineStatusHistory
                WHERE MachineID = @MachineId
                ORDER BY ChangedAt DESC, StatusHistoryID DESC
                LIMIT 1;
                """;

            var currentStatus = await connection.QueryFirstOrDefaultAsync<string>(
                currentStatusSql,
                new { MachineId = machineId },
                transaction
            );

            const string updateMachineSql = """
                UPDATE Machine
                SET SystemID = @SystemId,
                    MachineName = @MachineName,
                    Location = @Location,
                    Description = @Description,
                    IsArchived = @IsArchived
                WHERE MachineID = @MachineId;
                """;

            var affected = await connection.ExecuteAsync(updateMachineSql, new
            {
                MachineId = machineId,
                dto.SystemId,
                dto.MachineName,
                Location = dto.Location.Trim(),
                Description = string.IsNullOrWhiteSpace(dto.Description)
                    ? "Automotive equipment fixture."
                    : dto.Description.Trim(),
                dto.IsArchived
            }, transaction);

            if (affected == 0)
            {
                await transaction.RollbackAsync();
                return false;
            }

            if (!string.Equals(currentStatus, dto.Status, StringComparison.OrdinalIgnoreCase))
            {
                const string insertStatusSql = """
                    INSERT INTO MachineStatusHistory (MachineID, ChangedByUserID, Status, ChangedAt)
                    VALUES (@MachineId, @ChangedByUserId, @Status, NOW());
                    """;

                await connection.ExecuteAsync(insertStatusSql, new
                {
                    MachineId = machineId,
                    dto.ChangedByUserId,
                    dto.Status
                }, transaction);
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

    public async Task<bool> SetMachineArchivedAsync(int machineId, bool isArchived)
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            UPDATE Machine
            SET IsArchived = @IsArchived
            WHERE MachineID = @MachineId;
            """;

        var affected = await connection.ExecuteAsync(sql, new
        {
            MachineId = machineId,
            IsArchived = isArchived
        });

        return affected > 0;
    }
}