import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, StyleSheet } from 'react-native';
import {
  ConnectionsScreen,
  ChatScreen,
  ProfileScreen,
  PartnersScreen,
  FeedScreen,
  UserProfileScreen,
} from '../screens';
import type { MainTabParamList, MessagesStackParamList, PartnersStackParamList } from '../types';

const Tab = createBottomTabNavigator<MainTabParamList>();
const MessagesStack = createNativeStackNavigator<MessagesStackParamList>();
const PartnersStack = createNativeStackNavigator<PartnersStackParamList>();

function MessagesNavigator() {
  return (
    <MessagesStack.Navigator>
      <MessagesStack.Screen
        name="ConversationList"
        component={ConnectionsScreen}
        options={{ headerShown: false }}
      />
      <MessagesStack.Screen
        name="Chat"
        component={ChatScreen}
        options={({ route }) => ({
          headerShown: false,
          title: route.params.userName,
        })}
      />
    </MessagesStack.Navigator>
  );
}

function PartnersNavigator() {
  return (
    <PartnersStack.Navigator>
      <PartnersStack.Screen
        name="PartnersList"
        component={PartnersScreen}
        options={{ headerShown: false }}
      />
      <PartnersStack.Screen
        name="UserProfile"
        component={UserProfileScreen}
        options={{ headerShown: false }}
      />
    </PartnersStack.Navigator>
  );
}

// Simple tab icons using text/emoji
function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Feed: '📰',
    Partners: '🌍',
    Messages: '💬',
    Profile: '👤',
  };

  return (
    <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      {icons[label]}
    </Text>
  );
}

export function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: '#007aff',
        tabBarInactiveTintColor: '#999',
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel,
      })}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{ title: 'Feed' }}
      />
      <Tab.Screen
        name="Partners"
        component={PartnersNavigator}
        options={{ title: 'Partners' }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesNavigator}
        options={{ title: 'Messages' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopColor: '#e0e0e0',
    height: 85,
    paddingTop: 8,
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
});
