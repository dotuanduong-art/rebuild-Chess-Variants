import { deepFreeze } from './canonical.js';
import type { PayloadSchema } from './effects.js';
import type { ActionRestriction } from './action-legality.js';
/** Approved empty payload carries no producer-specific chain/permission behavior. */
export const STUN_PAYLOAD_SCHEMA: PayloadSchema<Record<string, never>> = Object.freeze({
  parse: (value: unknown) => {
    if (
      !value ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      Object.keys(value).length ||
      (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
    )
      throw new Error('INVALID_STUN_PAYLOAD');
    return Object.freeze({});
  },
});
export const STUN_CONSUMER_CONTRACT = deepFreeze({
  definitionId: 'effect.stun',
  family: 'stun',
  category: 'debuff',
  targets: ['piece'],
  ownership: { kind: 'source-player' },
  visibility: { kind: 'public' },
  sourceMatching: 'type-source-identity-target',
  lifetimeBoundary: 'end',
  unlinked: true,
  actionRestrictions: [
    { actionKind: 'main-action', policyId: 'stun.main.v1' },
    { actionKind: 'capture-threat', policyId: 'stun.threat.v1' },
  ],
  enabled: false,
  missingProducerFields: [
    'approved duration profile',
    'target/King eligibility',
    'removal permissions',
  ],
} as const);
export const STUN_RESTRICTION_BINDINGS: Readonly<Record<string, ActionRestriction>> = Object.freeze(
  {
    'stun.main.v1': () => false,
    'stun.threat.v1': () => false,
  },
);
