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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { Connection, MessagesStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<MessagesStackParamList>;

interface ConnectionWithUser extends Connection {
  partner?: {
    id: number;
    name: string;
    avatar_url?: string;
    native_language?: string;
    learning_language?: string;
  };
}

export function ConnectionsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: connections, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['connections'],
    queryFn: api.getConnections,
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

  const handleOpenChat = useCallback((connection: ConnectionWithUser) => {
    if (connection.status === 'accepted' && connection.partner) {
      navigation.navigate('Chat', {
        connectionId: connection.id,
        userName: connection.partner.name,
      });
    }
  }, [navigation]);

  const pendingConnections = connections?.filter(c => c.status === 'pending') || [];
  const acceptedConnections = connections?.filter(c => c.status === 'accepted') || [];

  const renderConnectionCard = useCallback(({ item }: { item: ConnectionWithUser }) => {
    const isPending = item.status === 'pending';
    const isIncoming = item.user_b === user?.id;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleOpenChat(item)}
        disabled={isPending}
      >
        <View style={styles.cardContent}>
          <Image
            source={{
              uri: item.partner?.avatar_url ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(item.partner?.name || 'User')}&background=007aff&color=fff`
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.partner?.name || 'User'}</Text>
            <Text style={styles.userLanguages}>
              {item.partner?.native_language} → {item.partner?.learning_language}
            </Text>
            {isPending && (
              <Text style={styles.statusText}>
                {isIncoming ? 'Wants to connect' : 'Pending acceptance'}
              </Text>
            )}
          </View>
          {isPending && isIncoming && (
            <View style={styles.actionButtons}>
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
          {!isPending && (
            <Text style={styles.chatArrow}>→</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [user?.id, handleAccept, handleBlock, handleOpenChat]);

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
        <Text style={styles.title}>Connections</Text>
        <Text style={styles.subtitle}>Your language partners</Text>
      </View>

      <FlatList
        data={[...pendingConnections, ...acceptedConnections]}
        renderItem={renderConnectionCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListHeaderComponent={
          pendingConnections.length > 0 ? (
            <Text style={styles.sectionHeader}>
              Pending Requests ({pendingConnections.length})
            </Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No connections yet</Text>
            <Text style={styles.emptySubtext}>
              Discover partners and send connection requests
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  userLanguages: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  statusText: {
    fontSize: 12,
    color: '#007aff',
    marginTop: 4,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#34c759',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineButtonText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
  },
  chatArrow: {
    fontSize: 20,
    color: '#999',
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
    textAlign: 'center',
  },
});
