import { ChevronDown, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useModels } from '@/store/models'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ModelIcon } from '@/components/chat/model-icon'
import { cn } from '@/lib/utils'

interface ModelPickerProps {
  value: string
  onChange: (id: string) => void
  className?: string
}

/**
 * ModelPicker — driven by the backend model registry. Falls back to the local
 * mock model bundle when the registry hasn't loaded yet, so the picker is
 * always populated.
 */
export function ModelPicker({ value, onChange, className }: ModelPickerProps) {
  const models = useModels((s) => s.models)
  const current = models.find((m) => m.id === value) ?? models[0]
  const { t } = useTranslation('chat')
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px]',
          'text-[13px] font-medium text-[var(--color-fg-muted)]',
          'hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-fg)] interactive',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
          'max-w-[180px]',
          className,
        )}
        aria-label={t('modelPicker.label', { name: current?.label ?? 'Model' })}
      >
        <ModelIcon icon={current?.icon} size={13} />
        <span className="truncate">{current?.label ?? 'Model'}</span>
        <ChevronDown size={13} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end" className="w-[320px]">
        <DropdownMenuLabel>{t('modelPicker.section')}</DropdownMenuLabel>
        {models.map((m) => {
          const active = m.id === value
          const locked = Boolean(m.locked)
          return (
            <DropdownMenuItem
              key={m.id}
              onSelect={(e) => {
                // Locked models stay visible (§ user groups) but route to the
                // subscription page to upgrade rather than becoming selectable.
                if (locked) {
                  e.preventDefault()
                  navigate('/subscription')
                  return
                }
                onChange(m.id)
              }}
              className={cn('items-start py-2.5 gap-2', locked && 'opacity-70')}
            >
              <ModelIcon icon={m.icon} size={16} className={cn('mt-0.5', locked && 'grayscale')} />
              <div className="flex flex-col gap-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--color-fg)] truncate">{m.label}</span>
                  {locked ? (
                    <Lock size={12} aria-hidden className="ml-auto shrink-0 text-[var(--color-fg-subtle)]" />
                  ) : active ? (
                    <span
                      className="ml-auto size-1.5 rounded-full bg-[var(--color-accent)] shrink-0"
                      aria-label={t('modelPicker.current')}
                    />
                  ) : null}
                </div>
                {locked ? (
                  <span className="text-[11.5px] text-[var(--color-accent)] leading-snug">
                    {t('modelPicker.upgrade')}
                  </span>
                ) : m.description ? (
                  <span className="text-[11.5px] text-[var(--color-fg-muted)] leading-snug">
                    {m.description}
                  </span>
                ) : null}
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
