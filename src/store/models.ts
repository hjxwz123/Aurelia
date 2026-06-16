/**
 * Models store — hydrates the chat-model picker from the backend. While the
 * backend is loading we expose an empty array; consumers must handle that.
 *
 * We deliberately don't carry a local mock fallback — every model the picker
 * shows must come from the configured channels/models tables so the user
 * never picks something that won't actually run.
 */
import { create } from 'zustand'
import { modelsApi, ApiError } from '@/api'
import type { ApiModel, ApiModelTag } from '@/api/types'

interface ModelStore {
  models: ApiModel[]
  /** Admin-managed tags (§ model tags) — drives the picker's filter chips. */
  tags: ApiModelTag[]
  defaultId: string
  loaded: boolean
  loading: boolean
  error: string | null

  load: () => Promise<void>
  getById: (id: string) => ApiModel | undefined
}

export const useModels = create<ModelStore>((set, get) => ({
  models: [],
  tags: [],
  defaultId: '',
  loaded: false,
  loading: false,
  error: null,

  async load() {
    if (get().loading) return
    set({ loading: true, error: null })
    try {
      // Tags are optional decoration for the picker — never let a tag-fetch
      // failure block the model list.
      const [resp, tags] = await Promise.all([modelsApi.list(), modelsApi.tags().catch(() => [])])
      set({
        models: resp.models,
        tags,
        defaultId: resp.default_id || resp.models[0]?.id || '',
        loaded: true,
        loading: false,
      })
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Failed to load models'
      set({ error: msg, loading: false })
    }
  },

  getById(id) {
    return get().models.find((m) => m.id === id)
  },
}))
