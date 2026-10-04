'use client';

import { useId, useRef, useState } from 'react';

export function ProfileSelect({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: { value: string; label: string; color?: string }[];
}) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  function choose(index: number) {
    setSelected(index);
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <div
      className="profile-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span id={`${id}-label`} className="profile-field-label">
        {label}
      </span>
      <input type="hidden" name={name} value={options[selected]!.value} />
      <button
        ref={trigger}
        type="button"
        className="profile-select-trigger"
        aria-labelledby={`${id}-label ${id}-value`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-list` : undefined}
        onClick={() => {
          setActive(selected);
          setOpen(!open);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setActive(selected);
            setOpen(true);
          }
        }}
      >
        <span id={`${id}-value`} className="profile-select-value">
          {options[selected]!.color && (
            <span
              className="belt-swatch"
              style={{ backgroundColor: options[selected]!.color }}
              aria-hidden="true"
            />
          )}
          {options[selected]!.label}
        </span>
        <span aria-hidden="true">⌄</span>
      </button>
      {open && (
        <div
          id={`${id}-list`}
          className="profile-select-options"
          role="listbox"
          aria-labelledby={`${id}-label`}
          tabIndex={-1}
          ref={(element) => {
            element?.focus();
          }}
          aria-activedescendant={`${id}-option-${active}`}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              setOpen(false);
              trigger.current?.focus();
            } else if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              choose(active);
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault();
              setActive(
                (index) =>
                  (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length,
              );
            } else if (event.key === 'Home' || event.key === 'End') {
              event.preventDefault();
              setActive(event.key === 'Home' ? 0 : options.length - 1);
            } else if (event.key.length === 1) {
              const match = options.findIndex((option) =>
                option.label.toLocaleLowerCase().startsWith(event.key.toLocaleLowerCase()),
              );
              if (match >= 0) setActive(match);
            }
          }}
        >
          {options.map((option, index) => (
            <div
              key={option.value}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={selected === index}
              className={active === index ? 'is-active' : ''}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(index)}
            >
              {option.color && (
                <span
                  className="belt-swatch"
                  style={{ backgroundColor: option.color }}
                  aria-hidden="true"
                />
              )}
              <span>{option.label}</span>
              <span className="profile-option-check" aria-hidden="true">
                {selected === index ? '✓' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
