/**
 * IconPicker — a searchable dropdown over the full lucide-react icon set, used
 * by the param_controls visual editor so admins pick an icon instead of typing
 * its name. The chosen value is stored in PascalCase (e.g. "Brain"); both
 * PascalCase and kebab-case render correctly via the param-controls LucideIcon.
 */
import { useMemo, useState, type ComponentType } from 'react'
import { useTranslation } from 'react-i18next'
import * as Icons from 'lucide-react'
import { ChevronDown, Search, X } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type IconComponent = ComponentType<{ size?: number; 'aria-hidden'?: boolean }>

// All lucide icon exports, normalised to one entry per icon. lucide ships both
// "Brain" and the "BrainIcon" alias plus a few non-icon helpers — keep only the
// PascalCase component names without the "Icon" suffix.
const ALL_ICON_NAMES: string[] = Object.keys(Icons)
  .filter((k) => /^[A-Z][A-Za-z0-9]*$/.test(k) && !k.endsWith('Icon') && k !== 'LucideIcon')
  .filter((k) => {
    const v = (Icons as Record<string, unknown>)[k]
    return typeof v === 'object' || typeof v === 'function'
  })
  .sort()

// "Brain" → "brain", "ArrowUp" → "arrow up" for fuzzy search matching.
function searchable(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase()
}

function GlyphFor({ name, size = 16 }: { name: string; size?: number }) {
  const C = (Icons as unknown as Record<string, IconComponent>)[name]
  if (!C) return null
  return <C size={size} aria-hidden />
}

interface IconPickerProps {
  value: string
  onChange: (name: string) => void
  className?: string
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  const { t } = useTranslation(['admin', 'common'])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  // Resolve the stored value (PascalCase or kebab) to a PascalCase key so the
  // trigger can preview it.
  const previewName = useMemo(() => {
    if (!value) return ''
    const pascal = value
      .split('-')
      .map((s) => (s ? s[0].toUpperCase() + s.slice(1) : s))
      .join('')
    return (Icons as Record<string, unknown>)[pascal] ? pascal : ''
  }, [value])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return ALL_ICON_NAMES.slice(0, 120)
    return ALL_ICON_NAMES.filter((n) => searchable(n).includes(q)).slice(0, 120)
  }, [query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-9 w-full items-center gap-2 rounded-[8px] border border-[var(--color-border)] bg-[var(--color-bg)] px-2.5 text-left text-[13px] text-[var(--color-fg)] interactive hover:bg-[var(--color-bg-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
            className,
          )}
        >
          {previewName ? <GlyphFor name={previewName} size={15} /> : null}
          <span className={cn('flex-1 min-w-0 truncate font-mono text-[12px]', !value && 'text-[var(--color-fg-faint)]')}>
            {value || t('common:actions.search', { defaultValue: 'Select icon' })}
          </span>
          {value ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={t('common:actions.clear', { defaultValue: 'Clear' })}
              onClick={(e) => {
                e.stopPropagation()
                onChange('')
              }}
              className="inline-flex items-center justify-center rounded text-[var(--color-fg-faint)] hover:text-[var(--color-fg)]"
            >
              <X size={13} aria-hidden />
            </span>
          ) : (
            <ChevronDown size={14} aria-hidden className="text-[var(--color-fg-faint)]" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-2">
        <div className="relative mb-2">
          <Search size={13} aria-hidden className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-fg-faint)]" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common:actions.search', { defaultValue: 'Search' })}
            className="h-8 pl-8 text-[12px]"
          />
        </div>
        <div className="grid grid-cols-6 gap-1 max-h-[240px] overflow-y-auto scrollbar-thin">
          {results.map((name) => (
            <button
              key={name}
              type="button"
              title={name}
              onClick={() => {
                onChange(name)
                setOpen(false)
                setQuery('')
              }}
              className={cn(
                'inline-flex items-center justify-center size-9 rounded-[8px] text-[var(--color-fg-muted)] interactive hover:bg-[var(--color-bg-muted)] hover:text-[var(--color-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                previewName === name && 'bg-[var(--color-secondary-soft)] text-[var(--color-secondary)]',
              )}
            >
              <GlyphFor name={name} />
            </button>
          ))}
          {results.length === 0 ? (
            <p className="col-span-6 px-1 py-3 text-center text-[12px] text-[var(--color-fg-subtle)]">
              {t('admin:common.noResults', { defaultValue: 'No icons found' })}
            </p>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  )
}
