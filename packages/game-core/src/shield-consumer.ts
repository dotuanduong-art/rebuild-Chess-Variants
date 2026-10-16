import { deepFreeze } from './canonical.js';
import type { PayloadSchema } from './effects.js';
import type { CaptureDefense } from './capture-defense.js';

/** Empty data has no charge count, producer permission or gameplay-bearing refresh fields. */
export const SHIELD_PAYLOAD_SCHEMA: PayloadSchema<Record<string, never>> = Object.freeze({
  parse: (value: unknown) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).length ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    )
      throw new Error('INVALID_SHIELD_PAYLOAD');
    return Object.freeze({});
  },
});

/** Deliberately incomplete: no approved producer profile or live registration. */
export const SHIELD_CONSUMER_CONTRACT = deepFreeze({
  definitionId: 'effect.shield',
  family: 'shield',
  category: 'buff',
  targets: ['piece'],
  ownership: { kind: 'source-player' },
  visibility: { kind: 'public' },
  unlinked: true,
  sourceMatching: 'type-source-identity-target',
  lifetimeBoundary: 'end',
  captureDefense: { kind: 'atomic-reject', policyId: 'shield.capture.v1' },
  enabled: false,
  missingProducerFields: [
    'approved duration profile',
    'target/King eligibility',
    'removal permissions',
    'required source references',
    'producer-specific fixtures',
  ],
} as const);

/** Any attached active instance blocks; no mutation, charges or deadline debit. */
export const SHIELD_CAPTURE_DEFENSE_BINDINGS: Readonly<Record<string, CaptureDefense>> =
  Object.freeze({
    'shield.capture.v1': () => false,
  });
