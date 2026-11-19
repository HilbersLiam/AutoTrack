import type { Issue, IssueStatus, Priority } from '../models'

interface BackendIssueReportDto {
  issueId?: number
  issueID?: number
  machineId?: number
  machineID?: number
  machineName?: string
  reportedByUserId?: number
  reportedByUserID?: number
  reportedByName?: string
  description: string
  priority: Priority
  issueStatus: IssueStatus
  reportedAt: string
  resolvedAt: string | null
}

export interface CreateIssueReportPayload {
  machineId: number
  reportedByUserId: number
  description: string
  priority: Priority
  issueStatus?: IssueStatus
}

export type ApiIssue = Issue & {
  machineName?: string
  reportedByUserId?: number
  reportedByName?: string
}

const API_BASE_URL = 'http://localhost:5091/api/IssueReport'

function mapDtoToIssue(dto: BackendIssueReportDto): ApiIssue {
  const issueId = dto.issueId ?? dto.issueID ?? 0
  const machineId = dto.machineId ?? dto.machineID ?? 0
  const reportedByUserId = dto.reportedByUserId ?? dto.reportedByUserID ?? 0

  return {
    id: String(issueId),
    machineId,
    machineName: dto.machineName,
    reportedByUserId,
    reportedByName: dto.reportedByName,
    description: dto.description,
    priority: dto.priority,
    status: dto.issueStatus,
    createdAt: dto.reportedAt,
    resolvedAt: dto.resolvedAt,
  }
}

export async function getAllIssues(): Promise<ApiIssue[]> {
  const response = await fetch(API_BASE_URL)
  if (!response.ok) {
    throw new Error(`Failed to load issues (${response.status})`)
  }

  const data: BackendIssueReportDto[] = await response.json()
  return data.map(mapDtoToIssue)
}

export async function createIssueReport(payload: CreateIssueReportPayload): Promise<void> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`Failed to report issue (${response.status})`)
  }
}

export async function updateIssueStatus(issueId: string, issueStatus: IssueStatus): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${issueId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ issueStatus }),
  })

  if (!response.ok) {
    throw new Error(`Failed to update issue status (${response.status})`)
  }
}