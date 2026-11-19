import { parseLiveOverview } from '../utils/productionAreaMapper'

export type LiveOverview = ReturnType<typeof parseLiveOverview>

const PRODUCTION_AREAS_API_URL = 'http://localhost:5091/api/ProductionArea'

export async function getLiveOverview(
  signal?: AbortSignal
): Promise<LiveOverview> {
  const response = await fetch(PRODUCTION_AREAS_API_URL, { signal })

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`)
  }

  const payload: unknown = await response.json()
  return parseLiveOverview(payload)
}