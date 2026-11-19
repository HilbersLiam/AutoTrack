using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace AutoTrack.Repositories;

public class MachineStatusHistoryRepository : IMachineStatusHistory
{
    private readonly MySqlDataSource _connection;

    public MachineStatusHistoryRepository(MySqlDataSource connection)
    {
        _connection = connection;
    }

    public async Task<List<MachineStatusHistoryDto>> GetAllAsync()
    {
        await using var connection = await _connection.OpenConnectionAsync();

        const string sql = """
            SELECT
                msh.StatusHistoryID AS StatusHistoryId,
                msh.MachineID AS MachineId,
                m.MachineName,
                pa.AreaName,
                ms.SystemName,
                msh.ChangedByUserID AS ChangedByUserId,
                u.FullName AS ChangedByName,
                msh.Status,
                msh.ChangedAt
            FROM MachineStatusHistory msh
            INNER JOIN Machine m ON msh.MachineID = m.MachineID
            INNER JOIN MachineSystem ms ON m.SystemID = ms.SystemID
            INNER JOIN ProductionArea pa ON ms.AreaID = pa.AreaID
            INNER JOIN UserAccount u ON msh.ChangedByUserID = u.UserID
            ORDER BY msh.ChangedAt DESC, msh.StatusHistoryID DESC;
            """;

        var rows = await connection.QueryAsync<MachineStatusHistoryDto>(sql);
        return rows.ToList();
    }
}