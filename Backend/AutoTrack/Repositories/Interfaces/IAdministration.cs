using AutoTrack.Models;

namespace AutoTrack.Repositories.Interfaces;

public interface IAdministration
{
    Task<List<ProductionAreaDto>> GetAreasAsync();
    Task<int> CreateAreaAsync(UpsertProductionAreaDto dto);
    Task<bool> UpdateAreaAsync(int areaId, UpsertProductionAreaDto dto);

    Task<List<MachineSystemDto>> GetSystemsAsync();
    Task<int> CreateSystemAsync(UpsertMachineSystemDto dto);
    Task<bool> UpdateSystemAsync(int systemId, UpsertMachineSystemDto dto);

    Task<List<AdminMachineDto>> GetMachinesAsync();
    Task<int> CreateMachineAsync(CreateAdminMachineDto dto);
    Task<bool> UpdateMachineAsync(int machineId, UpdateAdminMachineDto dto);
    Task<bool> SetMachineArchivedAsync(int machineId, bool isArchived);
}