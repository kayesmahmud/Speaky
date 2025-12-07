import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { api } from '../services/api';
import { startConversationAndNavigate } from '../utils/conversations';
import type { PartnersStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<PartnersStackParamList, 'UserProfile'>;
type UserProfileRouteProp = RouteProp<PartnersStackParamList, 'UserProfile'>;

export function UserProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<UserProfileRouteProp>();
  const queryClient = useQueryClient();
  const { userId, userName } = route.params;

  // For now, we'll use the partners data since we don't have a dedicated user profile endpoint
  const { data: partners, isLoading } = useQuery({
    queryKey: ['partners'],
    queryFn: () => api.getPartners(),
  });

  const user = partners?.find((p) => p.id === userId);

  const handleStartChat = async () => {
    try {
      await startConversationAndNavigate(
        userId,
        queryClient,
        (connectionId) =>
          navigation.getParent()?.navigate('Messages', {
            screen: 'Chat',
            params: {
              connectionId,
              userName,
            },
          }),
      );
    } catch (error) {
      console.error('Failed to start conversation:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007aff" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#007aff" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatarContainer}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {userName.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <View
            style={[
              styles.onlineIndicator,
              user?.is_online ? styles.online : styles.offline,
            ]}
          />
        </View>

        <Text style={styles.userName}>{userName}</Text>

        {user && (
          <>
            <View style={styles.languageContainer}>
              <Text style={styles.languageLabel}>Native:</Text>
              <Text style={styles.languageValue}>{user.native_language || 'Not set'}</Text>
            </View>
            <View style={styles.languageContainer}>
              <Text style={styles.languageLabel}>Learning:</Text>
              <Text style={styles.languageValue}>{user.learning_language || 'Not set'}</Text>
            </View>

            {user.bio && (
              <View style={styles.bioContainer}>
                <Text style={styles.bioLabel}>About</Text>
                <Text style={styles.bioText}>{user.bio}</Text>
              </View>
            )}

            <View style={styles.statusContainer}>
              <View style={[styles.statusDot, user.is_online ? styles.online : styles.offline]} />
              <Text style={styles.statusText}>
                {user.is_online ? 'Online now' : 'Offline'}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.chatButton} onPress={handleStartChat}>
          <Ionicons name="chatbubble" size={18} color="#fff" />
          <Text style={styles.chatButtonText}>Start Chat</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 4,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007aff',
  },
  profileSection: {
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 48,
    fontWeight: '600',
    color: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 3,
    borderColor: '#fff',
  },
  online: {
    backgroundColor: '#34c759',
  },
  offline: {
    backgroundColor: '#999',
  },
  userName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
    marginBottom: 16,
  },
  languageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  languageLabel: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  languageValue: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '600',
  },
  bioContainer: {
    marginTop: 16,
    width: '100%',
    paddingHorizontal: 20,
  },
  bioLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  bioText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 6,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  chatButton: {
    flexDirection: 'row',
    backgroundColor: '#007aff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  chatButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
