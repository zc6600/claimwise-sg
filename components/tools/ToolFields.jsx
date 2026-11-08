"use client";

export function NumberField({ id, label, hint, value, onChange, prefix, suffix, min = 0, max, step = "any" }) {
  const input = (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {suffix ? ` (${suffix})` : ""}
      </label>
      {prefix ? (
        <div className="input-prefix">
          <span>{prefix}</span>
          {input}
        </div>
      ) : (
        input
      )}
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function SelectField({ id, label, hint, value, onChange, options }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? <span className="field-hint">{hint}</span> : null}
    </div>
  );
}

export function ResultRows({ rows }) {
  return (
    <dl className="tool-rows">
      {rows.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd className="tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
