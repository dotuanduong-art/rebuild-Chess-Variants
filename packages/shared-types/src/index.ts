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
