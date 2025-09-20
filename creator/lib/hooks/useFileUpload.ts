import { useState } from 'react';
import { handleFileCreation, sendBlurryFile } from '../chat-functions';

interface UseFileUploadProps {
  channel: any;
  user: any;
  userCurrency: string;
}

interface FileUploadState {
  selectedFileUri: string | null;
  showPriceModal: boolean;
  showUploadModal: boolean;
  uploadProgress: string;
  isUploading: boolean;
}

interface FileUploadActions {
  handleFileCreation: () => Promise<void>;
  handleFileSubmit: (fileUri: string, price: number, title: string) => Promise<void>;
  closePriceModal: () => void;
  resetState: () => void;
}

/**
 * Custom hook for handling file upload workflow
 * 
 * Features:
 * - File selection and creation
 * - Price modal management
 * - Upload progress tracking
 * - State management for file uploads
 */
export const useFileUpload = ({ 
  channel, 
  user, 
  userCurrency 
}: UseFileUploadProps): FileUploadState & FileUploadActions => {
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileCreationWrapper = async (): Promise<void> => {
    try {
      const fileResult = await handleFileCreation();
      if (fileResult) {
        setSelectedFileUri(fileResult.uri);
        setShowPriceModal(true);
      }
    } catch (error) {
      console.error('Error in file creation:', error);
    }
  };

  const handleFileSubmit = async (fileUri: string, price: number, title: string): Promise<void> => {
    await sendBlurryFile(
      fileUri, 
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
    setSelectedFileUri(null);
    setShowPriceModal(false);
  };

  const closePriceModal = (): void => {
    setShowPriceModal(false);
    setSelectedFileUri(null);
  };

  const resetState = (): void => {
    setSelectedFileUri(null);
    setShowPriceModal(false);
    setShowUploadModal(false);
    setUploadProgress('');
    setIsUploading(false);
  };

  return {
    // State
    selectedFileUri,
    showPriceModal,
    showUploadModal,
    uploadProgress,
    isUploading,
    
    // Actions
    handleFileCreation: handleFileCreationWrapper,
    handleFileSubmit,
    closePriceModal,
    resetState,
  };
};