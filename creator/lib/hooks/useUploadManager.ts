import { useFileUpload } from './useFileUpload';
import { usePhotoUpload } from './usePhotoUpload';
import { useVideoUpload } from './useVideoUpload';

interface UseUploadManagerProps {
  channel: any;
  user: any;
  userCurrency: string;
}

/**
 * Combined upload manager hook that provides all upload functionality
 * 
 * Features:
 * - Manages photo, file, and video uploads
 * - Provides unified interface for all upload types
 * - Centralizes upload state management
 * - Simplifies component integration
 */
export const useUploadManager = (props: UseUploadManagerProps) => {
  const photoUpload = usePhotoUpload(props);
  const fileUpload = useFileUpload(props);
  const videoUpload = useVideoUpload(props);

  // Combined state for checking if any upload is in progress
  const isAnyUploading = photoUpload.isUploading || fileUpload.isUploading || videoUpload.isUploading;
  const isAnyModalVisible = photoUpload.showPriceModal || fileUpload.showPriceModal || videoUpload.showPriceModal;

  // Reset all upload states
  const resetAllStates = (): void => {
    photoUpload.resetState();
    fileUpload.resetState();
    videoUpload.resetState();
  };

  return {
    // Photo upload
    photo: photoUpload,
    
    // File upload
    file: fileUpload,
    
    // Video upload
    video: videoUpload,
    
    // Combined state
    isAnyUploading,
    isAnyModalVisible,
    
    // Combined actions
    resetAllStates,
  };
};