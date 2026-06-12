/**
 * AdminSettings — truly global knobs that don't belong on a specialised page:
 * default + task model, long-context compression, memories, signup gate,
 * daily quotas.
 *
 * Document-related settings (embedding model, MinerU, storage, upload
 * extensions) live on /admin/documents. Tool-call settings (search, sandbox)
 * live on /admin/tools. We PATCH only the keys this page owns to stay
 * race-free with concurrent edits on those pages.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { adminApi, ApiError } from '@/api'
import type { ApiModel } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'

type Settings = Record<string, unknown>

const OWNED_KEYS = [
  'default_model_id',
  'task_model_id',
  'keep_recent_rounds',
  'summary_max_tokens',
  'compaction_enabled',
  'memory_enabled',
  'signup_open',
  'daily_message_limit',
  'daily_image_limit',
] as const

export default function AdminSettings() {
  const { t } = useTranslation(['admin', 'common'])
  const [models, setModels] = useState<ApiModel[]>([])
  const [draft, setDraft] = useState<Settings>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [s, m] = await Promise.all([adminApi.settings(), adminApi.models('chat')])
      setDraft(s)
      setModels(m)
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('admin:common.failed'))
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function save() {
    setSaving(true)
    try {
      const patch: Settings = {}
      for (const k of OWNED_KEYS) {
        if (k in draft) patch[k] = draft[k]
      }
      await adminApi.updateSettings(patch)
      toast.success(t('admin:settings.saved'))
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : t('admin:common.failed'))
    } finally {
      setSaving(false)
    }
  }

  function readString(key: string, fallback = ''): string {
    const v = draft[key]
    return typeof v === 'string' ? v : fallback
  }
  function readNumber(key: string, fallback = 0): number {
    const v = draft[key]
    return typeof v === 'number' ? v : fallback
  }
  function readBool(key: string, fallback = false): boolean {
    const v = draft[key]
    return typeof v === 'boolean' ? v : fallback
  }

  return (
    <div>
      <header>
        <h1 className="font-serif text-3xl tracking-tight text-[var(--color-fg)]">{t('admin:settings.title')}</h1>
        <p className="mt-2 text-[var(--color-fg-muted)] text-sm max-w-2xl">{t('admin:settings.lead')}</p>
      </header>

      {loading ? (
        <div className="mt-8 text-sm text-[var(--color-fg-subtle)]">{t('admin:common.loading')}</div>
      ) : (
        <section className="mt-8 flex flex-col gap-5 max-w-xl">
          <Field label={t('admin:settings.fields.defaultModel')} htmlFor="def-model">
            <Select
              value={readString('default_model_id')}
              onValueChange={(v) => setDraft({ ...draft, default_model_id: v })}
            >
              <SelectTrigger id="def-model">
                <SelectValue placeholder={t('admin:settings.fields.pickModel')} />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label={t('admin:settings.fields.taskModel')}
            htmlFor="task-model"
            hint={t('admin:settings.fields.taskModelHint')}
          >
            <Select
              value={readString('task_model_id')}
              onValueChange={(v) => setDraft({ ...draft, task_model_id: v })}
            >
              <SelectTrigger id="task-model">
                <SelectValue placeholder={t('admin:settings.fields.pickModel')} />
              </SelectTrigger>
              <SelectContent>
                {models.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('admin:settings.fields.keep')} htmlFor="keep">
              <Input
                id="keep"
                type="number"
                value={String(readNumber('keep_recent_rounds', 6))}
                onChange={(e) => setDraft({ ...draft, keep_recent_rounds: Number(e.target.value) })}
              />
            </Field>
            <Field label={t('admin:settings.fields.sumTokens')} htmlFor="sumtokens">
              <Input
                id="sumtokens"
                type="number"
                value={String(readNumber('summary_max_tokens', 2048))}
                onChange={(e) => setDraft({ ...draft, summary_max_tokens: Number(e.target.value) })}
              />
            </Field>
          </div>

          <ToggleRow
            label={t('admin:settings.fields.compactionEnabled')}
            checked={readBool('compaction_enabled', true)}
            onChange={(v) => setDraft({ ...draft, compaction_enabled: v })}
          />
          <ToggleRow
            label={t('admin:settings.fields.memoryEnabled')}
            checked={readBool('memory_enabled', true)}
            onChange={(v) => setDraft({ ...draft, memory_enabled: v })}
          />
          <ToggleRow
            label={t('admin:settings.fields.signupOpen')}
            checked={readBool('signup_open', true)}
            onChange={(v) => setDraft({ ...draft, signup_open: v })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Field label={t('admin:settings.fields.dailyMessageLimit')} htmlFor="dmsg">
              <Input
                id="dmsg"
                type="number"
                value={String(readNumber('daily_message_limit', 200))}
                onChange={(e) => setDraft({ ...draft, daily_message_limit: Number(e.target.value) })}
              />
            </Field>
            <Field label={t('admin:settings.fields.dailyImageLimit')} htmlFor="dimg">
              <Input
                id="dimg"
                type="number"
                value={String(readNumber('daily_image_limit', 30))}
                onChange={(e) => setDraft({ ...draft, daily_image_limit: Number(e.target.value) })}
              />
            </Field>
          </div>

          <div className="flex justify-end">
            <Button loading={saving} onClick={() => void save()}>
              {t('common:actions.save')}
            </Button>
          </div>
        </section>
      )}
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-[10px] border border-[var(--color-border)] bg-[var(--color-bg-muted)] px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  )
}
