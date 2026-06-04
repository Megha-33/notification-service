import {
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';

import { WS_EVENTS, WS_NAMESPACE, WS_ROOM_PREFIX } from './constants/ws.constants';
import { JwtService } from 'src/module/auth/jwt.service';
import { RealtimeNotificationMessage } from './interfaces/realtime-notification.interface';
import { JwtPayload } from 'src/module/auth/interfaces/jwt-payload.interface';

const originRaw = process.env.WS_CORS_ORIGIN;
const corsOrigin: string | string[] = originRaw
  ? originRaw.split(',').map((s) => s.trim()).filter(Boolean)
  : '*';
const corsCredentials = corsOrigin !== '*';
const pingInterval = Number(process.env.WS_PING_INTERVAL ?? 25000);
const pingTimeout = Number(process.env.WS_PING_TIMEOUT ?? 60000);
const enableRedisAdapter = process.env.WS_REDIS_ADAPTER !== 'false';

@WebSocketGateway({
  namespace: `/${WS_NAMESPACE}`,
  transports: ['websocket'],
  cors: {
    origin: corsOrigin,
    credentials: corsCredentials,
  },
  pingInterval,
  pingTimeout,
})
export class NotificationWsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationWsGateway.name);
  private readonly redisClients: Redis[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) { }

  afterInit() {
    if (!enableRedisAdapter) {
      this.logger.log('Socket.IO Redis adapter disabled');
      return;
    }

    const host = this.configService.getOrThrow<string>('redis.host');
    const port = this.configService.getOrThrow<number>('redis.port');
    const password = this.configService.get<string>('redis.password');
    const tlsEnabled = this.configService.get<boolean>('redis.tls');

    const redisOptions = {
      host,
      port,
      ...(password ? { password } : {}),
      ...(tlsEnabled ? { tls: {} } : {}),
    };

    const pubClient = new Redis(redisOptions);
    const subClient = new Redis(redisOptions);
    this.redisClients.push(pubClient, subClient);

    if (typeof this.server?.adapter !== 'function') {
      this.logger.error('Socket.IO adapter is not available');
      return;
    }

    const adapter = createAdapter(pubClient, subClient);
    this.server.adapter(adapter);

    this.logger.log('Socket.IO Redis adapter enabled');
  }

  async handleConnection(client: Socket) {
    const tokenOrUndefined = this.extractToken(client);
    if (!tokenOrUndefined) {
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verifyToken(tokenOrUndefined) as JwtPayload;
      const userId = payload.sub;

      client.join(this.getUserRoom(userId));
      client.data.userId = userId;

      this.logger.log(`WebSocket client connected: userId=${userId}`);
      client.emit('ws.connected', { namespace: `/${WS_NAMESPACE}` });
    } catch (err) {
      this.logger.warn(`WebSocket auth failed: ${(err as Error).message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data.userId as string | undefined;
    if (userId) {
      this.logger.log(`WebSocket client disconnected: userId=${userId}`);
    }
  }

  onModuleDestroy() {
    for (const client of this.redisClients) {
      client.disconnect();
    }
  }

  public emitNotificationCreated(payload: RealtimeNotificationMessage) {
    console.log("payload", payload);
    
    this.emitToUser(payload.userId, WS_EVENTS.NOTIFICATION_CREATED, payload);
  }

  public emitToUser(userId: string, event: string, payload: unknown) {
    if (!this.server) return;

    const room = this.getUserRoom(userId);
    this.server.to(room).emit(event, payload);
  }

  private getUserRoom(userId: string) {
    return `${WS_ROOM_PREFIX}${userId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const authToken = (client.handshake.auth as { token?: unknown } | undefined)?.token;
    if (typeof authToken === 'string' && authToken.length > 0) return authToken;

    const queryToken = client.handshake.query?.token;
    if (typeof queryToken === 'string' && queryToken.length > 0) return queryToken;

    if (Array.isArray(queryToken) && typeof queryToken[0] === 'string') return queryToken[0];

    return undefined;
  }
}

