using System;
using AutoTrack.Models;

namespace AutoTrack.Repositories.Interfaces;

public interface IMachineStatusHistory
{
    Task <List<MachineStatusHistoryDto>> GetAllAsync();
}
