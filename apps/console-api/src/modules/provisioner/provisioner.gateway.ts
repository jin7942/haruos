import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Server, Socket } from 'socket.io';

/**
 * Console WebSocket Gateway.
 * 프로비저닝 상태 변경, 비용 알림 등을 관리자에게 실시간 전송한다.
 * handleConnection에서 JWT 토큰을 검증하여 인증된 사용자만 연결을 허용한다.
 */
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/ws/console',
})
export class ConsoleGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConsoleGateway.name);

  /** userId -> socketId 매핑. */
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

  /**
   * 클라이언트 연결 시 JWT 토큰을 검증한다.
   * 토큰은 query param (token) 또는 auth 헤더로 전달 가능.
   */
  handleConnection(client: Socket): void {
    try {
      const token =
        (client.handshake.query.token as string) ||
        client.handshake.auth?.token ||
        client.handshake.headers.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn(`Connection rejected: no token (${client.id})`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub;

      (client as any).userId = userId;

      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(client.id);

      client.join(`user:${userId}`);

      this.logger.log(`Console client connected: ${client.id} (user: ${userId})`);
    } catch {
      this.logger.warn(`Connection rejected: invalid token (${client.id})`);
      client.disconnect();
    }
  }

  /**
   * 클라이언트 연결 해제 시 매핑을 정리한다.
   */
  handleDisconnect(client: Socket): void {
    const userId = (client as any).userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
    this.logger.log(`Console client disconnected: ${client.id}`);
  }

  /**
   * 특정 사용자에게 알림을 전송한다.
   *
   * @param userId - 대상 사용자 ID
   * @param type - 알림 유형 (예: provisioning_status, cost_alert)
   * @param data - 알림 데이터
   */
  sendNotification(userId: string, type: string, data: Record<string, unknown>): void {
    this.server.to(`user:${userId}`).emit('notification', { type, data, timestamp: new Date().toISOString() });
  }

  /**
   * 모든 연결된 관리자에게 브로드캐스트한다.
   *
   * @param type - 이벤트 유형
   * @param data - 이벤트 데이터
   */
  broadcast(type: string, data: Record<string, unknown>): void {
    this.server.emit('notification', { type, data, timestamp: new Date().toISOString() });
  }
}
