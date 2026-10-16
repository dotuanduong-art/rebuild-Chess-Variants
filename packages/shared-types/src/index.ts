import { z } from 'zod';

// Draft transport contracts; this is not a frozen public gameplay ruleset.
export const PROTOCOL_VERSION = '0.1.0' as const;
export const CONTRACT_SCHEMA_VERSION = '0.1.0' as const;

export const IdentifierSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
export const VersionIdentifierSchema = z
  .string()
  .max(64)
  .regex(/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[A-Za-z0-9.-]+)?$/);
export const MatchIdSchema = IdentifierSchema.brand<'MatchId'>();
export const CommandIdSchema = IdentifierSchema.brand<'CommandId'>();
export const EventIdSchema = IdentifierSchema.brand<'EventId'>();
export const PlayerSideSchema = z.enum(['white', 'black']);
export const RevisionSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
export const SerializableValueSchema = z.json();

export type MatchId = z.infer<typeof MatchIdSchema>;
export type CommandId = z.infer<typeof CommandIdSchema>;
export type EventId = z.infer<typeof EventIdSchema>;
export type PlayerSide = z.infer<typeof PlayerSideSchema>;
export type Revision = z.infer<typeof RevisionSchema>;
export type SerializableValue = z.infer<typeof SerializableValueSchema>;

export const BOARD_SIZE = 15 as const;
export const BOARD_CELL_COUNT = 225 as const;
export const CoordinateSchema = z
  .strictObject({
    file: z.number().int().min(0).max(14),
    rankIndex: z.number().int().min(0).max(14),
  })
  .readonly();
export type Coordinate = z.infer<typeof CoordinateSchema>;

export const PieceIdSchema = IdentifierSchema.brand<'PieceId'>();
export const PieceTypeSchema = z.enum(['pawn', 'rook', 'knight', 'bishop', 'queen', 'king']);
export const PieceSchema = z
  .strictObject({
    id: PieceIdSchema,
    originalSide: PlayerSideSchema,
    owner: PlayerSideSchema,
    controller: PlayerSideSchema,
    baseType: PieceTypeSchema,
    currentType: PieceTypeSchema,
    // Absent provenance is unknown, never inferred from the chess type by producers.
    origin: z.enum(['ordinary-original', 'special', 'summoned']).optional(),
    position: CoordinateSchema,
  })
  .readonly();
export type PieceId = z.infer<typeof PieceIdSchema>;
export type PieceType = z.infer<typeof PieceTypeSchema>;
export type Piece = z.infer<typeof PieceSchema>;
export type PieceInput = z.input<typeof PieceSchema>;

const MessageSchema = z.strictObject({
  kind: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_.-]*$/),
  schemaVersion: VersionIdentifierSchema,
  payload: SerializableValueSchema,
});

// Requester/seat, cost and outcome are never trusted envelope authority fields.
export const CommandEnvelopeSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  matchId: MatchIdSchema,
  commandId: CommandIdSchema,
  expectedRevision: RevisionSchema,
  command: MessageSchema,
});

// Visibility projection belongs to the future backend, not this generic schema.
export const EventEnvelopeSchema = z.strictObject({
  protocolVersion: z.literal(PROTOCOL_VERSION),
  matchId: MatchIdSchema,
  eventId: EventIdSchema,
  revision: RevisionSchema,
  sequence: RevisionSchema,
  event: MessageSchema,
});

export type CommandEnvelope = z.infer<typeof CommandEnvelopeSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

export const RejectionSchema = z.strictObject({
  code: z.enum([
    'INVALID_ENVELOPE',
    'UNSUPPORTED_PROTOCOL',
    'STALE_REVISION',
    'UNAUTHORIZED',
    'NOT_AVAILABLE',
  ]),
  message: z.string().min(1).max(256),
});
export type Rejection = z.infer<typeof RejectionSchema>;
export type Result<T> =
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly rejection: Rejection };

export function createResultSchema<T extends z.ZodType>(valueSchema: T) {
  return z.discriminatedUnion('ok', [
    z.strictObject({ ok: z.literal(true), value: valueSchema }),
    z.strictObject({ ok: z.literal(false), rejection: RejectionSchema }),
  ]);
}

// Phase 01B engine contracts: internal full-state data, never a live client view.
const SafeCountSchema = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
// 02B-5C pins targeted skill execution, persistent player profiles and piece provenance semantics.
// Older archives must use their pinned engine rather than silently changing simulation.
export const ENGINE_VERSION = '0.6.0' as const;
export const STATE_SCHEMA_VERSION = '1.1.0' as const;
export const RNG_ALGORITHM_VERSION = 'xorshift32-v1' as const;
export const TurnStateSchema = z.strictObject({
  sideToAct: PlayerSideSchema,
  plyIndex: SafeCountSchema,
  roundIndex: SafeCountSchema.min(1),
  mainMoveUsed: z.boolean(),
  skillUsed: z.boolean(),
});
export const TerminalStateSchema = z.discriminatedUnion('status', [
  z.strictObject({ status: z.literal('ongoing') }),
  z.strictObject({
    status: z.literal('won'),
    reason: z.literal('king_captured'),
    winner: PlayerSideSchema,
  }),
  z.strictObject({ status: z.literal('draw'), reason: z.literal('threefold_repetition') }),
]);
export const BoardSchema = z.strictObject({
  cells: z.array(PieceIdSchema.nullable()).length(225),
  pieces: z.record(IdentifierSchema, PieceSchema),
});
export const DeadlineSchema = z.strictObject({
  side: PlayerSideSchema,
  boundary: z.enum(['start', 'end']),
  ordinal: SafeCountSchema,
});
export const OpaqueRuleStateSchema = z.strictObject({
  id: IdentifierSchema,
  definitionId: IdentifierSchema,
  source: PlayerSideSchema,
  deadline: DeadlineSchema.nullable(),
  payload: SerializableValueSchema,
});

// Phase 02A-1 data contracts only; these declarations do not enable effect gameplay.
const EffectPolicyRefSchema = IdentifierSchema;
export const EffectTargetSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('piece'), pieceId: PieceIdSchema }),
  z.strictObject({ kind: z.literal('cell'), position: CoordinateSchema }),
  z.strictObject({ kind: z.literal('player'), side: PlayerSideSchema }),
]);
export const EffectReferenceSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    role: IdentifierSchema,
    kind: z.literal('effect'),
    instanceId: IdentifierSchema,
  }),
  z.strictObject({
    role: IdentifierSchema,
    kind: z.literal('piece'),
    pieceId: PieceIdSchema,
    presence: z.enum(['live', 'historical']),
  }),
  z.strictObject({
    role: IdentifierSchema,
    kind: z.literal('group'),
    groupId: IdentifierSchema,
    owner: PlayerSideSchema,
  }),
]);
export const EffectLinkSemanticsSchema = z.strictObject({
  group: SerializableValueSchema,
  references: z.array(SerializableValueSchema),
});
export const EffectLifetimeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('permanent') }),
  z.strictObject({
    kind: z.literal('rounds'),
    rounds: SafeCountSchema.min(1),
    boundary: z.enum(['start', 'end']),
  }),
  z.strictObject({ kind: z.literal('current-turn-window'), boundary: z.enum(['start', 'end']) }),
  z.strictObject({
    kind: z.literal('event-count'),
    event: IdentifierSchema,
    count: SafeCountSchema.min(1),
  }),
  z.strictObject({ kind: z.literal('progress'), policyId: EffectPolicyRefSchema }),
]);
export const EffectRemovalReasonSchema = z.enum([
  'expired',
  'cleansed',
  'dispelled',
  'consumed',
  'replaced',
  'target_destroyed',
  'source_invalidated',
  'link_broken',
  'match_terminal',
]);
const CleanupPolicySchema = z.union([
  z.literal('cleanup-only'),
  z.strictObject({ kind: z.literal('declared-reaction'), policyId: EffectPolicyRefSchema }),
]);
export const EffectSourceIdentitySchema = z.strictObject({
  sourcePlayer: PlayerSideSchema,
  sourceVariant: IdentifierSchema.nullable().default(null),
  sourceSkill: IdentifierSchema.nullable().default(null),
  sourcePiece: PieceIdSchema.nullable().default(null),
  sourceIncarnation: IdentifierSchema.nullable().default(null),
});
export const EffectDurationParametersSchema = z.strictObject({
  schemaVersion: z.literal('1.0.0'),
  producerId: IdentifierSchema,
  producerVersion: VersionIdentifierSchema,
  rounds: SafeCountSchema.min(1),
});
export const ProducerRoundsPolicySchema = z.strictObject({
  kind: z.literal('producer-rounds'),
  schemaVersion: z.literal('1.0.0'),
  boundary: z.enum(['start', 'end']),
  producers: z
    .array(
      z.strictObject({
        id: IdentifierSchema,
        version: VersionIdentifierSchema,
        sourceVariant: IdentifierSchema.nullable(),
        sourceSkill: IdentifierSchema,
        allowedRounds: z.array(SafeCountSchema.min(1)).min(1),
        requireCaster: z.boolean(),
        supportsIncarnation: z.boolean(),
      }),
    )
    .min(1),
});
export type EffectSourceIdentity = z.infer<typeof EffectSourceIdentitySchema>;
export type EffectDurationParameters = z.infer<typeof EffectDurationParametersSchema>;
const StackingKeySchema = z.enum([
  'type-target',
  'type-source-target',
  'type-source-identity-target',
  'explicit-group',
]);
export const EffectDefinitionMetadataSchema = z.strictObject({
  typeId: IdentifierSchema,
  schemaVersion: VersionIdentifierSchema,
  targets: z.array(z.enum(['piece', 'cell', 'player'])).min(1),
  category: z.enum(['buff', 'debuff', 'neutral']),
  family: z
    .strictObject({ id: IdentifierSchema, policy: z.literal('unique-target-ignore') })
    .optional(),
  deathReaction: z
    .strictObject({ mode: z.literal('bomb-blast-v1'), handlerId: IdentifierSchema })
    .optional(),
  sourceAttribution: z.strictObject({
    kind: z.literal('preserve-source'),
    requiredRefs: z.array(z.enum(['variant', 'skill', 'piece'])),
    profile: z
      .strictObject({
        kind: z.literal('player-originated-v1'),
        sourceVariant: IdentifierSchema,
        sourceSkill: IdentifierSchema,
      })
      .optional(),
  }),
  ownership: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.enum(['source-player', 'target-owner', 'target-controller']) }),
    z.strictObject({ kind: z.literal('declared'), policyId: EffectPolicyRefSchema }),
  ]),
  kingEligibility: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.enum(['allowed', 'denied']) }),
    z.strictObject({ kind: z.literal('declared'), policyId: EffectPolicyRefSchema }),
  ]),
  lifetime: z.union([EffectLifetimeSchema, ProducerRoundsPolicySchema]),
  stacking: z.discriminatedUnion('mode', [
    z.strictObject({ key: StackingKeySchema, mode: z.literal('independent') }),
    z.strictObject({ key: StackingKeySchema, mode: z.literal('replace') }),
    z.strictObject({ key: StackingKeySchema, mode: z.literal('ignore') }),
    z.strictObject({
      key: StackingKeySchema,
      mode: z.literal('refresh'),
      payload: z.enum(['replace', 'preserve', 'declared']),
      source: z.enum(['preserve', 'replace', 'declared']),
      deadline: z.enum(['preserve', 'replace', 'reset', 'extend', 'declared']),
      mergePolicyId: EffectPolicyRefSchema.nullable(),
    }),
    z.strictObject({
      key: StackingKeySchema,
      mode: z.literal('stack'),
      representation: z.enum(['instances', 'intensity']),
      cap: SafeCountSchema.min(1).nullable(),
      mergePolicyId: EffectPolicyRefSchema,
    }),
  ]),
  removal: z.record(EffectRemovalReasonSchema, CleanupPolicySchema),
  // Permission is separate from the consequence of an already authorized removal.
  removalPermissions: z.array(EffectRemovalReasonSchema).optional(),
  relocation: z.discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('retargetable'),
      constraints: z.array(EffectPolicyRefSchema),
    }),
    z.strictObject({
      kind: z.literal('group-aware'),
      policyId: EffectPolicyRefSchema,
      constraints: z.array(EffectPolicyRefSchema),
    }),
    z.strictObject({ kind: z.literal('prohibited-with-reason'), reason: IdentifierSchema }),
  ]),
  visibility: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.enum(['public', 'source-player', 'internal']) }),
    z.strictObject({ kind: z.literal('declared'), policyId: EffectPolicyRefSchema }),
  ]),
  capabilities: z.array(IdentifierSchema),
  captureDefense: z
    .strictObject({ kind: z.literal('atomic-reject'), policyId: IdentifierSchema })
    .optional(),
  actionRestrictions: z
    .array(
      z.strictObject({
        actionKind: z.enum(['main-action', 'capture-threat']),
        policyId: IdentifierSchema,
      }),
    )
    .optional(),
  triggers: z.array(
    z.strictObject({
      id: IdentifierSchema,
      event: IdentifierSchema,
      stage: z.enum(['proposed', 'committed', 'boundary', 'removal']),
      handlerId: IdentifierSchema,
    }),
  ),
  repetition: z.strictObject({ projectionId: IdentifierSchema }),
  eligibility: z
    .strictObject({
      policyId: EffectPolicyRefSchema,
      pieceOrigin: z.literal('ordinary-original').optional(),
    })
    .optional(),
  links: z
    .strictObject({ validationId: EffectPolicyRefSchema, normalizationId: EffectPolicyRefSchema })
    .optional(),
});
export const EffectInstanceSchema = z.strictObject({
  id: IdentifierSchema,
  definitionId: IdentifierSchema,
  definitionVersion: VersionIdentifierSchema,
  target: EffectTargetSchema,
  sourcePlayer: PlayerSideSchema,
  sourceVariant: IdentifierSchema.nullable(),
  sourceSkill: IdentifierSchema.nullable(),
  sourcePiece: PieceIdSchema.nullable(),
  sourceIncarnation: IdentifierSchema.nullable().optional(),
  duration: EffectDurationParametersSchema.optional(),
  appliedSequence: SafeCountSchema,
  timingAnchor: DeadlineSchema,
  lifetime: EffectLifetimeSchema,
  deadline: DeadlineSchema.nullable(),
  payload: SerializableValueSchema,
  groupId: IdentifierSchema.nullable(),
  extensionRounds: SafeCountSchema.min(1).optional(),
  references: z.array(EffectReferenceSchema).optional(),
});
export type EffectDefinitionMetadata = z.infer<typeof EffectDefinitionMetadataSchema>;
export type EffectTarget = z.infer<typeof EffectTargetSchema>;
export type EffectReference = z.infer<typeof EffectReferenceSchema>;
export type EffectLifetime = z.infer<typeof EffectLifetimeSchema>;
export type EffectRemovalReason = z.infer<typeof EffectRemovalReasonSchema>;
export type EffectInstanceData = z.infer<typeof EffectInstanceSchema>;
export const EffectRecordPayloadSchema = z.strictObject({
  format: z.literal('effect-instance-v1'),
  instance: EffectInstanceSchema,
});
export const EffectApplicationSchema = z.strictObject({
  kind: z.literal('effect_apply'),
  definitionId: IdentifierSchema,
  definitionVersion: VersionIdentifierSchema,
  target: EffectTargetSchema,
  sourcePlayer: z.union([PlayerSideSchema, z.literal('actor')]),
  sourceVariant: IdentifierSchema.nullable(),
  sourceSkill: IdentifierSchema.nullable(),
  sourcePiece: PieceIdSchema.nullable(),
  sourceIncarnation: IdentifierSchema.nullable().optional(),
  duration: EffectDurationParametersSchema.optional(),
  payload: SerializableValueSchema,
  groupId: IdentifierSchema.nullable(),
  references: z.array(EffectReferenceSchema).optional(),
});
export type EffectApplication = z.infer<typeof EffectApplicationSchema>;
export const EffectRemovalOperationSchema = z.strictObject({
  kind: z.literal('effect_remove'),
  instanceId: IdentifierSchema,
  reason: EffectRemovalReasonSchema.exclude(['expired']),
});
export type EffectRemovalOperation = z.infer<typeof EffectRemovalOperationSchema>;
export const EffectRelocationOperationSchema = z.strictObject({
  kind: z.literal('effect_relocate'),
  instanceId: IdentifierSchema,
  target: EffectTargetSchema,
});
export const EffectSetSwapOperationSchema = z.strictObject({
  kind: z.literal('effect_sets_swap'),
  pieceA: PieceIdSchema,
  pieceB: PieceIdSchema,
});
export type EffectRelocationOperation = z.infer<typeof EffectRelocationOperationSchema>;
export type EffectSetSwapOperation = z.infer<typeof EffectSetSwapOperationSchema>;

export const DelayedActionDefinitionMetadataSchema = z.strictObject({
  typeId: IdentifierSchema,
  schemaVersion: VersionIdentifierSchema,
  mode: z.literal('synthetic-v1'),
  sourcePolicy: z.literal('snapshot'),
  missingTarget: z.enum(['cancel', 'reject']),
  cancellationReasons: z.array(IdentifierSchema),
});
const DelayedInputFields = {
  definitionId: IdentifierSchema,
  definitionVersion: VersionIdentifierSchema,
  target: EffectTargetSchema.nullable(),
  dueBoundary: DeadlineSchema,
  payload: SerializableValueSchema,
};
export const DelayedScheduleOperationSchema = z.strictObject({
  kind: z.literal('delayed_schedule'),
  ...DelayedInputFields,
  sourcePlayer: z.enum(['white', 'black', 'actor']),
  sourceVariant: IdentifierSchema.nullable(),
  sourceSkill: IdentifierSchema.nullable(),
  sourcePiece: PieceIdSchema.nullable(),
});
export const DelayedCancelOperationSchema = z.strictObject({
  kind: z.literal('delayed_cancel'),
  actionId: IdentifierSchema,
  reason: IdentifierSchema,
});
export const DelayedActionSchema = z.strictObject({
  ...DelayedInputFields,
  id: IdentifierSchema,
  status: z.literal('scheduled'),
  transactionId: IdentifierSchema,
  causeId: IdentifierSchema,
  appliedSequence: SafeCountSchema.min(1),
  scheduledAt: DeadlineSchema,
  source: z.strictObject({
    player: PlayerSideSchema,
    controller: PlayerSideSchema,
    variant: IdentifierSchema.nullable(),
    skill: IdentifierSchema.nullable(),
    piece: PieceIdSchema.nullable(),
    policy: z.literal('snapshot'),
  }),
  missingTarget: z.enum(['cancel', 'reject']),
  cancellationReasons: z.array(IdentifierSchema),
});
export const DelayedActionRecordPayloadSchema = z.strictObject({
  format: z.literal('delayed-action-v1'),
  action: DelayedActionSchema,
});
export type DelayedActionDefinitionMetadata = z.infer<typeof DelayedActionDefinitionMetadataSchema>;
export type DelayedActionData = z.infer<typeof DelayedActionSchema>;
export type DelayedScheduleOperation = z.infer<typeof DelayedScheduleOperationSchema>;
export type DelayedCancelOperation = z.infer<typeof DelayedCancelOperationSchema>;
export const VariantProfileSchema = z.strictObject({
  id: IdentifierSchema,
  version: VersionIdentifierSchema,
});
export const PlayerProfilesSchema = z.strictObject({
  white: VariantProfileSchema.nullable(),
  black: VariantProfileSchema.nullable(),
});
export type VariantProfile = z.infer<typeof VariantProfileSchema>;
export type PlayerProfiles = z.infer<typeof PlayerProfilesSchema>;
export const GameStateSchema = z
  .strictObject({
    matchId: MatchIdSchema,
    engineVersion: z.literal(ENGINE_VERSION),
    schemaVersion: z.literal(STATE_SCHEMA_VERSION),
    rulesetVersion: VersionIdentifierSchema,
    rulesetHash: IdentifierSchema,
    playerProfiles: PlayerProfilesSchema,
    board: BoardSchema,
    ap: z.strictObject({ white: SafeCountSchema, black: SafeCountSchema }),
    turn: TurnStateSchema,
    terminal: TerminalStateSchema,
    rng: z.strictObject({
      algorithm: z.literal(RNG_ALGORITHM_VERSION),
      seed: z.number().int().min(1).max(0xffffffff),
      value: z.number().int().min(1).max(0xffffffff),
      cursor: SafeCountSchema,
    }),
    counters: z.strictObject({
      transaction: SafeCountSchema,
      event: SafeCountSchema,
      operation: SafeCountSchema,
      snapshot: SafeCountSchema,
      piece: SafeCountSchema,
    }),
    variantState: z.strictObject({
      white: z.record(IdentifierSchema, SerializableValueSchema),
      black: z.record(IdentifierSchema, SerializableValueSchema),
    }),
    effects: z.array(OpaqueRuleStateSchema),
    delayedActions: z.array(OpaqueRuleStateSchema),
    history: z.strictObject({
      limit: SafeCountSchema.min(1).max(4096),
      entries: z.array(
        z.strictObject({
          id: IdentifierSchema,
          sequence: SafeCountSchema,
          plyIndex: SafeCountSchema,
          side: PlayerSideSchema,
          positions: z.record(IdentifierSchema, CoordinateSchema),
          reference: z.string(),
        }),
      ),
      repetition: z.record(z.string(), SafeCountSchema),
      lastCountedPly: z.number().int().min(-1).max(Number.MAX_SAFE_INTEGER),
    }),
  })
  .readonly();
export type GameState = z.infer<typeof GameStateSchema>;
export const RootCommandSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('move'), pieceId: PieceIdSchema, to: CoordinateSchema }),
  z.strictObject({
    kind: z.literal('skill'),
    skillId: IdentifierSchema,
    intent: z
      .strictObject({ kind: z.literal('piece-target-v1'), pieceId: PieceIdSchema })
      .optional(),
  }),
  z.strictObject({ kind: z.literal('end') }),
  z.strictObject({ kind: z.literal('destroy'), pieceId: PieceIdSchema }),
]);
export const TrustedInputSchema = z.strictObject({
  authority: z.discriminatedUnion('kind', [
    z.strictObject({ kind: z.literal('player'), side: PlayerSideSchema }),
    z.strictObject({ kind: z.literal('system') }),
  ]),
  command: RootCommandSchema,
});
export type RootCommand = z.infer<typeof RootCommandSchema>;
export type TrustedInput = z.infer<typeof TrustedInputSchema>;
const EventMetadata = {
  id: IdentifierSchema,
  transactionId: IdentifierSchema,
  causeId: IdentifierSchema,
  sequence: SafeCountSchema,
  visibility: z.literal('internal'),
};
function typedEvent<K extends string, P extends z.ZodType>(kind: K, payload: P) {
  return z.strictObject({ ...EventMetadata, kind: z.literal(kind), payload });
}
const DeathPayload = {
  pieceId: PieceIdSchema,
  owner: PlayerSideSchema,
  controller: PlayerSideSchema,
  type: PieceTypeSchema,
};
const BoundaryPayload = {
  side: PlayerSideSchema,
  plyIndex: SafeCountSchema,
  roundIndex: SafeCountSchema.min(1),
};
const EffectFactPayload = {
  effectId: IdentifierSchema,
  definitionId: IdentifierSchema,
  definitionVersion: VersionIdentifierSchema,
  target: EffectTargetSchema,
  sourcePlayer: PlayerSideSchema,
  sourceVariant: IdentifierSchema.nullable(),
  sourceSkill: IdentifierSchema.nullable(),
  sourcePiece: PieceIdSchema.nullable(),
  effectVisibility: z.enum(['public', 'source-player', 'internal']),
};
export const DomainEventSchema = z.discriminatedUnion('kind', [
  typedEvent(
    'delayed_action_scheduled',
    z.strictObject({
      actionId: IdentifierSchema,
      definitionId: IdentifierSchema,
      definitionVersion: VersionIdentifierSchema,
      sourcePlayer: PlayerSideSchema,
      dueBoundary: DeadlineSchema,
    }),
  ),
  typedEvent(
    'delayed_action_fired',
    z.strictObject({
      actionId: IdentifierSchema,
      definitionId: IdentifierSchema,
      definitionVersion: VersionIdentifierSchema,
      sourcePlayer: PlayerSideSchema,
      dueBoundary: DeadlineSchema,
    }),
  ),
  typedEvent(
    'delayed_action_cancelled',
    z.strictObject({
      actionId: IdentifierSchema,
      definitionId: IdentifierSchema,
      definitionVersion: VersionIdentifierSchema,
      sourcePlayer: PlayerSideSchema,
      dueBoundary: DeadlineSchema,
      reason: IdentifierSchema,
    }),
  ),
  typedEvent(
    'effect_relocated',
    z.strictObject({ ...EffectFactPayload, from: EffectTargetSchema, to: EffectTargetSchema }),
  ),
  typedEvent(
    'effect_sets_swapped',
    z.strictObject({
      pieceA: PieceIdSchema,
      pieceB: PieceIdSchema,
      effectIds: z.array(IdentifierSchema),
    }),
  ),
  typedEvent('effect_applied', z.strictObject(EffectFactPayload)),
  typedEvent('effect_refreshed', z.strictObject(EffectFactPayload)),
  typedEvent(
    'effect_stacked',
    z.strictObject({ ...EffectFactPayload, count: SafeCountSchema.min(1) }),
  ),
  typedEvent(
    'effect_removed',
    z.strictObject({ ...EffectFactPayload, reason: EffectRemovalReasonSchema }),
  ),
  typedEvent(
    'move_committed',
    z.strictObject({
      pieceId: PieceIdSchema,
      from: CoordinateSchema,
      to: CoordinateSchema,
      controller: PlayerSideSchema,
      owner: PlayerSideSchema,
    }),
  ),
  typedEvent(
    'capture_committed',
    z.strictObject({ ...DeathPayload, actor: PlayerSideSchema, attackerId: PieceIdSchema }),
  ),
  typedEvent(
    'piece_destroyed',
    z.strictObject({
      ...DeathPayload,
      actor: PlayerSideSchema.nullable(),
      source: EffectSourceIdentitySchema.optional(),
      originEffectId: IdentifierSchema.optional(),
      rootActor: PlayerSideSchema.nullable().optional(),
    }),
  ),
  typedEvent(
    'bomb_exploded',
    z.strictObject({
      effectId: IdentifierSchema,
      definitionId: IdentifierSchema,
      center: CoordinateSchema,
      source: EffectSourceIdentitySchema,
      targets: z.array(PieceIdSchema),
    }),
  ),
  typedEvent(
    'piece_promoted',
    z.strictObject({ pieceId: PieceIdSchema, controller: PlayerSideSchema }),
  ),
  typedEvent(
    'ap_changed',
    z.strictObject({ side: PlayerSideSchema, before: SafeCountSchema, after: SafeCountSchema }),
  ),
  typedEvent(
    'skill_used',
    z.strictObject({
      actor: PlayerSideSchema,
      skillId: IdentifierSchema,
      actualCost: SafeCountSchema,
    }),
  ),
  typedEvent('turn_ended', z.strictObject({ ...BoundaryPayload, kind: z.literal('turnEnd') })),
  typedEvent('turn_started', z.strictObject({ ...BoundaryPayload, kind: z.literal('turnStart') })),
  typedEvent(
    'terminal_reached',
    z.union([
      z.strictObject({
        status: z.literal('won'),
        reason: z.literal('king_captured'),
        winner: PlayerSideSchema,
      }),
      z.strictObject({ status: z.literal('draw'), reason: z.literal('threefold_repetition') }),
    ]),
  ),
  typedEvent(
    'random_chosen',
    z.strictObject({ side: PlayerSideSchema, namespace: IdentifierSchema, value: z.string() }),
  ),
  typedEvent(
    'variant_state_changed',
    z.strictObject({ side: PlayerSideSchema, namespace: IdentifierSchema }),
  ),
  typedEvent('marker', z.strictObject({ value: z.string() })),
]);
export type DomainEvent = z.infer<typeof DomainEventSchema>;
export const ReplaySchema = z
  .strictObject({
    format: z.literal('variant-chess-replay-v1'),
    initialConfig: z.strictObject({
      matchId: MatchIdSchema,
      seed: z.number().int().min(1).max(0xffffffff),
      engineVersion: z.literal(ENGINE_VERSION),
      schemaVersion: z.literal(STATE_SCHEMA_VERSION),
      rulesetVersion: VersionIdentifierSchema,
      rulesetHash: IdentifierSchema,
      rngVersion: z.literal(RNG_ALGORITHM_VERSION),
    }),
    initialSnapshot: z.string(),
    steps: z.array(
      z.strictObject({
        input: TrustedInputSchema,
        stateHash: z.string().regex(/^[0-9a-f]{16}$/),
        events: z.array(DomainEventSchema),
      }),
    ),
  })
  .readonly();
export type ReplayArchive = z.infer<typeof ReplaySchema>;
// Contract only: only the Phase 03 authorized projector may produce this digest.
export interface RoleSafeViewHash {
  readonly kind: 'role-view';
  readonly projectionVersion: string;
  readonly revision: number;
  readonly digest: string;
}
