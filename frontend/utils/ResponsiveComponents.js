// Common responsive components and utilities
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, responsive } from './ThemeContext';

// Responsive Text Component
export const ResponsiveText = ({ 
  children, 
  size = 'base', 
  weight = 'normal', 
  color, 
  align = 'left',
  style,
  numberOfLines,
  ...props 
}) => {
  const { theme } = useTheme();
  
  const fontSize = responsive.fontSize[size] || responsive.fontSize.base;
  const textColor = color || theme.text;
  
  const fontWeights = {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  };

  return (
    <Text
      style={[
        {
          fontSize,
          fontWeight: fontWeights[weight],
          color: textColor,
          textAlign: align,
        },
        style
      ]}
      numberOfLines={numberOfLines}
      {...props}
    >
      {children}
    </Text>
  );
};

// Responsive Button Component
export const ResponsiveButton = ({
  children,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  leftIcon,
  rightIcon,
  style,
  textStyle,
  ...props
}) => {
  const { theme } = useTheme();

  const variants = {
    primary: {
      backgroundColor: disabled ? theme.textMuted : theme.buttonPrimary,
      borderColor: disabled ? theme.textMuted : theme.buttonPrimary,
      textColor: theme.buttonText,
      shadow: true,
    },
    secondary: {
      backgroundColor: theme.buttonSecondary,
      borderColor: theme.border,
      textColor: theme.buttonTextSecondary,
      shadow: false,
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: theme.primary,
      textColor: theme.primary,
      shadow: false,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: theme.primary,
      shadow: false,
    },
    danger: {
      backgroundColor: disabled ? theme.textMuted : theme.error,
      borderColor: disabled ? theme.textMuted : theme.error,
      textColor: theme.textInverse,
      shadow: true,
    },
    success: {
      backgroundColor: disabled ? theme.textMuted : theme.success,
      borderColor: disabled ? theme.textMuted : theme.success,
      textColor: theme.textInverse,
      shadow: true,
    },
  };

  const sizes = {
    small: {
      paddingHorizontal: responsive.spacing.sm,
      paddingVertical: responsive.spacing.xs,
      minHeight: responsive.touchTarget.minimum - 8,
      fontSize: responsive.fontSize.sm,
      borderRadius: 8,
    },
    medium: {
      paddingHorizontal: responsive.spacing.base,
      paddingVertical: responsive.spacing.sm,
      minHeight: responsive.touchTarget.comfortable,
      fontSize: responsive.fontSize.base,
      borderRadius: 12,
    },
    large: {
      paddingHorizontal: responsive.spacing.lg,
      paddingVertical: responsive.spacing.base,
      minHeight: responsive.touchTarget.large,
      fontSize: responsive.fontSize.lg,
      borderRadius: 16,
    },
  };

  const variantStyle = variants[variant];
  const sizeStyle = sizes[size];

  return (
    <TouchableOpacity
      onPress={disabled || loading ? undefined : onPress}
      disabled={disabled || loading}
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: sizeStyle.borderRadius,
          borderWidth: variantStyle.borderColor === 'transparent' ? 0 : 1,
          backgroundColor: variantStyle.backgroundColor,
          borderColor: variantStyle.borderColor,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
          minHeight: sizeStyle.minHeight,
          opacity: disabled ? 0.6 : 1,
        },
        variantStyle.shadow && Platform.OS === 'ios' ? {
          shadowColor: theme.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        } : variantStyle.shadow ? {
          elevation: 2,
        } : {},
        style
      ]}
      {...props}
    >
      {leftIcon && (
        <Ionicons 
          name={leftIcon} 
          size={sizeStyle.fontSize} 
          color={variantStyle.textColor} 
          style={{ marginRight: responsive.spacing.xs }}
        />
      )}
      
      <ResponsiveText
        size={size === 'small' ? 'sm' : size === 'large' ? 'lg' : 'base'}
        weight="semibold"
        color={variantStyle.textColor}
        style={textStyle}
      >
        {children}
      </ResponsiveText>
      
      {rightIcon && (
        <Ionicons 
          name={rightIcon} 
          size={sizeStyle.fontSize} 
          color={variantStyle.textColor} 
          style={{ marginLeft: responsive.spacing.xs }}
        />
      )}
    </TouchableOpacity>
  );
};

// Responsive Card Component
export const ResponsiveCard = ({ 
  children, 
  style, 
  padding = 'base',
  shadow = true,
  variant = 'default',
  ...props 
}) => {
  const { theme } = useTheme();
  
  const paddingValue = responsive.spacing[padding] || responsive.spacing.base;

  const variants = {
    default: {
      backgroundColor: theme.cardBackground,
      borderColor: theme.cardBorder,
    },
    elevated: {
      backgroundColor: theme.cardBackground,
      borderColor: 'transparent',
    },
    outlined: {
      backgroundColor: 'transparent',
      borderColor: theme.cardBorder,
    },
    filled: {
      backgroundColor: theme.backgroundSecondary,
      borderColor: 'transparent',
    },
  };

  const variantStyle = variants[variant] || variants.default;

  return (
    <View
      style={[
        {
          backgroundColor: variantStyle.backgroundColor,
          borderRadius: 16,
          padding: paddingValue,
          borderWidth: variantStyle.borderColor === 'transparent' ? 0 : 1,
          borderColor: variantStyle.borderColor,
        },
        shadow && variant !== 'outlined' && Platform.OS === 'ios' ? {
          shadowColor: theme.cardShadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
        } : shadow && variant !== 'outlined' ? {
          elevation: 4,
        } : {},
        style
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

// Responsive Header Component
export const ResponsiveHeader = ({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  onLeftPress,
  onRightPress,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: responsive.spacing.base,
          paddingVertical: responsive.spacing.sm,
          backgroundColor: theme.surface,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          minHeight: responsive.touchTarget.large,
          paddingTop: Math.max(responsive.spacing.sm, theme.safeArea?.top || 0),
        },
        style
      ]}
      {...props}
    >
      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
        {leftIcon && (
          <TouchableOpacity
            onPress={onLeftPress}
            style={{
              padding: responsive.spacing.xs,
              marginRight: responsive.spacing.sm,
              minWidth: responsive.touchTarget.minimum,
              minHeight: responsive.touchTarget.minimum,
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Ionicons name={leftIcon} size={24} color={theme.text} />
          </TouchableOpacity>
        )}
        
        <View style={{ flex: 1 }}>
          <ResponsiveText size="lg" weight="semibold">
            {title}
          </ResponsiveText>
          {subtitle && (
            <ResponsiveText size="sm" color={theme.textSecondary}>
              {subtitle}
            </ResponsiveText>
          )}
        </View>
      </View>

      {rightIcon && (
        <TouchableOpacity
          onPress={onRightPress}
          style={{
            padding: responsive.spacing.xs,
            minWidth: responsive.touchTarget.minimum,
            minHeight: responsive.touchTarget.minimum,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name={rightIcon} size={24} color={theme.text} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Responsive Input Component
export const ResponsiveInput = ({
  label,
  placeholder,
  value,
  onChangeText,
  multiline = false,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  ...props
}) => {
  const { theme } = useTheme();

  return (
    <View style={style}>
      {label && (
        <ResponsiveText 
          size="sm" 
          weight="medium" 
          color={theme.textSecondary}
          style={{ marginBottom: responsive.spacing.xs }}
        >
          {label}
        </ResponsiveText>
      )}
      
      <View
        style={{
          flexDirection: 'row',
          alignItems: multiline ? 'flex-start' : 'center',
          backgroundColor: theme.inputBackground,
          borderWidth: 1,
          borderColor: error ? theme.error : theme.inputBorder,
          borderRadius: 12,
          paddingHorizontal: responsive.spacing.sm,
          paddingVertical: responsive.spacing.sm,
          minHeight: multiline ? responsive.touchTarget.large * 2 : responsive.touchTarget.comfortable,
        }}
      >
        {leftIcon && (
          <Ionicons 
            name={leftIcon} 
            size={20} 
            color={theme.textTertiary} 
            style={{ marginRight: responsive.spacing.sm }}
          />
        )}
        
        <TextInput
          style={{
            flex: 1,
            fontSize: responsive.fontSize.base,
            color: theme.inputText,
            textAlignVertical: multiline ? 'top' : 'center',
          }}
          placeholder={placeholder}
          placeholderTextColor={theme.inputPlaceholder}
          value={value}
          onChangeText={onChangeText}
          multiline={multiline}
          {...props}
        />
        
        {rightIcon && (
          <TouchableOpacity 
            onPress={onRightIconPress}
            style={{
              padding: responsive.spacing.xs,
              marginLeft: responsive.spacing.sm,
            }}
          >
            <Ionicons name={rightIcon} size={20} color={theme.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      
      {error && (
        <ResponsiveText 
          size="sm" 
          color={theme.error}
          style={{ marginTop: responsive.spacing.xs }}
        >
          {error}
        </ResponsiveText>
      )}
    </View>
  );
};

// Responsive Grid Component
export const ResponsiveGrid = ({ 
  children, 
  columns = 2, 
  spacing = 'sm',
  style,
  ...props 
}) => {
  const spacingValue = responsive.spacing[spacing] || responsive.spacing.sm;
  
  // Adjust columns based on screen size
  const responsiveColumns = responsive.screen.isSmall ? 
    Math.min(columns, 2) : columns;

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginHorizontal: -spacingValue / 2,
        },
        style
      ]}
      {...props}
    >
      {React.Children.map(children, (child, index) => (
        <View
          key={index}
          style={{
            width: `${100 / responsiveColumns}%`,
            paddingHorizontal: spacingValue / 2,
            marginBottom: spacingValue,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
};

// Responsive Spacing Component
export const ResponsiveSpacing = ({ size = 'base', horizontal = false }) => {
  const spacingValue = responsive.spacing[size] || responsive.spacing.base;
  
  return (
    <View 
      style={{
        width: horizontal ? spacingValue : '100%',
        height: horizontal ? '100%' : spacingValue,
      }} 
    />
  );
};

// Screen-size dependent component wrapper
export const ResponsiveWrapper = ({ 
  mobile, 
  tablet, 
  desktop, 
  children,
  fallback 
}) => {
  const deviceType = responsive.screen.isSmall ? 'mobile' : 
                    responsive.screen.width < 1024 ? 'tablet' : 'desktop';
  
  if (deviceType === 'mobile' && mobile) return mobile;
  if (deviceType === 'tablet' && tablet) return tablet;
  if (deviceType === 'desktop' && desktop) return desktop;
  
  return fallback || children || null;
};
