import { useEffect, useRef, useState } from 'react';

/**
 * SelectMenu — custom listbox replacing the native <select> so the open list matches the
 * site's translucent, square-cornered look. Keyboard: ↑/↓ move, Enter/Space pick, Esc closes.
 * The trigger carries `id` so an external <label htmlFor> still targets it.
 */
export default function SelectMenu({ id, options, value, placeholder, invalid, onSelect }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const selected = options.find((option) => option.value === value);

  // Close on outside pointer-down while open.
  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keep the keyboard-active option in view.
  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openMenu = () => {
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  };

  const pick = (option) => {
    onSelect(option.value);
    setOpen(false);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') return setOpen(false);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) return openMenu();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      return setActive((index) => (index + step + options.length) % options.length);
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (open && options[active]) pick(options[active]);
      else openMenu();
    }
  };

  return (
    <div className={`apply-select${open ? ' is-open' : ''}`} ref={rootRef}>
      <button
        id={id}
        type="button"
        className="apply-input apply-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-invalid={invalid}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={selected ? '' : 'apply-select__placeholder'}>{selected?.label ?? placeholder}</span>
      </button>
      {open && (
        <ul className="apply-select__list" role="listbox" ref={listRef}>
          {options.map((option, index) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              className={`apply-select__option${index === active ? ' is-active' : ''}${option.value === value ? ' is-selected' : ''}`}
              onPointerEnter={() => setActive(index)}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => pick(option)}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
