import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
 @WebSocketServer()
server!: Server;

  handleConnection(client: Socket) {
    console.log('WS connected:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('WS disconnected:', client.id);
  }

  emitCourierLocation(data: {
    courierId: string;
    userId?: string;
    lat: number;
    lng: number;
    isOnline?: boolean;
    lastSeenAt?: string | Date | null;
    activeOrderId?: string | null;
  }) {
    this.server.emit('courier.location.updated', data);
  }
}