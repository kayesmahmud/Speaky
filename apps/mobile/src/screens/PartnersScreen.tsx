import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { api } from '../services/api';
import { Avatar } from '../components/Avatar';
import { startConversationAndNavigate } from '../utils/conversations';
import type { Partner, PartnersStackParamList, MainTabParamList } from '../types';
import { colors } from '../theme';

dayjs.extend(relativeTime);

type NavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<PartnersStackParamList, 'PartnersList'>,
  BottomTabNavigationProp<MainTabParamList>
>;

export function PartnersScreen() {
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();

  const { data: partners, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['partners'],
    queryFn: () => api.getPartners(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Navigate to Messages tab and open chat
  const handleChatPress = useCallback(async (partner: Partner) => {
    try {
      await startConversationAndNavigate(
        partner.id,
        queryClient,
        (connectionId) =>
          navigation.navigate('Messages', {
            screen: 'Chat',
            params: {
              connectionId,
              userName: partner.name,
            },
          }),
      );
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  }, [navigation, queryClient]);

  // Navigate to user profile when clicking avatar
  const handleAvatarPress = useCallback((partner: Partner) => {
    navigation.navigate('UserProfile', {
      userId: partner.id,
      userName: partner.name,
    });
  }, [navigation]);

  const renderPartner = useCallback(({ item }: { item: Partner }) => {
    const lastActiveText = item.is_online
      ? 'Online now'
      : `Active ${dayjs(item.last_active).fromNow()}`;

    return (
      <View style={styles.partnerCard}>
        {/* Avatar - clickable to go to profile */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => handleAvatarPress(item)}
          activeOpacity={0.7}
        >
          <Avatar
            uri={item.avatar_url}
            name={item.name}
            isOnline={item.is_online}
            showStatus
            size={56}
          />
        </TouchableOpacity>

        {/* Partner info - also clickable to profile */}
        <TouchableOpacity
          style={styles.partnerInfo}
          onPress={() => handleAvatarPress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.partnerName}>{item.name}</Text>
          <Text style={styles.languages}>
            {item.native_language} → {item.learning_language}
          </Text>
          {item.bio && (
            <Text style={styles.bio} numberOfLines={2}>
              {item.bio}
            </Text>
          )}
          <Text style={[styles.lastActive, item.is_online && styles.onlineText]}>
            {lastActiveText}
          </Text>
        </TouchableOpacity>

        {/* Chat button - goes to Messages tab */}
        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => handleChatPress(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.chatButtonText}>Chat</Text>
        </TouchableOpacity>
      </View>
    );
  }, [handleAvatarPress, handleChatPress]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Language Partners</Text>
        <Text style={styles.headerSubtitle}>
          People who speak what you&apos;re learning
        </Text>
      </View>

      <FlatList
        data={partners || []}
        renderItem={renderPartner}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No partners found</Text>
            <Text style={styles.emptySubtext}>
              Make sure you&apos;ve set your native and learning languages in your profile
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
    backgroundColor: colors.backgroundAlt,
  },
  header: {
    backgroundColor: colors.surface,
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.primaryText,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  partnerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarContainer: {
    position: 'relative',
  },
  partnerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  partnerName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primaryText,
  },
  languages: {
    fontSize: 14,
    color: colors.primary,
    marginTop: 2,
  },
  bio: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 4,
  },
  lastActive: {
    fontSize: 12,
    color: colors.mutedSecondary,
    marginTop: 4,
  },
  onlineText: {
    color: colors.success,
    fontWeight: '500',
  },
  chatButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primaryText,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 8,
    textAlign: 'center',
  },
});
