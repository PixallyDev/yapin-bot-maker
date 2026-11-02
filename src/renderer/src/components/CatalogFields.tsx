import { CATALOG_BY_TYPE } from '../data/nodeCatalog'
export function CatalogFields({
  type,
  draft,
  setField,
  insert
}: {
  type: string
  draft: Record<string, unknown>
  setField: (key: string, value: unknown) => void
  insert: (key: string, label: string) => React.ReactNode
}): React.JSX.Element | null {
  const entry = CATALOG_BY_TYPE.get(type)
  if (!entry || !entry.type.startsWith('catalog.')) return null
  return (
    <div className="catalog-editor-fields">
      {entry.fields.map((field) => (
        <div className="node-editor-section" key={field.key}>
          <label className="node-editor-label" htmlFor={`catalog-${field.key}`}>
            {field.label}
          </label>
          {field.kind === 'toggle' ? (
            <input
              id={`catalog-${field.key}`}
              type="checkbox"
              checked={Boolean(draft[field.key] ?? field.defaultValue)}
              onChange={(e) => setField(field.key, e.target.checked)}
            />
          ) : field.kind === 'select' ? (
            <select
              id={`catalog-${field.key}`}
              className="node-editor-input"
              value={String(draft[field.key] ?? field.defaultValue)}
              onChange={(e) => setField(field.key, e.target.value)}
            >
              {field.options?.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          ) : field.kind === 'variable-save' ? (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={Boolean(draft.saveToVariable)}
                  onChange={(e) => setField('saveToVariable', e.target.checked)}
                />{' '}
                Save result to variable
              </label>
              <input
                id={`catalog-${field.key}`}
                className="node-editor-input"
                placeholder="Variable name"
                value={String(draft[field.key] ?? field.defaultValue)}
                onChange={(e) => setField(field.key, e.target.value)}
              />
              <select
                aria-label="Variable scope"
                value={String(draft.variableScope ?? 'local')}
                onChange={(e) => setField('variableScope', e.target.value)}
              >
                <option value="local">Local</option>
                <option value="global">Global</option>
              </select>
            </>
          ) : field.kind === 'textarea' || field.kind === 'code' ? (
            <>
              <textarea
                id={`catalog-${field.key}`}
                rows={field.kind === 'code' ? 8 : 4}
                spellCheck={field.kind !== 'code'}
                className={`node-editor-input ${field.kind === 'code' ? 'font-mono' : ''}`}
                value={String(draft[field.key] ?? field.defaultValue)}
                onChange={(e) => setField(field.key, e.target.value)}
              />
              {insert(field.key, field.label)}
            </>
          ) : (
            <>
              <input
                id={`catalog-${field.key}`}
                className="node-editor-input"
                type={field.kind === 'number' ? 'number' : 'text'}
                value={
                  field.kind === 'number'
                    ? Number(draft[field.key] ?? field.defaultValue)
                    : String(draft[field.key] ?? field.defaultValue)
                }
                onChange={(e) =>
                  setField(
                    field.key,
                    field.kind === 'number' ? e.target.valueAsNumber : e.target.value
                  )
                }
              />
              {field.kind === 'text' && insert(field.key, field.label)}
            </>
          )}
        </div>
      ))}
    </div>
  )
}
