import { describe, it, expect } from 'vitest';
import { createStaffSchema, editStaffSchema } from './staff.schemas';

describe('createStaffSchema', () => {
  it('accepts a valid payload', () => {
    expect(
      createStaffSchema.safeParse({ firstName: 'Amine', lastName: 'Ben Salah', email: 'amine@example.com' })
        .success,
    ).toBe(true);
  });

  it('rejects an empty first name', () => {
    expect(createStaffSchema.safeParse({ firstName: '', lastName: 'X', email: 'a@b.co' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    expect(createStaffSchema.safeParse({ firstName: 'A', lastName: 'B', email: 'nope' }).success).toBe(false);
  });

  it('rejects names longer than 100 chars', () => {
    expect(
      createStaffSchema.safeParse({ firstName: 'a'.repeat(101), lastName: 'B', email: 'a@b.co' }).success,
    ).toBe(false);
  });
});

describe('editStaffSchema', () => {
  it('accepts first and last name', () => {
    expect(editStaffSchema.safeParse({ firstName: 'A', lastName: 'B' }).success).toBe(true);
  });

  it('rejects a missing last name', () => {
    expect(editStaffSchema.safeParse({ firstName: 'A' }).success).toBe(false);
  });
});
