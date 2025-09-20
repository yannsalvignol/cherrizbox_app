import { useState } from 'react';
import { handlePaidVideoCreation, sendPaidVideo } from '../chat-functions';

interface UseVideoUploadProps {
  channel: any;
  user: any;
  userCurrency: string;
}

interface VideoUploadState {
  selectedVideoUri: string | null;
  showPriceModal: boolean;
  showUploadModal: boolean;
  uploadProgress: string;
  isUploading: boolean;
}

interface VideoUploadActions {
  handleVideoCreation: () => Promise<void>;
  handleVideoSubmit: (price: number, title: string) => Promise<void>;
  closePriceModal: () => void;
  resetState: () => void;
}

/**
 * Custom hook for handling video upload workflow
 * 
 * Features:
 * - Video selection and creation
 * - Price modal management
 * - Upload progress tracking
 * - State management for video uploads
 */
export const useVideoUpload = ({ 
  channel, 
  user, 
  userCurrency 
}: UseVideoUploadProps): VideoUploadState & VideoUploadActions => {
  const [selectedVideoUri, setSelectedVideoUri] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleVideoCreationWrapper = async (): Promise<void> => {
    try {
      const videoUri = await handlePaidVideoCreation();
      if (videoUri) {
        setSelectedVideoUri(videoUri);
        setShowPriceModal(true);
      }
    } catch (error) {
      console.error('Error in video creation:', error);
    }
  };

  const handleVideoSubmit = async (price: number, title: string): Promise<void> => {
    if (selectedVideoUri) {
      await sendPaidVideo(
        selectedVideoUri, 
        price, 
        title, 
        channel, 
        user, 
        userCurrency, 
        setUploadProgress, 
        setShowUploadModal, 
        setIsUploading
      );
      // Reset state after successful upload
      setSelectedVideoUri(null);
      setShowPriceModal(false);
    }
  };

  const closePriceModal = (): void => {
    setShowPriceModal(false);
    setSelectedVideoUri(null);
  };

  const resetState = (): void => {
    setSelectedVideoUri(null);
    setShowPriceModal(false);
    setShowUploadModal(false);
    setUploadProgress('');
    setIsUploading(false);
  };

  return {
    // State
    selectedVideoUri,
    showPriceModal,
    showUploadModal,
    uploadProgress,
    isUploading,
    
    // Actions
    handleVideoCreation: handleVideoCreationWrapper,
    handleVideoSubmit,
    closePriceModal,
    resetState,
  };
};