using System;
using AutoTrack.Models;

namespace AutoTrack.Repositories.Interfaces;

public interface IIssueReport
{
    Task <List<IssueReportDto>> GetAllAsync();
    Task CreateIssueAsync(CreateIssueReportDto dto);
    Task UpdateIssueAsync(int issueId, UpdateIssueStatusDto dto);
}
