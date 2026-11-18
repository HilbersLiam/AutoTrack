using System;
using AutoTrack.Models;
using Microsoft.AspNetCore.Mvc;

namespace AutoTrack.Repositories.Interfaces;

public interface IProductionArea
{
    public Task <List<ProductionAreaMachineDto>> GetAllAsync();

}
