import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { api } from '../services/api';
import { useAuthStore } from '../stores/auth';
import type { Post } from '../types';

dayjs.extend(relativeTime);

export function FeedScreen() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');

  const { data: posts, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['feed'],
    queryFn: () => api.getFeed(),
  });

  const createPostMutation = useMutation({
    mutationFn: (content: string) => api.createPost(content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
      setShowCreateModal(false);
      setNewPostContent('');
    },
    onError: () => {
      Alert.alert('Error', 'Failed to create post');
    },
  });

  const likeMutation = useMutation({
    mutationFn: (postId: number) => api.likePost(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feed'] });
    },
  });

  const handleCreatePost = useCallback(() => {
    if (!newPostContent.trim()) return;
    createPostMutation.mutate(newPostContent.trim());
  }, [newPostContent, createPostMutation]);

  const handleLike = useCallback((postId: number) => {
    likeMutation.mutate(postId);
  }, [likeMutation]);

  const renderPost = useCallback(({ item }: { item: Post }) => {
    return (
      <View style={styles.postCard}>
        <View style={styles.postHeader}>
          <View style={styles.authorInfo}>
            {item.author.avatar_url ? (
              <Image source={{ uri: item.author.avatar_url }} style={styles.authorAvatar} />
            ) : (
              <View style={styles.authorAvatarPlaceholder}>
                <Text style={styles.authorAvatarText}>
                  {item.author.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.authorName}>{item.author.name}</Text>
              <Text style={styles.postTime}>{dayjs(item.created_at).fromNow()}</Text>
            </View>
          </View>
          {item.language && (
            <View style={styles.languageBadge}>
              <Text style={styles.languageText}>{item.language}</Text>
            </View>
          )}
        </View>

        <Text style={styles.postContent}>{item.content}</Text>

        {item.image_url && (
          <Image source={{ uri: item.image_url }} style={styles.postImage} />
        )}

        <View style={styles.postActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleLike(item.id)}
          >
            <Text style={[styles.actionIcon, item.is_liked && styles.liked]}>
              {item.is_liked ? '♥' : '♡'}
            </Text>
            <Text style={[styles.actionText, item.is_liked && styles.liked]}>
              {item.likes_count}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>{item.comments_count}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }, [handleLike]);

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
        <Text style={styles.headerTitle}>Feed</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateModal(true)}
        >
          <Text style={styles.createButtonText}>+ Post</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={posts || []}
        renderItem={renderPost}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to share something!</Text>
          </View>
        }
      />

      {/* Create Post Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>New Post</Text>
              <TouchableOpacity
                onPress={handleCreatePost}
                disabled={!newPostContent.trim() || createPostMutation.isPending}
              >
                <Text
                  style={[
                    styles.postButtonText,
                    (!newPostContent.trim() || createPostMutation.isPending) &&
                      styles.postButtonDisabled,
                  ]}
                >
                  {createPostMutation.isPending ? 'Posting...' : 'Post'}
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.postInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              value={newPostContent}
              onChangeText={setNewPostContent}
              multiline
              maxLength={2000}
              autoFocus
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111',
  },
  createButton: {
    backgroundColor: '#007aff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  authorAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  authorAvatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
  },
  postTime: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
  },
  languageBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  languageText: {
    fontSize: 12,
    color: '#007aff',
    fontWeight: '500',
  },
  postContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginTop: 12,
  },
  postActions: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 6,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  liked: {
    color: '#ff3b30',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
    marginTop: 60,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
  postButtonText: {
    fontSize: 16,
    color: '#007aff',
    fontWeight: '600',
  },
  postButtonDisabled: {
    color: '#ccc',
  },
  postInput: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
