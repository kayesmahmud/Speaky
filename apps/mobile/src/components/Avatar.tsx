import React from 'react';
import { Image, StyleSheet, Text, View, ViewStyle, ImageStyle } from 'react-native';

type Props = {
  uri?: string | null;
  name?: string;
  size?: number;
  showStatus?: boolean;
  isOnline?: boolean;
  containerStyle?: ViewStyle;
  imageStyle?: ImageStyle;
};

export function Avatar({
  uri,
  name = 'User',
  size = 56,
  showStatus = false,
  isOnline = false,
  containerStyle,
  imageStyle,
}: Props) {
  const initials = name.charAt(0).toUpperCase();
  const statusSize = Math.max(10, Math.floor(size * 0.25));

  return (
    <View style={[{ width: size, height: size }, containerStyle]}>
      {uri ? (
        <Image source={{ uri }} style={[styles.image, { width: size, height: size, borderRadius: size / 2 }, imageStyle]} />
      ) : (
        <View style={[styles.placeholder, { width: size, height: size, borderRadius: size / 2 }]}>
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>{initials}</Text>
        </View>
      )}
      {showStatus && (
        <View
          style={[
            styles.status,
            {
              width: statusSize,
              height: statusSize,
              borderRadius: statusSize / 2,
              right: Math.max(2, Math.floor(size * 0.08)),
              bottom: Math.max(2, Math.floor(size * 0.08)),
              backgroundColor: isOnline ? '#34c759' : '#999',
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#e0e0e0',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007aff',
  },
  initials: {
    color: '#fff',
    fontWeight: '600',
  },
  status: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
  },
});
