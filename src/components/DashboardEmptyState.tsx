import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../assets/theme/ThemeContext';

interface Props {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  accentColor?: string;
}

export default function DashboardEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  accentColor,
}: Props) {
  const { theme } = useTheme();
  const color = accentColor ?? theme.primary;
  const styles = createStyles(theme, color);

  return (
    <View style={styles.card}>
      <View style={styles.illustration}>
        <View style={styles.decorativeDot} />
        <Ionicons name={icon} size={34} color={color} />
        <View style={styles.decorativeLine} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <TouchableOpacity
        accessibilityRole="button"
        onPress={onAction}
        style={styles.action}
      >
        <Text style={styles.actionText}>{actionLabel}</Text>
        <Ionicons name="arrow-forward" size={16} color={color} />
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme'], color: string) => StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: theme.card,
    borderColor: theme.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  illustration: {
    alignItems: 'center',
    backgroundColor: `${color}15`,
    borderRadius: 24,
    height: 76,
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
    width: 88,
  },
  decorativeDot: {
    backgroundColor: color,
    borderRadius: 4,
    height: 8,
    opacity: 0.55,
    position: 'absolute',
    right: 12,
    top: 12,
    width: 8,
  },
  decorativeLine: {
    backgroundColor: color,
    borderRadius: 2,
    bottom: 13,
    height: 3,
    left: 14,
    opacity: 0.35,
    position: 'absolute',
    width: 18,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 290,
    textAlign: 'center',
  },
  action: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    paddingVertical: 4,
  },
  actionText: {
    color,
    fontSize: 14,
    fontWeight: '700',
  },
});
