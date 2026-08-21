import { TextStyle } from 'react-native';
import { TOKENS } from '../constants/tokens';

export const typography: Record<string, TextStyle> = {
  display: {
    fontFamily: TOKENS.typography.families.arabic,
    fontSize: TOKENS.typography.sizes['2xl'],
    fontWeight: '900' as const,
    lineHeight: 40,
  },
  heading: {
    fontFamily: TOKENS.typography.families.arabic,
    fontSize: TOKENS.typography.sizes.xl,
    fontWeight: '800' as const,
    lineHeight: 32,
  },
  title: {
    fontFamily: TOKENS.typography.families.arabic,
    fontSize: TOKENS.typography.sizes.lg,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  subtitle: {
    fontFamily: TOKENS.typography.families.arabic,
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  body: {
    fontFamily: TOKENS.typography.families.arabic,
    fontSize: TOKENS.typography.sizes.base,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  caption: {
    fontFamily: TOKENS.typography.families.secondary,
    fontSize: TOKENS.typography.sizes.xs,
    fontWeight: '400' as const,
    lineHeight: 16,
  },
  button: {
    fontFamily: TOKENS.typography.families.arabic,
    fontSize: TOKENS.typography.sizes.base,
    fontWeight: '700' as const,
    lineHeight: 24,
  },
};
