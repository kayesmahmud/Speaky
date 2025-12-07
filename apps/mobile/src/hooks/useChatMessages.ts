import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { Message } from '../types';

function getSocketUrl(): string {
  if (!__DEV__) {
    return 'https://your-production-url.com';
  }
  return 'http://192.168.1.153:8000';
}

export function useChatMessages(connectionId: number) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', connectionId],
    queryFn: () => api.getMessages(connectionId),
  });

  const sortedMessages = useMemo(
    () => (messages ? [...messages].sort((a, b) => a.id - b.id) : []),
    [messages],
  );

  useEffect(() => {
    const token = api.getToken();
    if (!token) return;

    const socketUrl = getSocketUrl();
    socketRef.current = io(`${socketUrl}/ws/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      socketRef.current?.emit('join_room', { connectionId });
    });

    socketRef.current.on('new_message', (message: Message) => {
      queryClient.setQueryData(['messages', connectionId], (old: Message[] = []) => {
        if (old.some((m) => m.id === message.id)) return old;
        return [...old, message];
      });
    });

    socketRef.current.on('messages_read', (data: { connectionId: number; readBy: number }) => {
      if (data.readBy !== user?.id) {
        queryClient.setQueryData(['messages', connectionId], (old: Message[] = []) =>
          old.map((m) =>
            m.sender_id === user?.id ? { ...m, is_read: true, read_at: new Date().toISOString() } : m,
          ),
        );
      }
    });

    return () => {
      socketRef.current?.emit('leave_room', { connectionId });
      socketRef.current?.disconnect();
    };
  }, [connectionId, queryClient, user?.id]);

  // Mark messages as read when entering chat
  useEffect(() => {
    if (messages && messages.length > 0) {
      socketRef.current?.emit('mark_read', { connectionId });
    }
  }, [messages, connectionId]);

  return {
    messages: sortedMessages,
    isLoading,
    socket: socketRef.current,
    queryClient,
    user,
  };
}
