import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        (client.handshake.headers.authorization?.replace('Bearer ', '') ??
          '');
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwt.verify<{ sub: string }>(token);
      client.join(`user:${payload.sub}`);
      client.join('broadcast');
    } catch {
      client.disconnect();
    }
  }

  emitToUser(userId: string, event: string, data: unknown) {
    this.server?.to(`user:${userId}`).emit(event, data);
  }

  broadcast(event: string, data: unknown) {
    this.server?.to('broadcast').emit(event, data);
  }
}
