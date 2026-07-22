import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage with fallback to local storage
 * @param file - The file to upload
 * @param folderPath - The storage folder to use (e.g., 'alerts', 'documents')
 * @returns Object containing success status, image URL, and filename
 */
export const uploadFileWithFallback = async (
  file: File,
  folderPath: string = 'uploads'
): Promise<{ success: boolean; imageUrl: string; filename: string; error?: string }> {
  if (!file) {
    return {
      success: false,
      imageUrl: '',
      filename: '',
      error: 'No file provided'
    };
  }

  console.log(`📤 Uploading ${file.name} (${file.size} bytes) to ${folderPath}`);

  // Create form data for upload
  const formData = new FormData();
  formData.append('file', file);

  // Try Firebase Storage upload first
  try {
    console.log('🔄 Attempting Firebase Storage upload...');
    const response = await fetch(`/api/alerts/upload-image`, {
      method: 'POST',
      body: formData
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error || `Firebase upload failed with status: ${response.status}`);
    }

    console.log('✅ Firebase Storage upload successful');
    return {
      success: true,
      imageUrl: responseData.imageUrl,
      filename: responseData.filename
    };
  } catch (firebaseError: any) {
    console.error('❌ Firebase Storage upload failed:', firebaseError);

    // Fall back to local storage
    console.log('🔄 Falling back to local storage upload...');
    try {
      const localResponse = await fetch(`/api/alerts/upload-local`, {
        method: 'POST',
        body: formData
      });

      const localResponseData = await localResponse.json();

      if (!localResponse.ok) {
        throw new Error(
          localResponseData.error || `Local upload failed with status: ${localResponse.status}`
        );
      }

      console.log('✅ Local storage upload successful');
      return {
        success: true,
        imageUrl: localResponseData.imageUrl,
        filename: localResponseData.filename
      };
    } catch (localError: any) {
      console.error('❌ All upload methods failed:', localError);
      return {
        success: false,
        imageUrl: '',
        filename: '',
        error: 'All image upload methods failed'
      };
    }
  }
};