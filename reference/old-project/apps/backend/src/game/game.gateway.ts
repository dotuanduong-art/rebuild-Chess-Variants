// ============================================================
// Game Gateway - Socket.IO WebSocket handler
// ============================================================

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  GameService,
  type CommandContext,
  type CommittedRoomEvent,
} from './game.service.js';
import { Color, Position } from 'game-core';
import { AuthSessionRegistry } from '../auth/auth-session.registry.js';
import { publicPlayerRef, reconnectToken } from '../auth/auth.contract.js';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly gameService: GameService,
    private readonly authSessions: AuthSessionRegistry,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const guestId = client.handshake.auth?.guestId;
    this.authSessions.authenticateGuestSocket(
      client.id,
      typeof guestId === 'string' && guestId.length > 0 ? guestId : client.id,
    );
    client.emit('authenticated');
  }

  private rejectUnauthenticated(client: Socket): void {
    client.emit('auth-error', { message: 'Authentication required' });
    client.disconnect(true);
  }

  private requireAuthenticated(client: Socket): boolean {
    if (this.authSessions.getPrincipal(client.id)) {
      return true;
    }
    this.rejectUnauthenticated(client);
    return false;
  }

  private resolveCommandContext(
    client: Socket,
    roomCode: string,
  ): CommandContext | null {
    if (!this.requireAuthenticated(client)) return null;
    const playerRef = this.authSessions.getBoundPlayerRef(client.id, roomCode);
    const context = playerRef
      ? this.gameService.resolveCommandContext(client.id, roomCode, playerRef)
      : null;
    if (!context) {
      client.emit('error', { message: 'Socket is not bound to this room' });
    }
    return context;
  }

  private publicGameplayError(
    error: string | undefined,
    fallback: string,
  ): string {
    return error === 'Requester does not control this action'
      ? error
      : fallback;
  }

  private emitCommitted(event?: CommittedRoomEvent): void {
    for (const delivery of event?.deliveries ?? []) {
      this.server.to(delivery.socketId).emit(delivery.event, delivery.payload);
    }
  }

  // ─── Create Room ─────────────────────────────────────────
  @SubscribeMessage('create-room')
  handleCreateRoom(@ConnectedSocket() client: Socket): void {
    if (!this.requireAuthenticated(client)) return;

    const {
      roomCode,
      playerId,
      publicPlayerRef: playerRef,
    } = this.gameService.createRoom(client.id);
    const binding = this.authSessions.bindSeat(
      client.id,
      roomCode,
      publicPlayerRef(playerRef),
    );
    if (!binding.success) {
      this.gameService.removeRoom(roomCode);
      client.emit('error', { message: binding.error });
      return;
    }
    client.join(roomCode);
    client.emit('room-created', {
      roomCode,
      playerId,
      publicPlayerRef: playerRef,
      reconnectToken: binding.reconnectToken,
    });
    console.log(`Room ${roomCode} created by ${playerId}`);
  }

  // ─── Join Room ───────────────────────────────────────────
  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string },
  ): void {
    if (!this.requireAuthenticated(client)) return;

    const result = this.gameService.joinRoom(data.roomCode, client.id);

    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    const binding = this.authSessions.bindSeat(
      client.id,
      data.roomCode,
      publicPlayerRef(result.publicPlayerRef!),
    );
    if (!binding.success) {
      client.emit('error', { message: binding.error });
      return;
    }

    const playerObj = result.players?.find((p) => p.socketId === client.id);
    client.join(data.roomCode);
    client.emit('room-joined', {
      roomCode: data.roomCode,
      playerId: result.playerId,
      publicPlayerRef: result.publicPlayerRef,
      reconnectToken: binding.reconnectToken,
      playerColor: playerObj ? playerObj.color : Color.Black,
      players: result.players?.map((p) => ({
        publicPlayerRef: p.publicPlayerRef,
        color: p.color,
      })),
    });

    // Notify existing player
    client.to(data.roomCode).emit('player-joined', {
      publicPlayerRef: result.publicPlayerRef,
      players: result.players?.map((p) => ({
        publicPlayerRef: p.publicPlayerRef,
        color: p.color,
      })),
    });

    const draft = this.gameService.beginDraft(data.roomCode, () =>
      this.handleDraftTimeout(data.roomCode),
    );
    if (draft.success) {
      this.emitCommitted(draft.event);
      console.log(`Draft phase started in room ${data.roomCode}`);
    }
  }

  // ─── Change Color ────────────────────────────────────────
  @SubscribeMessage('change-color')
  handleChangeColor(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; playerId: string; color: string },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const colorVal = data.color === 'White' ? Color.White : Color.Black;
    const result = this.gameService.changePlayerColor(context, colorVal);
    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    this.emitCommitted(result.event);
  }

  // ─── Select Variant ──────────────────────────────────────
  @SubscribeMessage('select-variant')
  handleSelectVariant(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomCode: string; playerId: string; variantId: string | null },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const result = this.gameService.selectVariant(context, data.variantId);
    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    this.emitCommitted(result.event);
  }

  // ─── Confirm Variant ─────────────────────────────────────
  @SubscribeMessage('confirm-variant')
  handleConfirmVariant(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; playerId: string },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const result = this.gameService.confirmVariant(context);
    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    this.emitCommitted(result.event);

    if (result.allConfirmed) {
      this.proceedToReveal(data.roomCode);
    }
  }

  // ─── End Turn ────────────────────────────────────────────
  @SubscribeMessage('end-turn')
  handleEndTurn(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; playerId: string },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const result = this.gameService.endTurn(context, (event) =>
      this.emitCommitted(event),
    );
    if (!result.success) {
      client.emit('error', {
        message: this.publicGameplayError(result.error, 'Action rejected'),
      });
      return;
    }

    this.emitCommitted(result.event);
  }

  // ─── Move ────────────────────────────────────────────────
  @SubscribeMessage('move')
  handleMove(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomCode: string; playerId: string; from: string; to: string },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const result = this.gameService.makeMove(
      context,
      data.from,
      data.to,
      (event) => this.emitCommitted(event),
    );

    if (!result.success) {
      client.emit('move-rejected', {
        reason: this.publicGameplayError(result.error, 'Move rejected'),
      });
      return;
    }

    this.emitCommitted(result.event);
  }

  // ─── Sacrifice Piece ─────────────────────────────────────
  @SubscribeMessage('sacrifice-piece')
  handleSacrificePiece(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomCode: string;
      playerId: string;
      position: Position;
      pieceId: string;
    },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const result = this.gameService.sacrificePiece(
      context,
      data.position,
      data.pieceId,
      (event) => this.emitCommitted(event),
    );

    if (!result.success) {
      client.emit('error', {
        message: this.publicGameplayError(result.error, 'Action rejected'),
      });
      return;
    }

    this.emitCommitted(result.event);
  }

  // ─── Get Enemy Piece Moves ───────────────────────────────
  @SubscribeMessage('get-enemy-piece-moves')
  handleGetEnemyPieceMoves(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomCode: string; playerId: string; position: Position },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const result = this.gameService.getLegalMoves(context, data.position);
    if (!result.success) {
      client.emit('error', {
        message: this.publicGameplayError(result.error, 'Move query rejected'),
      });
      return;
    }
    const moves = result.moves;
    client.emit('enemy-piece-moves', { position: data.position, moves });
  }

  // ─── Use Skill ───────────────────────────────────────────
  @SubscribeMessage('use-skill')
  handleUseSkill(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      roomCode: string;
      playerId: string;
      skillId: string;
      targets: any[];
    },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const result = this.gameService.useSkill(
      context,
      data.skillId,
      data.targets,
      (event) => this.emitCommitted(event),
    );

    if (!result.success) {
      client.emit('skill-rejected', {
        reason: this.publicGameplayError(result.error, 'Skill rejected'),
      });
      return;
    }

    this.emitCommitted(result.event);
  }

  // ─── Pass Skill ──────────────────────────────────────────
  @SubscribeMessage('pass-skill')
  handlePassSkill(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; playerId: string },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const result = this.gameService.passSkill(context, (event) =>
      this.emitCommitted(event),
    );
    if (!result.success) {
      client.emit('error', {
        message: this.publicGameplayError(result.error, 'Action rejected'),
      });
      return;
    }

    this.emitCommitted(result.event);
  }

  // ─── Reconnect ───────────────────────────────────────────
  @SubscribeMessage('reconnect-room')
  handleReconnect(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { roomCode: string; playerId: string; reconnectToken: string },
  ): void {
    if (!this.requireAuthenticated(client)) return;

    const playerRef = this.gameService.getPublicPlayerRef(
      data.roomCode,
      data.playerId,
    );
    const authorization = playerRef
      ? this.authSessions.authorizeSeat(
          client.id,
          data.roomCode,
          publicPlayerRef(playerRef),
          reconnectToken(data.reconnectToken),
        )
      : { success: false as const, error: 'Reconnect credential rejected' };
    if (!authorization.success) {
      client.emit('error', { message: authorization.error });
      return;
    }

    const result = this.gameService.handleReconnect(
      data.roomCode,
      data.playerId,
      client.id,
    );

    if (!result.success) {
      client.emit('error', { message: result.error });
      return;
    }

    const credential = this.authSessions.rotateSeat(
      client.id,
      data.roomCode,
      publicPlayerRef(result.publicPlayerRef!),
    );
    if (!credential.success) {
      client.emit('error', { message: credential.error });
      return;
    }

    const snapshot = this.gameService.getReconnectSnapshot(
      data.roomCode,
      result.playerColor!,
    );
    client.join(data.roomCode);
    client.emit('reconnected', {
      roomCode: data.roomCode,
      playerId: data.playerId,
      publicPlayerRef: result.publicPlayerRef,
      reconnectToken: credential.reconnectToken,
      playerColor: result.playerColor,
      matchState: snapshot?.matchState,
      roomPhase: snapshot?.roomPhase || 'waiting',
      draftEndTime: snapshot?.draftEndTime,
    });

    client.to(data.roomCode).emit('player-reconnected', {
      publicPlayerRef: result.publicPlayerRef,
    });

    console.log(`Player ${data.playerId} reconnected to room ${data.roomCode}`);
  }

  // ─── Surrender ───────────────────────────────────────────
  @SubscribeMessage('surrender')
  handleSurrender(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomCode: string; playerId: string },
  ): void {
    const context = this.resolveCommandContext(client, data.roomCode);
    if (!context) return;
    const result = this.gameService.surrender(context);
    if (!result.success) {
      client.emit('error', {
        message: this.publicGameplayError(result.error, 'Action rejected'),
      });
      return;
    }

    this.emitCommitted(result.event);
    console.log(
      `Player ${context.playerId} surrendered in room ${data.roomCode}. Winner: ${result.winner}`,
    );
  }

  // ─── Disconnect ──────────────────────────────────────────
  handleDisconnect(@ConnectedSocket() client: Socket): void {
    const info = this.gameService.handleDisconnect(client.id, (event) =>
      this.emitCommitted(event),
    );
    this.authSessions.disconnectSocket(client.id);
    if (!info) return;

    console.log(
      `Player ${info.playerId} disconnected from room ${info.roomCode}`,
    );

    this.emitCommitted(info.event);
  }

  // ─── Draft Phase Transitions ─────────────────────────────
  private handleDraftTimeout(roomCode: string): void {
    this.proceedToReveal(roomCode, true);
  }

  private proceedToReveal(roomCode: string, completeDraft = false): void {
    const result = completeDraft
      ? this.gameService.completeDraft(roomCode, () =>
          this.proceedToLoading(roomCode),
        )
      : this.gameService.beginReveal(roomCode, () =>
          this.proceedToLoading(roomCode),
        );
    if (!result.success) return;

    this.emitCommitted(result.event);
  }

  private proceedToLoading(roomCode: string): void {
    const result = this.gameService.beginLoading(roomCode, () =>
      this.proceedToMatchStart(roomCode),
    );
    if (!result.success) return;
    this.emitCommitted(result.event);
  }

  private proceedToMatchStart(roomCode: string): void {
    const startResult = this.gameService.startMatch(roomCode, (event) =>
      this.emitCommitted(event),
    );
    if (startResult.success) {
      this.emitCommitted(startResult.event);
      console.log(`Match started after loading in room ${roomCode}`);
    }
  }
}
