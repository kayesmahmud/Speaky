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
  Modal,
  Alert,
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
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const listRef = useRef<FlatList<Message>>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

    socketRef.current.on('user_typing', (data: { userId: number; isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setPartnerTyping(data.isTyping);
      }
    });

    socketRef.current.on('messages_read', (data: { connectionId: number; readBy: number }) => {
      if (data.readBy !== user?.id) {
        // Update messages to show as read
        queryClient.setQueryData(['messages', connectionId], (old: Message[] = []) =>
          old.map((m) =>
            m.sender_id === user?.id ? { ...m, is_read: true, read_at: new Date().toISOString() } : m
          )
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

  const handleTyping = useCallback((text: string) => {
    setMessageText(text);

    if (!isTyping && text.length > 0) {
      setIsTyping(true);
      socketRef.current?.emit('typing', { connectionId, isTyping: true });
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current?.emit('typing', { connectionId, isTyping: false });
    }, 2000);
  }, [connectionId, isTyping]);

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

  const handleLongPress = useCallback((message: Message) => {
    setSelectedMessage(message);
    const isOwnMessage = message.sender_id === user?.id;

    const options = isOwnMessage
      ? ['Translate', 'Cancel']
      : ['Correct', 'Translate', 'Cancel'];

    Alert.alert('Message Options', 'What would you like to do?', [
      ...(isOwnMessage
        ? []
        : [
            {
              text: 'Correct',
              onPress: () => {
                setCorrectionText(message.content);
                setShowCorrectionModal(true);
              },
            },
          ]),
      {
        text: 'Translate',
        onPress: async () => {
          try {
            const targetLang = user?.learning_language || 'EN';
            const result = await api.translateMessage(message.id, targetLang);
            setTranslatedText(result.translated_text);
            Alert.alert('Translation', result.translated_text);
          } catch (error) {
            Alert.alert('Error', 'Failed to translate message');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [user?.id, user?.learning_language]);

  const handleSubmitCorrection = useCallback(async () => {
    if (!selectedMessage || !correctionText.trim()) return;

    try {
      await api.createCorrection(selectedMessage.id, correctionText, explanationText || undefined);
      setShowCorrectionModal(false);
      setCorrectionText('');
      setExplanationText('');
      setSelectedMessage(null);
      Alert.alert('Success', 'Correction sent!');
    } catch (error) {
      Alert.alert('Error', 'Failed to send correction');
    }
  }, [selectedMessage, correctionText, explanationText]);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;

    return (
      <TouchableOpacity
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
          ]}
        >
          <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
            {item.content}
          </Text>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
              {dayjs(item.created_at).format('HH:mm')}
            </Text>
            {isOwnMessage && (
              <Text style={[styles.readStatus, item.is_read && styles.readStatusRead]}>
                {item.is_read ? '✓✓' : '✓'}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [user?.id, handleLongPress]);

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

      {partnerTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{userName} is typing...</Text>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          placeholderTextColor="#999"
          value={messageText}
          onChangeText={handleTyping}
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

      {/* Correction Modal */}
      <Modal
        visible={showCorrectionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCorrectionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Correct Message</Text>

            <Text style={styles.modalLabel}>Original:</Text>
            <Text style={styles.originalText}>{selectedMessage?.content}</Text>

            <Text style={styles.modalLabel}>Your Correction:</Text>
            <TextInput
              style={styles.correctionInput}
              value={correctionText}
              onChangeText={setCorrectionText}
              multiline
              placeholder="Enter corrected text..."
            />

            <Text style={styles.modalLabel}>Explanation (optional):</Text>
            <TextInput
              style={styles.explanationInput}
              value={explanationText}
              onChangeText={setExplanationText}
              multiline
              placeholder="Explain the correction..."
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCorrectionModal(false);
                  setCorrectionText('');
                  setExplanationText('');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmitCorrection}
              >
                <Text style={styles.submitButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  readStatus: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
  },
  readStatusRead: {
    color: 'rgba(255,255,255,0.9)',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  typingText: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 12,
    marginBottom: 6,
  },
  originalText: {
    fontSize: 14,
    color: '#333',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
  },
  correctionInput: {
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  explanationInput: {
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
