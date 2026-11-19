using AutoTrack.Models;

namespace AutoTrack.Repositories.Interfaces;

public interface IMaintenanceTask
{
    Task<List<MaintenanceTaskDto>> GetAllAsync();
    Task<int> CreateAsync(CreateMaintenanceTaskDto dto);
    Task<bool> UpdateAsync(int taskId, UpdateMaintenanceTaskDto dto);
    Task<bool> UpdateStatusAsync(int taskId, UpdateMaintenanceTaskStatusDto dto);
    Task<List<PartDto>> GetAllPartsAsync();
}