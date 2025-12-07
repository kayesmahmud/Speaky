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
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { api } from '../services/api';
import type { Message, MessagesStackParamList } from '../types';
import { useChatMessages } from '../hooks/useChatMessages';
import { colors } from '../theme';
import { computeWordDiff, DiffSegment } from '../utils/diff';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<MessagesStackParamList, 'Chat'>;

export function ChatScreen({ route, navigation }: Props) {
  const { connectionId, userName } = route.params;
  const [messageText, setMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [explanationText, setExplanationText] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { messages, isLoading, socket, queryClient, user } = useChatMessages(connectionId);

  // Typing indicator listener
  useEffect(() => {
    if (!socket) return;
    const handler = (data: { userId: number; isTyping: boolean }) => {
      if (data.userId !== user?.id) {
        setPartnerTyping(data.isTyping);
      }
    };
    socket.on('user_typing', handler);
    return () => {
      socket.off('user_typing', handler);
    };
  }, [socket, user?.id]);

  const handleTyping = useCallback(
    (text: string) => {
      setMessageText(text);

      if (!isTyping && text.length > 0) {
        setIsTyping(true);
        socket?.emit('typing', { connectionId, isTyping: true });
      }

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socket?.emit('typing', { connectionId, isTyping: false });
      }, 2000);
    },
    [connectionId, isTyping, socket],
  );

  const handleSend = useCallback(async () => {
    if (!messageText.trim() || isSending) return;

    const content = messageText.trim();
    setMessageText('');
    setIsSending(true);

    try {
      // Send via Socket.IO for real-time
      if (socket?.connected) {
        socket.emit('send_message', {
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
  }, [messageText, connectionId, queryClient, isSending, socket]);

  const handleLongPress = useCallback((message: Message) => {
    setSelectedMessage(message);
    const isOwnMessage = message.sender_id === user?.id;

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
            Alert.alert('Translation', result.translated_text);
          } catch {
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
    } catch {
      Alert.alert('Error', 'Failed to send correction');
    }
  }, [selectedMessage, correctionText, explanationText]);

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setIsUploadingImage(true);

      try {
        const fileUri = asset.uri;
        const fileName = fileUri.split('/').pop() || 'image.jpg';
        const fileType = asset.mimeType || 'image/jpeg';

        // Upload the image
        const uploadResult = await api.uploadMessageImage(connectionId, {
          uri: fileUri,
          type: fileType,
          name: fileName,
        });

        // Send image message via socket or API
        if (socket?.connected) {
          socket.emit('send_message', {
            connectionId,
            content: uploadResult.image_url,
            type: 'image',
          });
        } else {
          const newMessage = await api.sendMessage(connectionId, uploadResult.image_url, 'image');
          queryClient.setQueryData(['messages', connectionId], (old: Message[] = []) => [
            ...old,
            newMessage,
          ]);
        }
      } catch (error) {
        console.error('Failed to send image:', error);
        Alert.alert('Error', 'Failed to send image');
      } finally {
        setIsUploadingImage(false);
      }
    }
  }, [connectionId, socket, queryClient]);

  // Render diff segments with highlighting
  const renderDiffText = useCallback((segments: DiffSegment[]) => {
    return segments.map((segment, index) => {
      let style = {};
      if (segment.type === 'delete') {
        style = styles.diffDelete;
      } else if (segment.type === 'insert') {
        style = styles.diffInsert;
      }
      return (
        <Text key={index} style={style}>
          {segment.text}
        </Text>
      );
    });
  }, []);

  const renderMessage = useCallback(({ item }: { item: Message }) => {
    const isOwnMessage = item.sender_id === user?.id;
    const isImage = item.type === 'image';

    return (
      <TouchableOpacity
        onLongPress={() => !isImage && handleLongPress(item)}
        onPress={() => isImage && setPreviewImage(item.content)}
        delayLongPress={500}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.messageBubble,
            isOwnMessage ? styles.ownMessage : styles.otherMessage,
            isImage && styles.imageBubble,
          ]}
        >
          {isImage ? (
            <Image
              source={{ uri: item.content }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>
              {item.content}
            </Text>
          )}
          <View style={[styles.messageFooter, isImage && styles.imageFooter]}>
            <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime, isImage && styles.imageTime]}>
              {dayjs(item.created_at).format('HH:mm')}
            </Text>
            {isOwnMessage && (
              <Ionicons
                name={item.is_read ? 'checkmark-done' : 'checkmark'}
                size={14}
                color={isImage ? '#fff' : (item.is_read ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)')}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [user?.id, handleLongPress]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            queryClient.invalidateQueries({ queryKey: ['connections'] });
            navigation.goBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{userName}</Text>
        <View style={styles.headerSpacer} />
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
        <TouchableOpacity
          style={styles.attachButton}
          onPress={handlePickImage}
          disabled={isUploadingImage}
        >
          {isUploadingImage ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Ionicons name="image-outline" size={24} color={colors.primary} />
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={handleTyping}
          multiline
          maxLength={1000}
          placeholderTextColor={colors.mutedSecondary}
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

            {/* Diff Preview */}
            {selectedMessage?.content && correctionText.trim() && selectedMessage.content !== correctionText.trim() && (
              <>
                <Text style={styles.modalLabel}>Changes Preview:</Text>
                <View style={styles.diffPreview}>
                  <Text style={styles.diffText}>
                    {renderDiffText(computeWordDiff(selectedMessage.content, correctionText.trim()))}
                  </Text>
                </View>
                <View style={styles.diffLegend}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#ffcdd2' }]} />
                    <Text style={styles.legendText}>Removed</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendColor, { backgroundColor: '#c8e6c9' }]} />
                    <Text style={styles.legendText}>Added</Text>
                  </View>
                </View>
              </>
            )}

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

      {/* Image Preview Modal */}
      <Modal
        visible={!!previewImage}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPreviewImage(null)}
      >
        <TouchableOpacity
          style={styles.imagePreviewOverlay}
          activeOpacity={1}
          onPress={() => setPreviewImage(null)}
        >
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          <TouchableOpacity
            style={styles.closePreviewButton}
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
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
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: colors.primaryText,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  messageTime: {
    fontSize: 11,
    color: colors.mutedSecondary,
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
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.placeholder,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: colors.primary,
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
    color: colors.primaryText,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4,
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.surface,
  },
  typingText: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
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
    color: colors.muted,
    marginTop: 12,
    marginBottom: 6,
  },
  originalText: {
    fontSize: 14,
    color: colors.primaryText,
    backgroundColor: colors.backgroundAlt,
    padding: 12,
    borderRadius: 8,
  },
  correctionInput: {
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  explanationInput: {
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.muted,
    fontSize: 16,
  },
  submitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Image message styles
  attachButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  imageBubble: {
    padding: 4,
    overflow: 'hidden',
  },
  messageImage: {
    width: SCREEN_WIDTH * 0.6,
    height: SCREEN_WIDTH * 0.6,
    borderRadius: 12,
  },
  imageFooter: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  imageTime: {
    color: '#fff',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH,
  },
  closePreviewButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 22,
  },
  // Diff highlighting styles
  diffPreview: {
    backgroundColor: colors.backgroundAlt,
    padding: 12,
    borderRadius: 8,
    marginTop: 4,
  },
  diffText: {
    fontSize: 14,
    lineHeight: 22,
  },
  diffDelete: {
    backgroundColor: '#ffcdd2',
    color: '#c62828',
    textDecorationLine: 'line-through',
  },
  diffInsert: {
    backgroundColor: '#c8e6c9',
    color: '#2e7d32',
  },
  diffLegend: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: colors.muted,
  },
});
