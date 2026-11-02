import { useState } from 'react'
import { BotPlugin } from '../pluginsData'
export function PluginConfigModal({
  plugin,
  onClose
}: {
  plugin: BotPlugin
  onClose: () => void
}): React.JSX.Element {
  const fields = plugin.id.includes('webhook')
    ? [['url', 'Webhook URL', 'url']]
    : plugin.id.includes('llm')
      ? [
          ['apiKey', 'LLM API key', 'password'],
          ['model', 'Model', 'text'],
          ['systemPrompt', 'System prompt', 'text']
        ]
      : plugin.id.includes('gateway')
        ? [
            ['maxRetries', 'Maximum retries', 'number'],
            ['timeout', 'Timeout (seconds)', 'number']
          ]
        : plugin.id.includes('sqlite')
          ? [['filePath', 'SQLite file path', 'text']]
          : [['retentionDays', 'Retention days', 'number']]
  const key = `yapin_plugin_settings_${plugin.id}`
  const [values, setValues] = useState<Record<string, string>>(() => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? '{}')
    } catch {
      return {}
    }
  })
  const [error, setError] = useState('')
  return (
    <div className="plugin-modal-backdrop" onClick={onClose}>
      <form
        className="plugin-config-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${plugin.name} settings`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          try {
            localStorage.setItem(key, JSON.stringify(values))
            onClose()
          } catch {
            setError('Unable to save settings.')
          }
        }}
      >
        <h2>{plugin.name}</h2>
        <p>Settings are saved locally on this computer.</p>
        {fields.map(([id, label, type]) => (
          <label key={id}>
            {label}
            <input
              required
              type={type}
              min={0}
              value={values[id] ?? ''}
              onChange={(e) => setValues({ ...values, [id]: e.target.value })}
            />
          </label>
        ))}
        {error && <p role="alert">{error}</p>}
        <button type="submit">Save settings</button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  )
}
