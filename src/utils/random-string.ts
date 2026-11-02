import { nanoid } from 'nanoid';

export function randomString(length: number = 16): string {
  return nanoid(length);
}

export function generateIdentifier(prefix = 'drq'): string {
  return `${prefix}_${nanoid(12)}`;
}
