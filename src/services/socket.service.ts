import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt.js';
import { DbService } from './db.service.js';
import { MessageDto } from '../models/types.js';

let io: SocketIOServer | null = null;

export function initSocketServer(server: HttpServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
  });

  // Socket authentication middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
        socket.handshake.query?.token;

      if (token && typeof token === 'string') {
        const payload = verifyToken(token);
        if (payload) {
          const user = await DbService.findUserById(payload.userId);
          if (user) {
            (socket as any).user = user;
          }
        }
      }
      next();
    } catch (err) {
      next();
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    const userName = user ? user.name : 'Anonymous';

    // Join a specific channel room
    socket.on('join_channel', async (channelId: string) => {
      socket.join(channelId);
      socket.to(channelId).emit('user_joined_channel', {
        userId: user?.id,
        userName,
        channelId,
        timestamp: new Date().toISOString(),
      });
    });

    // Leave a specific channel room
    socket.on('leave_channel', (channelId: string) => {
      socket.leave(channelId);
      socket.to(channelId).emit('user_left_channel', {
        userId: user?.id,
        userName,
        channelId,
        timestamp: new Date().toISOString(),
      });
    });

    // Handle incoming real-time message through WebSocket directly
    socket.on('send_message', async (data: { channelId: string; message: string }) => {
      if (!user) {
        socket.emit('error', { message: 'Authentication required to send messages' });
        return;
      }

      if (!data.channelId || !data.message?.trim()) {
        socket.emit('error', { message: 'Channel ID and message content are required' });
        return;
      }

      try {
        const message = await DbService.createMessage({
          channelId: data.channelId,
          userId: user.id,
          message: data.message.trim(),
        });

        // Broadcast to channel room
        io?.to(data.channelId).emit('new_message', message);

        // Record activity
        await DbService.recordActivity({
          action: 'Message sent',
          entityType: 'MESSAGE',
          entityId: message.id,
          details: `Sent message in channel`,
          userId: user.id,
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message || 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data: { channelId: string; isTyping: boolean }) => {
      socket.to(data.channelId).emit('user_typing', {
        userId: user?.id,
        userName,
        channelId: data.channelId,
        isTyping: data.isTyping,
      });
    });

    socket.on('disconnect', () => {
      // client disconnected
    });
  });

  return io;
}

export function getSocketServer(): SocketIOServer | null {
  return io;
}

export function broadcastNewMessage(channelId: string, message: MessageDto) {
  if (io) {
    io.to(channelId).emit('new_message', message);
  }
}

export function broadcastActivity(activity: any) {
  if (io) {
    io.emit('new_activity', activity);
  }
}

export function broadcastNotification(userId: string, notification: any) {
  if (io) {
    io.emit(`notification:${userId}`, notification);
  }
}
