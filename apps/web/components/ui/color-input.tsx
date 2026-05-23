'use client';

import { forwardRef } from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColorInputProps {
  value: string;
  onChange: (hex: string) => void;
  id?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
}

/**
 * V1.6 — Hex color input + native <input type="color"> swatch.
 * - A11y: aria-label on both inputs, focus-ring inherited from Input.
 * - Live sync: typing in the hex text input updates the swatch and vice-versa.
 * - Strict: maxLength=7 (#RRGGBB). Server-side hex regex validation catches
 *   anything weird; the swatch handles autocomplete edge-cases.
 */
export const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
  ({ value, onChange, id, label, className, disabled }, ref) => {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <input
          type="color"
          value={value}
          aria-label={label ? `${label} (sélecteur visuel)` : 'Sélecteur de couleur'}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-9 w-9 cursor-pointer rounded border border-input"
        />
        <Input
          ref={ref}
          id={id}
          type="text"
          value={value}
          maxLength={7}
          placeholder="#4f46e5"
          onChange={(e) => onChange(e.target.value)}
          aria-label={label ?? 'Hex color'}
          disabled={disabled}
          className="w-32 font-mono uppercase"
        />
      </div>
    );
  },
);
ColorInput.displayName = 'ColorInput';
