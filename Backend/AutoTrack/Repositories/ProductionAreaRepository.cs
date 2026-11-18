using AutoTrack.Models;
using AutoTrack.Repositories.Interfaces;
using Dapper;
using MySqlConnector;

namespace AutoTrack.Repositories;

public class ProductionAreaRepository : IProductionArea
{
    private readonly MySqlDataSource _connection;

    public ProductionAreaRepository(MySqlDataSource connection)
    {
        _connection = connection;
    }
    
    public async Task<List<ProductionAreaMachineDto>> GetAllAsync()
    {
        await using var connection = await _connection.OpenConnectionAsync();
        var prodAreaMachines = await connection.QueryAsync<ProductionAreaMachineDto>("""
            SELECT
                pa.AreaID,
                pa.AreaName,
                m.MachineID,
                m.MachineName,
                msh.Status AS CurrentStatus

            FROM ProductionArea pa

            LEFT JOIN MachineSystem ms
                ON pa.AreaID = ms.AreaID

            LEFT JOIN Machine m
                ON ms.SystemID = m.SystemID
                AND m.IsArchived = 0

            LEFT JOIN MachineStatusHistory msh
                ON msh.StatusHistoryID = (
                    SELECT msh2.StatusHistoryID
                    FROM MachineStatusHistory msh2
                    WHERE msh2.MachineID = m.MachineID
                    ORDER BY msh2.ChangedAt DESC,
                             msh2.StatusHistoryID DESC
                    LIMIT 1
                )

            ORDER BY pa.AreaID, m.MachineID;
            """);
        return prodAreaMachines.ToList();

    }
}
