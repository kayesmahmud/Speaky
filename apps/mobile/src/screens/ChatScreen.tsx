import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { io, Socket } from 'socket.io-client';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { Message, MessagesStackParamList } from '../types';

type Props = NativeStackScreenProps<MessagesStackParamList, 'Chat'>;

function getSocketUrl(): string {
  if (!__DEV__) {
    return 'https://your-production-url.com';
  }
  return 'http://192.168.1.153:8000';
}

export function ChatScreen({ route }: Props) {
  const { connectionId, userName } = route.params;
  const { user } = useAuthStore();
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<Message>>(null);
  const socketRef = useRef<Socket | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ['messages', connectionId],
    queryFn: () => api.getMessages(connectionId),
  });

  // Socket.IO connection
  useEffect(() => {
    const token = api.getToken();
    if (!token) return;

    const socketUrl = getSocketUrl();
    socketRef.current = io(`${socketUrl}/ws/chat`, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      socketRef.current?.emit('join_room', { connectionId });
    });

    socketRef.current.on('new_message', (message: Message) => {
      queryClient.setQueryData(['messages', connectionId], (old: Message[] = []) => {
        if (old.some(m => m.id === message.id)) return old;
        return [...old, message];
      });
    });

    socketRef.current.on('error', (error: { message: string }) => {
      console.log('Socket error:', error.message);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    return () => {
      socketRef.current?.emit('leave_room', { connectionId });
      socketRef.current?.disconnect();
    };
  }, [connectionId, queryClient]);

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || isSending) return;

    const content = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      // Send via Socket.IO for real-time
      if (socketRef.current?.connected) {
        socketRef.current.emit('send_message', {
          connectionId,
          content,
          type: 'text',
        });
      } else {
        // Fallback to REST API
        const newMessage = await api.sendMessage(connectionId, content);
        queryClient.setQueryData(['messages', connectionId], (old: Message[] = []) => [
          ...old,
          newMessage,
        ]);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessageText(content);
    } finally {
      setIsSending(false);
    }
  }, [messageText, connectionId, queryClient, isSending]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;

    return (
      <View
        style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
      >
        <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
          {dayjs(item.created_at).format('HH:mm')}
        </Text>
      </View>
    );
  }, [user?.id]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{userName}</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages || []}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => {
          listRef.current?.scrollToEnd({ animated: true });
        }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Say hello to start the conversation!</Text>
          </View>
        }
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={!messageText.trim() || isSending}
        >
          {isSending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
    textAlign: 'center',
  },
  messageList: {
    padding: 16,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
  },
  ownMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007aff',
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#111',
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  ownMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  input: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007aff',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#ccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});
