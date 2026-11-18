import { Platform, type ViewStyle } from 'react-native';

type ShadowOffset = NonNullable<ViewStyle['shadowOffset']>;

const colorConOpacidad = (color: string, opacity: number): string => {
  const hex = color.match(/^#([\da-f]{6})$/i)?.[1];
  if (!hex) return color;

  const alpha = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `#${hex}${alpha}`;
};

export const platformShadow = (
  color: string,
  opacity: number,
  offset: ShadowOffset,
  radius: number,
  elevation: number,
): ViewStyle => Platform.select<ViewStyle>({
  web: {
    boxShadow: `${offset.width}px ${offset.height}px ${radius}px ${colorConOpacidad(color, opacity)}`,
  },
  default: {
    shadowColor: color,
    shadowOpacity: opacity,
    shadowOffset: offset,
    shadowRadius: radius,
    elevation,
  },
}) ?? {};
