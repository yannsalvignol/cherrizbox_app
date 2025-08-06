import { StyleSheet } from 'react-native';
import { brandColors, typography } from './chat-theme';

/**
 * Common styles for chat attachments and components
 * These styles are used across various attachment components
 */
export const attachmentStyles = StyleSheet.create({
  container: {
    marginVertical: 8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: brandColors.background.secondary,
  },
  image: {
    width: 250,
    height: 200,
  },
  blurOverlay: {
    position: 'relative',
  },
  overlayContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: brandColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockText: {
    fontSize: typography.fontSize.xxxl,
    color: brandColors.text.primary,
  },
  priceText: {
    fontSize: typography.fontSize.xxxl,
    fontWeight: 'bold',
    color: brandColors.primary,
    marginBottom: 8,
    fontFamily: typography.fontFamily.bold,
  },
  titleText: {
    fontSize: typography.fontSize.lg,
    color: brandColors.text.primary,
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: typography.fontFamily.regular,
  },
  unlockButton: {
    backgroundColor: brandColors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  unlockButtonText: {
    color: brandColors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    fontFamily: typography.fontFamily.bold,
  },
});

/**
 * Common chat component styles
 */
export const chatStyles = StyleSheet.create({
  // Message container styles
  messageContainer: {
    marginVertical: 4,
    marginHorizontal: 8,
  },
  
  // Timestamp styles
  timestamp: {
    fontSize: typography.fontSize.xs,
    color: brandColors.text.muted,
    textAlign: 'center',
    marginVertical: 4,
    fontFamily: typography.fontFamily.regular,
  },
  
  // Loading indicator styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.background.primary,
  },
  
  loadingText: {
    color: brandColors.text.secondary,
    marginTop: 16,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.regular,
  },
  
  // Error state styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: brandColors.background.primary,
    padding: 20,
  },
  
  errorText: {
    color: brandColors.accent.error,
    fontSize: typography.fontSize.lg,
    textAlign: 'center',
    fontFamily: typography.fontFamily.medium,
    marginBottom: 16,
  },
  
  retryButton: {
    backgroundColor: brandColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  
  retryButtonText: {
    color: brandColors.text.primary,
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    fontFamily: typography.fontFamily.bold,
  },
});

/**
 * Modal styles for chat components
 */
export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  container: {
    backgroundColor: brandColors.background.secondary,
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: brandColors.text.primary,
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: typography.fontFamily.bold,
  },
  
  subtitle: {
    fontSize: typography.fontSize.md,
    color: brandColors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: typography.fontFamily.regular,
  },
  
  input: {
    backgroundColor: brandColors.background.tertiary,
    borderRadius: 8,
    padding: 12,
    color: brandColors.text.primary,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.regular,
    marginBottom: 16,
  },
  
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  
  primaryButton: {
    backgroundColor: brandColors.primary,
  },
  
  secondaryButton: {
    backgroundColor: brandColors.background.tertiary,
    borderWidth: 1,
    borderColor: brandColors.text.muted,
  },
  
  buttonText: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    fontFamily: typography.fontFamily.bold,
  },
  
  primaryButtonText: {
    color: brandColors.text.primary,
  },
  
  secondaryButtonText: {
    color: brandColors.text.secondary,
  },
});

/**
 * Price input modal styles
 */
export const priceModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 120,
    padding: 20,
  },
  container: {
    backgroundColor: brandColors.background.secondary,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 100,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: brandColors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
  },
  title: {
    color: brandColors.text.primary,
    fontSize: typography.fontSize.xxl + 2,
    fontWeight: 'bold',
    fontFamily: typography.fontFamily.bold,
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  imagePreview: {
    width: 120,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: brandColors.primary,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    color: brandColors.text.secondary,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: brandColors.background.primary,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: brandColors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    width: '100%',
  },
  currencySymbol: {
    color: brandColors.primary,
    fontSize: typography.fontSize.xxxl,
    fontWeight: 'bold',
    fontFamily: typography.fontFamily.bold,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    color: brandColors.text.primary,
    fontSize: typography.fontSize.xxxl,
    fontWeight: 'bold',
    fontFamily: typography.fontFamily.bold,
    textAlign: 'left',
  },
  errorText: {
    color: brandColors.accent.error,
    fontSize: typography.fontSize.md,
    fontFamily: typography.fontFamily.medium,
    marginBottom: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: brandColors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    fontFamily: typography.fontFamily.semiBold,
  },
  submitButton: {
    flex: 1,
    backgroundColor: brandColors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonText: {
    color: brandColors.text.primary,
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    fontFamily: typography.fontFamily.bold,
  },
});

/**
 * Upload progress modal styles
 */
export const uploadModalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: brandColors.background.secondary,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
    minWidth: 280,
  },
  spinner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 4,
    borderColor: 'rgba(251, 35, 85, 0.3)',
    borderTopColor: brandColors.primary,
    marginBottom: 24,
  },
  spinnerInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(251, 35, 85, 0.1)',
  },
  title: {
    color: brandColors.text.primary,
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    fontFamily: typography.fontFamily.bold,
    marginBottom: 8,
    textAlign: 'center',
  },
  progress: {
    color: brandColors.text.secondary,
    fontSize: typography.fontSize.lg,
    fontFamily: typography.fontFamily.medium,
    textAlign: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: 200,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: brandColors.primary,
  },
});