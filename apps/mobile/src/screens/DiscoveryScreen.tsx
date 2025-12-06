import React, { useState, useCallback } from 'react';
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
  ScrollView,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import type { DiscoveryUser } from '../types';

const LANGUAGES = ['All', 'English', 'Spanish', 'French', 'German', 'Chinese', 'Japanese'];

export function DiscoveryScreen() {
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const queryClient = useQueryClient();

  const { data: users, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['discovery', selectedLanguage],
    queryFn: () => api.getDiscoveryFeed(
      selectedLanguage !== 'All' ? { language: selectedLanguage } : undefined
    ),
  });

  const connectMutation = useMutation({
    mutationFn: (userId: number) => api.sendConnectionRequest(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discovery'] });
      queryClient.invalidateQueries({ queryKey: ['connections'] });
      Alert.alert('Success', 'Connection request sent!');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleConnect = useCallback((userId: number) => {
    connectMutation.mutate(userId);
  }, [connectMutation]);

  const renderUserCard = useCallback(({ item }: { item: DiscoveryUser }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Image
          source={{ uri: item.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.name)}&background=007aff&color=fff` }}
          style={styles.avatar}
        />
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userLanguages}>
            Speaks: {item.native_language || 'Not set'}
          </Text>
          <Text style={styles.userLanguages}>
            Learning: {item.learning_language || 'Not set'}
          </Text>
        </View>
      </View>
      {item.bio && <Text style={styles.bio} numberOfLines={2}>{item.bio}</Text>}
      <TouchableOpacity
        style={styles.connectButton}
        onPress={() => handleConnect(item.id)}
        disabled={connectMutation.isPending}
      >
        {connectMutation.isPending ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.connectButtonText}>Connect</Text>
        )}
      </TouchableOpacity>
    </View>
  ), [handleConnect, connectMutation.isPending]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Partners</Text>
        <Text style={styles.subtitle}>Find language exchange partners</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {LANGUAGES.map((item) => (
            <TouchableOpacity
              key={item}
              style={[
                styles.filterChip,
                selectedLanguage === item && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedLanguage(item)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedLanguage === item && styles.filterChipTextSelected,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007aff" />
        </View>
      ) : (
        <FlatList
          data={users || []}
          renderItem={renderUserCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No users found</Text>
              <Text style={styles.emptySubtext}>Try a different filter</Text>
            </View>
          }
        />
      )}
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
  filterContainer: {
    height: 56,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterScroll: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8,
    alignSelf: 'center',
  },
  filterChipSelected: {
    backgroundColor: '#007aff',
  },
  filterChipText: {
    fontSize: 14,
    color: '#333',
  },
  filterChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111',
  },
  userLanguages: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    color: '#444',
    marginTop: 12,
    lineHeight: 20,
  },
  connectButton: {
    backgroundColor: '#007aff',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  connectButtonText: {
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
