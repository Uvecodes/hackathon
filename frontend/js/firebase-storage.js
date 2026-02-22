/**
 * THE MOTHER SUITE — Firebase Storage Utility
 * Handles file uploads to Firebase Storage.
 * Requires: firebase-app-compat.js, firebase-storage-compat.js
 */

const FirebaseStorage = {
  /**
   * Upload a file to Firebase Storage.
   * @param {File}   file - The file to upload
   * @param {string} path - Storage path (e.g. 'profile-images/{userId}/avatar.jpg')
   * @returns {Promise<string>} Download URL of the uploaded file
   */
  async uploadFile(file, path) {
    if (typeof firebase === 'undefined') {
      throw new Error('Firebase SDK not loaded. Ensure firebase-app and firebase-storage scripts are included.');
    }
    const storage = firebase.storage();
    const storageRef = storage.ref(path);
    const snapshot = await storageRef.put(file);
    return snapshot.ref.getDownloadURL();
  },

  /**
   * Upload a file with auto-generated path scoped to a user.
   * @param {File}   file   - The file to upload
   * @param {string} folder - Folder name (e.g. 'profile-images', 'documents')
   * @param {string} userId - User ID for path scoping
   * @returns {Promise<string>} Download URL of the uploaded file
   */
  async uploadUserFile(file, folder, userId) {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const path = `${folder}/${userId}/${fileName}`;
    return this.uploadFile(file, path);
  },

  /**
   * Delete a file from Firebase Storage.
   * @param {string} path - Full storage path to the file
   * @returns {Promise<void>}
   */
  async deleteFile(path) {
    const storage = firebase.storage();
    const storageRef = storage.ref(path);
    await storageRef.delete();
  },

  /**
   * Get the download URL for a stored file.
   * @param {string} path - Storage path
   * @returns {Promise<string>} Download URL
   */
  async getDownloadURL(path) {
    const storage = firebase.storage();
    const storageRef = storage.ref(path);
    return storageRef.getDownloadURL();
  },
};

window.FirebaseStorage = FirebaseStorage;
