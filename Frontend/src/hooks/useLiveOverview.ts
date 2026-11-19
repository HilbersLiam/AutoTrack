import { useEffect, useState } from 'react'
import { getLiveOverview } from '../api/productionAreas'
import type { LiveOverview } from '../api/productionAreas'

export type OverviewState =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready'; overview: LiveOverview }

export function useLiveOverview(): OverviewState {
  const [live, setLive] = useState<OverviewState>({ state: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    getLiveOverview(controller.signal)
      .then((overview) => {
        if (!controller.signal.aborted) {
          setLive({ state: 'ready', overview })
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLive({
            state: 'error',
            message: error instanceof Error ? error.message : 'Request failed.'
          })
        }
      })

    return () => controller.abort()
  }, [])

  return live
}