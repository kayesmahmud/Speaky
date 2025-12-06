import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '../stores/auth';
import { api } from '../services/api';

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Hindi',
];

export function ProfileScreen() {
  const { user, logout, updateUser } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(user?.name || '');
  const [editedBio, setEditedBio] = useState(user?.bio || '');
  const [editedNativeLanguage, setEditedNativeLanguage] = useState(user?.native_language || '');
  const [editedLearningLanguage, setEditedLearningLanguage] = useState(user?.learning_language || '');

  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; bio?: string; native_language?: string; learning_language?: string }) =>
      api.updateProfile(data),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    },
    onError: (error: Error) => {
      Alert.alert('Error', error.message);
    },
  });

  const handleSave = () => {
    updateMutation.mutate({
      name: editedName,
      bio: editedBio,
      native_language: editedNativeLanguage,
      learning_language: editedLearningLanguage,
    });
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  const handleCancel = () => {
    setEditedName(user?.name || '');
    setEditedBio(user?.bio || '');
    setEditedNativeLanguage(user?.native_language || '');
    setEditedLearningLanguage(user?.learning_language || '');
    setIsEditing(false);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{
            uri: user?.avatar_url ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=007aff&color=fff&size=200`
          }}
          style={styles.avatar}
        />
        {!isEditing ? (
          <>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </>
        ) : (
          <TextInput
            style={styles.nameInput}
            value={editedName}
            onChangeText={setEditedName}
            placeholder="Your name"
            placeholderTextColor="#999"
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Languages</Text>

        <View style={styles.languageRow}>
          <Text style={styles.languageLabel}>Native Language</Text>
          {isEditing ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.languageChips}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.languageChip,
                      editedNativeLanguage === lang && styles.languageChipSelected,
                    ]}
                    onPress={() => setEditedNativeLanguage(lang)}
                  >
                    <Text
                      style={[
                        styles.languageChipText,
                        editedNativeLanguage === lang && styles.languageChipTextSelected,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.languageValue}>{user?.native_language || 'Not set'}</Text>
          )}
        </View>

        <View style={styles.languageRow}>
          <Text style={styles.languageLabel}>Learning</Text>
          {isEditing ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.languageChips}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[
                      styles.languageChip,
                      editedLearningLanguage === lang && styles.languageChipSelected,
                    ]}
                    onPress={() => setEditedLearningLanguage(lang)}
                  >
                    <Text
                      style={[
                        styles.languageChipText,
                        editedLearningLanguage === lang && styles.languageChipTextSelected,
                      ]}
                    >
                      {lang}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          ) : (
            <Text style={styles.languageValue}>{user?.learning_language || 'Not set'}</Text>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        {isEditing ? (
          <TextInput
            style={styles.bioInput}
            value={editedBio}
            onChangeText={setEditedBio}
            placeholder="Tell others about yourself..."
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
        ) : (
          <Text style={styles.bioText}>{user?.bio || 'No bio yet'}</Text>
        )}
      </View>

      <View style={styles.actions}>
        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={handleCancel}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setIsEditing(true)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  header: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  nameInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#007aff',
    paddingBottom: 4,
    minWidth: 200,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  languageRow: {
    marginBottom: 16,
  },
  languageLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  languageValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111',
  },
  languageChips: {
    flexDirection: 'row',
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  languageChipSelected: {
    backgroundColor: '#007aff',
  },
  languageChipText: {
    fontSize: 13,
    color: '#333',
  },
  languageChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  bioInput: {
    fontSize: 15,
    color: '#111',
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
  },
  bioText: {
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  actions: {
    padding: 24,
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#007aff',
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#34c759',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: '#f0f0f0',
  },
  logoutButtonText: {
    color: '#ff3b30',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
  },
});
