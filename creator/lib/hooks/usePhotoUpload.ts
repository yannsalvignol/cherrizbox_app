import { useState } from 'react';
import { handlePaidContentCreation, sendPaidContent } from '../chat-functions';

interface UsePhotoUploadProps {
  channel: any;
  user: any;
  userCurrency: string;
}

interface PhotoUploadState {
  selectedImageUri: string | null;
  showPriceModal: boolean;
  showUploadModal: boolean;
  uploadProgress: string;
  isUploading: boolean;
}

interface PhotoUploadActions {
  handlePhotoCreation: () => Promise<void>;
  handlePhotoSubmit: (price: number) => Promise<void>;
  closePriceModal: () => void;
  resetState: () => void;
}

/**
 * Custom hook for handling photo upload workflow
 * 
 * Features:
 * - Photo selection and creation
 * - Price modal management
 * - Upload progress tracking
 * - State management for photo uploads
 */
export const usePhotoUpload = ({ 
  channel, 
  user, 
  userCurrency 
}: UsePhotoUploadProps): PhotoUploadState & PhotoUploadActions => {
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handlePhotoCreation = async (): Promise<void> => {
    try {
      const imageUri = await handlePaidContentCreation();
      if (imageUri) {
        setSelectedImageUri(imageUri);
        setShowPriceModal(true);
      }
    } catch (error) {
      console.error('Error in photo creation:', error);
    }
  };

  const handlePhotoSubmit = async (price: number): Promise<void> => {
    if (selectedImageUri) {
      await sendPaidContent(
        selectedImageUri, 
        price, 
        channel, 
        user, 
        userCurrency, 
        setUploadProgress, 
        setShowUploadModal, 
        setIsUploading
      );
      // Reset state after successful upload
      setSelectedImageUri(null);
      setShowPriceModal(false);
    }
  };

  const closePriceModal = (): void => {
    setShowPriceModal(false);
    setSelectedImageUri(null);
  };

  const resetState = (): void => {
    setSelectedImageUri(null);
    setShowPriceModal(false);
    setShowUploadModal(false);
    setUploadProgress('');
    setIsUploading(false);
  };

  return {
    // State
    selectedImageUri,
    showPriceModal,
    showUploadModal,
    uploadProgress,
    isUploading,
    
    // Actions
    handlePhotoCreation,
    handlePhotoSubmit,
    closePriceModal,
    resetState,
  };
};