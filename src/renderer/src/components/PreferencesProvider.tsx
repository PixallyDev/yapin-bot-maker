import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DEFAULT_PREFERENCES,
  PreferencesContext,
  loadPreferences,
  savePreferences,
  type Preferences,
  type PreferencesContextValue
} from '../preferencesStore'

const CLASS_FLAGS: [keyof Preferences, string, boolean][] = [
  ['reduceMotion', 'pref-reduce-motion', true],
  ['showNodeDescriptions', 'pref-hide-node-desc', false],
  ['showActiveTabIndicator', 'pref-hide-tab-indicator', false],
  ['useGlassNodes', 'pref-glass-nodes', true],
  ['hideProjectThumbnails', 'pref-hide-thumbs', true]
]

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prefs, setPrefs] = useState<Preferences>(() => loadPreferences())

  const setAll = useCallback((next: Preferences) => {
    setPrefs(next)
    savePreferences(next)
  }, [])

  const update = useCallback((patch: Partial<Preferences>) => {
    setPrefs((current) => {
      const next = { ...current, ...patch }
      savePreferences(next)
      return next
    })
  }, [])

  const reset = useCallback(() => setAll({ ...DEFAULT_PREFERENCES }), [setAll])

  // DPI scale via Electron's native zoom factor (falls back to nothing in a plain browser).
  useEffect(() => {
    window.electron?.webFrame?.setZoomFactor(prefs.dpiScale / 100)
  }, [prefs.dpiScale])

  // Visual toggles are CSS classes on <html> so every component reacts without prop drilling.
  useEffect(() => {
    const root = document.documentElement
    for (const [key, className, activeWhen] of CLASS_FLAGS) {
      root.classList.toggle(className, prefs[key] === activeWhen)
    }
  }, [prefs])

  // Tooltips: stash native title attributes while disabled and restore them afterwards.
  useEffect(() => {
    if (prefs.enableTooltips) {
      document.querySelectorAll<HTMLElement>('[data-title]').forEach((element) => {
        element.setAttribute('title', element.dataset.title ?? '')
        element.removeAttribute('data-title')
      })
      return
    }
    const stash = (event: Event): void => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('[title]')
      if (target) {
        target.dataset.title = target.getAttribute('title') ?? ''
        target.removeAttribute('title')
      }
    }
    document.addEventListener('mouseover', stash, true)
    return () => document.removeEventListener('mouseover', stash, true)
  }, [prefs.enableTooltips])

  // The runner owns variable expansion, so it needs to know the empty-variable text.
  useEffect(() => {
    void window.botApi
      ?.setRunnerOptions({ emptyVariableText: prefs.emptyVariableText })
      .catch(() => undefined)
  }, [prefs.emptyVariableText])

  const value = useMemo<PreferencesContextValue>(
    () => ({ prefs, update, setAll, reset }),
    [prefs, update, setAll, reset]
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}
