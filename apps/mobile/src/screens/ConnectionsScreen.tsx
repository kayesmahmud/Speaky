import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { Connection, MessagesStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<MessagesStackParamList>;

export function ConnectionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: connections, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['connections'],
    // Bind to api instance to preserve `this` for auth headers
    queryFn: () => api.getConnections(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'accepted' | 'blocked' }) =>
      api.updateConnection(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['connections'] });
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleAccept = useCallback((connectionId: number) => {
    updateMutation.mutate({ id: connectionId, status: 'accepted' });
  }, [updateMutation]);

  const handleBlock = useCallback((connectionId: number) => {
    Alert.alert(
      'Block User',
      'Are you sure you want to block this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => updateMutation.mutate({ id: connectionId, status: 'blocked' }),
        },
      ]
    );
  }, [updateMutation]);

  const handleOpenChat = useCallback((connection: Connection) => {
    if (connection.status === 'accepted' && connection.partner) {
      navigation.navigate('Chat', {
        connectionId: connection.id,
        userName: connection.partner.name,
      });
    }
  }, [navigation]);

  // Format timestamp like WhatsApp
  const formatTime = (dateString: string) => {
    const date = dayjs(dateString);
    const now = dayjs();

    if (date.isSame(now, 'day')) {
      return date.format('HH:mm');
    } else if (date.isSame(now.subtract(1, 'day'), 'day')) {
      return 'Yesterday';
    } else if (date.isSame(now, 'week')) {
      return date.format('ddd');
    } else {
      return date.format('DD/MM/YY');
    }
  };

  // Truncate last message
  const truncateMessage = (content: string, maxLength: number = 40) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const pendingConnections = connections?.filter(c => c.status === 'pending') || [];
  const acceptedConnections = connections?.filter(c => c.status === 'accepted') || [];

  const renderConversationCard = useCallback(({ item }: { item: Connection }) => {
    const hasUnread = (item.unread_count || 0) > 0;
    const lastMessage = item.last_message;
    const isOwnMessage = lastMessage?.sender_id === user?.id;

    return (
      <TouchableOpacity
        style={styles.conversationCard}
        onPress={() => handleOpenChat(item)}
        activeOpacity={0.7}
      >
        {/* Avatar with online indicator */}
        <View style={styles.avatarContainer}>
          <Image
            source={{
              uri: item.partner?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(item.partner?.name || 'User')}&background=007aff&color=fff`
            }}
            style={styles.avatar}
          />
          {item.partner?.is_online && (
            <View style={styles.onlineIndicator} />
          )}
        </View>

        {/* Conversation info */}
        <View style={styles.conversationInfo}>
          <View style={styles.topRow}>
            <Text style={[styles.userName, hasUnread && styles.userNameUnread]}>
              {item.partner?.name || 'User'}
            </Text>
            {lastMessage && (
              <Text style={[styles.timestamp, hasUnread && styles.timestampUnread]}>
                {formatTime(lastMessage.created_at)}
              </Text>
            )}
          </View>

          <View style={styles.bottomRow}>
            <Text
              style={[styles.lastMessage, hasUnread && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {lastMessage ? (
                <>
                  {isOwnMessage && (
                    <Text style={styles.youPrefix}>You: </Text>
                  )}
                  {truncateMessage(lastMessage.content)}
                </>
              ) : (
                <Text style={styles.noMessages}>Start a conversation</Text>
              )}
            </Text>

            {hasUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>
                  {item.unread_count! > 99 ? '99+' : item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [user?.id, handleOpenChat]);

  const renderPendingCard = useCallback(({ item }: { item: Connection }) => {
    const isIncoming = item.user_b === user?.id;

    return (
      <View style={styles.pendingCard}>
        <Image
          source={{
            uri: item.partner?.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(item.partner?.name || 'User')}&background=007aff&color=fff`
          }}
          style={styles.pendingAvatar}
        />
        <View style={styles.pendingInfo}>
          <Text style={styles.pendingName}>{item.partner?.name || 'User'}</Text>
          <Text style={styles.pendingStatus}>
            {isIncoming ? 'Wants to connect with you' : 'Waiting for response'}
          </Text>
        </View>
        {isIncoming && (
          <View style={styles.pendingActions}>
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={() => handleAccept(item.id)}
            >
              <Text style={styles.acceptButtonText}>Accept</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => handleBlock(item.id)}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [user?.id, handleAccept, handleBlock]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>

      <FlatList
        data={acceptedConnections}
        renderItem={renderConversationCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListHeaderComponent={
          pendingConnections.length > 0 ? (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionHeader}>
                Connection Requests ({pendingConnections.length})
              </Text>
              {pendingConnections.map((item) => (
                <View key={item.id}>
                  {renderPendingCard({ item })}
                </View>
              ))}
              <View style={styles.sectionDivider} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          pendingConnections.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="chatbubbles-outline" size={64} color="#999" />
              <Text style={styles.emptyText}>No conversations yet</Text>
              <Text style={styles.emptySubtext}>
                Find language partners and start chatting!
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
  },
  listContent: {
    flexGrow: 1,
  },
  conversationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e0e0e0',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34c759',
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#111',
  },
  userNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 13,
    color: '#999',
  },
  timestampUnread: {
    color: '#007aff',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lastMessage: {
    flex: 1,
    fontSize: 15,
    color: '#666',
    marginRight: 8,
  },
  lastMessageUnread: {
    color: '#111',
    fontWeight: '500',
  },
  youPrefix: {
    color: '#999',
  },
  noMessages: {
    color: '#999',
    fontStyle: 'italic',
  },
  unreadBadge: {
    backgroundColor: '#007aff',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadCount: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  pendingSection: {
    backgroundColor: '#f8f8f8',
    paddingTop: 12,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionDivider: {
    height: 8,
    backgroundColor: '#f0f0f0',
    marginTop: 8,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
  },
  pendingAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e0e0e0',
  },
  pendingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  pendingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  pendingStatus: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#34c759',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineButtonText: {
    color: '#666',
    fontSize: 14,
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
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
