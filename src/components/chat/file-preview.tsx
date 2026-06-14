/**
 * FilePreview — a modal that previews a conversation attachment instead of
 * downloading it on click. Renders images, PDFs (iframe), plain-text/code
 * (fetched), and Word .docx (converted to HTML via mammoth, lazy-loaded).
 * Anything else falls back to a card with open / download actions, so a click
 * never silently triggers a download.
 */
import { useEffect, useState } from 'react'
import { ExternalLink, Download, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Attachment } from '@/types/chat'
import { cn } from '@/lib/utils'

interface PreviewFile {
  name: string
  url?: string
  kind: Attachment['kind']
}

interface FilePreviewProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  file: PreviewFile | null
}

const TEXT_EXTS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'yaml', 'yml', 'xml', 'html', 'htm',
  'js', 'ts', 'tsx', 'jsx', 'py', 'go', 'java', 'c', 'cpp', 'h', 'hpp', 'rs', 'rb', 'php', 'sh',
  'sql', 'css', 'scss', 'toml', 'ini', 'env', 'conf',
])

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i + 1).toLowerCase() : ''
}

type Status = 'loading' | 'ready' | 'error' | 'unsupported'

export function FilePreview({ open, onOpenChange, file }: FilePreviewProps) {
  const { t } = useTranslation(['chat', 'common'])
  const [status, setStatus] = useState<Status>('loading')
  const [text, setText] = useState<string | null>(null)
  const [html, setHtml] = useState<string | null>(null)

  const url = file?.url
  const name = file?.name ?? ''
  const ext = extOf(name)
  const isImage = file?.kind === 'image'
  const isPdf = ext === 'pdf' || file?.kind === 'pdf'
  const isDocx = ext === 'docx'
  const isText = TEXT_EXTS.has(ext) || (file?.kind === 'code' && ext !== 'docx')

  useEffect(() => {
    if (!open || !url) return
    let cancelled = false
    setText(null)
    setHtml(null)
    setStatus('loading')

    async function run(fileUrl: string) {
      if (isImage || isPdf) {
        setStatus('ready')
        return
      }
      if (isText) {
        try {
          const r = await fetch(fileUrl)
          if (!r.ok) throw new Error(String(r.status))
          const tx = await r.text()
          if (!cancelled) {
            setText(tx.length > 200_000 ? tx.slice(0, 200_000) + '\n…' : tx)
            setStatus('ready')
          }
        } catch {
          if (!cancelled) setStatus('error')
        }
        return
      }
      if (isDocx) {
        try {
          const buf = await (await fetch(fileUrl)).arrayBuffer()
          const mammoth = await import('mammoth')
          const res = await mammoth.convertToHtml({ arrayBuffer: buf })
          if (!cancelled) {
            setHtml(res.value || '')
            setStatus('ready')
          }
        } catch {
          if (!cancelled) setStatus('error')
        }
        return
      }
      setStatus('unsupported')
    }

    void run(url)
    return () => {
      cancelled = true
    }
  }, [open, url, isImage, isPdf, isText, isDocx])

  if (!file) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="xl" className="max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8 text-lg">{name}</DialogTitle>
        </DialogHeader>

        <DialogBody className="min-h-[42vh]">
          {status === 'loading' ? (
            <div className="grid h-[42vh] place-items-center text-sm text-[var(--color-fg-subtle)]">
              {t('common:common.loading')}
            </div>
          ) : isImage && url ? (
            <img
              src={url}
              alt={name}
              className="mx-auto max-h-[72vh] w-auto rounded-[10px] object-contain"
              draggable={false}
            />
          ) : isPdf && url ? (
            <iframe src={url} title={name} className="h-[72vh] w-full rounded-[10px] border border-[var(--color-border)]" />
          ) : status === 'ready' && html !== null ? (
            <div
              className="prose-doc max-w-none overflow-x-auto text-[var(--color-fg)]"
              // mammoth emits only formatting elements (no scripts) from the
              // user's own document.
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : status === 'ready' && text !== null ? (
            <pre className="overflow-auto whitespace-pre-wrap break-words rounded-[10px] bg-[var(--color-bg-muted)] p-4 font-mono text-[12.5px] leading-relaxed text-[var(--color-fg)]">
              {text}
            </pre>
          ) : (
            <div className="grid h-[42vh] place-items-center">
              <div className="flex flex-col items-center gap-3 text-center">
                <FileText size={28} className="text-[var(--color-fg-subtle)]" aria-hidden />
                <p className="text-sm text-[var(--color-fg-muted)] max-w-[28ch]">
                  {status === 'error' ? t('chat:filePreview.failed') : t('chat:filePreview.unsupported')}
                </p>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {url ? (
            <>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-sm font-medium interactive',
                  'border border-[var(--color-border)] text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-bg-muted)]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                )}
              >
                <ExternalLink size={14} aria-hidden />
                {t('chat:filePreview.open')}
              </a>
              <a
                href={url}
                download={name}
                className={cn(
                  'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-[10px] text-sm font-medium interactive',
                  'bg-[var(--color-fg)] text-[var(--color-fg-inverted)] hover:opacity-90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]',
                )}
              >
                <Download size={14} aria-hidden />
                {t('chat:filePreview.download')}
              </a>
            </>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
