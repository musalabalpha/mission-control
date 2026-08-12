'use client'

// Panel Artefactos (nav izq MC): biblioteca por zonas de ~/artifacts.
// Preview embebe artifacts-server (:8446 /a/…); abrir interactivo usa /v/….

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSmartPoll } from '@/lib/use-smart-poll'

interface Artifact {
  name: string
  title: string
  zone: string
  updatedAt: number
  url: string
  previewUrl: string
}

interface ZoneInfo {
  id: string
  label: string
  blurb: string
  count: number
}

function timeAgo(epochSec: number): string {
  const mins = Math.floor((Date.now() / 1000 - epochSec) / 60)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins} min`
  const h = Math.floor(mins / 60)
  if (h < 48) return `hace ${h} h`
  return `hace ${Math.floor(h / 24)} d`
}

export function ArtifactsPanel() {
  const [artifacts, setArtifacts] = useState<Artifact[] | null>(null)
  const [zones, setZones] = useState<ZoneInfo[]>([])
  const [galleryUrl, setGalleryUrl] = useState('')
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [zone, setZone] = useState('')
  const [selected, setSelected] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/artifacts')
      const data = await res.json()
      if (data.error) setNotice(data.error)
      else setNotice(null)
      const list: Artifact[] = data.artifacts ?? []
      setArtifacts(list)
      setZones(data.zones ?? [])
      setGalleryUrl(data.galleryUrl ?? '')
      setError(null)
      setSelected(prev => {
        if (prev && list.some(a => a.name === prev)) return prev
        return list[0]?.name ?? null
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar artefactos')
    }
  }, [])

  useSmartPoll(fetchData, 60000)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        document.getElementById('artifacts-search')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const filtered = useMemo(() => {
    if (!artifacts) return []
    const q = query.trim().toLowerCase()
    return artifacts.filter(a => {
      if (zone && a.zone !== zone) return false
      if (!q) return true
      return a.title.toLowerCase().includes(q) || a.name.toLowerCase().includes(q)
    })
  }, [artifacts, query, zone])

  const active = filtered.find(a => a.name === selected) ?? filtered[0] ?? null

  useEffect(() => {
    if (active && active.name !== selected) setSelected(active.name)
  }, [active, selected])

  const zoneLabel = (id: string) => zones.find(z => z.id === id)?.label ?? id

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col md:flex-row">
      {/* Lista */}
      <div className="flex w-full flex-col border-b border-border md:w-[380px] md:shrink-0 md:border-b-0 md:border-r">
        <div className="space-y-3 border-b border-border p-4">
          <div className="flex items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Artefactos</h2>
              <p className="text-xs text-muted-foreground">
                {artifacts ? `${filtered.length} de ${artifacts.length}` : '…'}
                {zone ? ` · ${zoneLabel(zone)}` : ''}
              </p>
            </div>
            {galleryUrl && (
              <a
                href={galleryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                Galería ↗
              </a>
            )}
          </div>

          <input
            id="artifacts-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar…  (/)"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setZone('')}
              aria-pressed={zone === ''}
              className={`rounded-full border px-2.5 py-0.5 text-2xs transition-colors ${
                zone === ''
                  ? 'border-primary/50 bg-primary/15 text-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              Todo{artifacts ? ` ${artifacts.length}` : ''}
            </button>
            {zones
              .filter(z => z.count > 0)
              .map(z => (
                <button
                  key={z.id}
                  type="button"
                  title={z.blurb}
                  onClick={() => setZone(zone === z.id ? '' : z.id)}
                  aria-pressed={zone === z.id}
                  className={`rounded-full border px-2.5 py-0.5 text-2xs transition-colors ${
                    zone === z.id
                      ? 'border-primary/50 bg-primary/15 text-primary'
                      : 'border-border bg-card text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {z.label} {z.count}
                </button>
              ))}
          </div>
        </div>

        {notice && (
          <div className="mx-4 mt-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
            {notice}
          </div>
        )}
        {error && <p className="px-4 pt-3 text-sm text-destructive">{error}</p>}
        {!artifacts && !error && <p className="px-4 pt-3 text-sm text-muted-foreground">Cargando…</p>}

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filtered.map(a => {
            const isActive = active?.name === a.name
            return (
              <button
                key={a.name}
                type="button"
                onClick={() => setSelected(a.name)}
                className={`mb-0.5 flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-transparent hover:border-border hover:bg-card'
                }`}
              >
                <span className={`truncate text-sm font-medium ${isActive ? 'text-primary' : ''}`}>
                  {a.title}
                </span>
                <span className="flex items-center gap-1.5 font-mono text-2xs text-muted-foreground">
                  <span className="truncate">{zoneLabel(a.zone)}</span>
                  <span className="opacity-40">·</span>
                  <span className="shrink-0">{timeAgo(a.updatedAt)}</span>
                </span>
              </button>
            )
          })}
          {artifacts && filtered.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nada coincide.</p>
          )}
        </div>
      </div>

      {/* Preview */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        {active ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-semibold">{active.title}</h3>
                <p className="truncate font-mono text-2xs text-muted-foreground">{active.name}</p>
              </div>
              <a
                href={active.url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-md border border-primary/40 bg-primary/15 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/25"
              >
                Abrir interactivo ↗
              </a>
            </div>
            <iframe
              key={active.previewUrl}
              title={active.title}
              src={active.previewUrl}
              sandbox="allow-scripts"
              className="min-h-[50vh] w-full flex-1 border-0 bg-card"
            />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-muted-foreground">
            {artifacts ? 'Elige un artefacto a la izquierda.' : 'Cargando…'}
          </div>
        )}
      </div>
    </div>
  )
}
