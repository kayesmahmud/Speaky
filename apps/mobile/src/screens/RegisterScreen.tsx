import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList, RegisterRequest } from '../types';
import { useAuthStore } from '../stores/auth';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Register'>;
};

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese',
  'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian', 'Hindi',
];

export function RegisterScreen({ navigation }: Props) {
  const { register: registerUser, isLoading, error, clearError } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterRequest & { confirmPassword: string }>({
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      native_language: '',
      learning_language: '',
    },
  });

  const onSubmit = async (data: RegisterRequest & { confirmPassword: string }) => {
    if (data.password !== data.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      clearError();
      const { confirmPassword, ...registerData } = data;
      await registerUser(registerData);
    } catch {
      Alert.alert('Registration Failed', error || 'Please try again');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the language exchange community</Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              rules={{ required: 'Name is required' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Name</Text>
                  <TextInput
                    style={[styles.input, errors.name && styles.inputError]}
                    placeholder="Your name"
                    placeholderTextColor="#999"
                    autoCapitalize="words"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  {errors.name && (
                    <Text style={styles.errorText}>{errors.name.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="email"
              rules={{
                required: 'Email is required',
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: 'Invalid email address',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={[styles.input, errors.email && styles.inputError]}
                    placeholder="your@email.com"
                    placeholderTextColor="#999"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  {errors.email && (
                    <Text style={styles.errorText}>{errors.email.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Password is required',
                minLength: {
                  value: 8,
                  message: 'Password must be at least 8 characters',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                      placeholder="Min 8 characters"
                      placeholderTextColor="#999"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                    />
                    <TouchableOpacity
                      style={styles.showPasswordButton}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text style={styles.showPasswordText}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {errors.password && (
                    <Text style={styles.errorText}>{errors.password.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              rules={{ required: 'Please confirm your password' }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={[styles.input, errors.confirmPassword && styles.inputError]}
                    placeholder="Re-enter password"
                    placeholderTextColor="#999"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                  />
                  {errors.confirmPassword && (
                    <Text style={styles.errorText}>{errors.confirmPassword.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="native_language"
              rules={{ required: 'Native language is required' }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Native Language</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.languageContainer}>
                      {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                          key={lang}
                          style={[
                            styles.languageChip,
                            value === lang && styles.languageChipSelected,
                          ]}
                          onPress={() => onChange(lang)}
                        >
                          <Text
                            style={[
                              styles.languageChipText,
                              value === lang && styles.languageChipTextSelected,
                            ]}
                          >
                            {lang}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  {errors.native_language && (
                    <Text style={styles.errorText}>{errors.native_language.message}</Text>
                  )}
                </View>
              )}
            />

            <Controller
              control={control}
              name="learning_language"
              rules={{ required: 'Learning language is required' }}
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Language You Want to Learn</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.languageContainer}>
                      {LANGUAGES.map((lang) => (
                        <TouchableOpacity
                          key={lang}
                          style={[
                            styles.languageChip,
                            value === lang && styles.languageChipSelected,
                          ]}
                          onPress={() => onChange(lang)}
                        >
                          <Text
                            style={[
                              styles.languageChipText,
                              value === lang && styles.languageChipTextSelected,
                            ]}
                          >
                            {lang}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                  {errors.learning_language && (
                    <Text style={styles.errorText}>{errors.learning_language.message}</Text>
                  )}
                </View>
              )}
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleSubmit(onSubmit)}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f7',
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  form: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  showPasswordText: {
    color: '#007aff',
    fontWeight: '600',
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginTop: 4,
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  languageChipSelected: {
    backgroundColor: '#007aff',
    borderColor: '#007aff',
  },
  languageChipText: {
    fontSize: 14,
    color: '#333',
  },
  languageChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007aff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#666',
  },
  footerLink: {
    color: '#007aff',
    fontWeight: '600',
  },
});
