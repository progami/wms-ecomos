'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { X, Upload, FileText, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionId: string;
  onUploadComplete: (attachments: DocumentAttachment[]) => void;
  existingAttachments?: DocumentAttachment[];
}

interface DocumentAttachment {
  category: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
}

const DOCUMENT_CATEGORIES = [
  'Packing List',
  'Commercial Invoice',
  'Delivery Note',
  'Cube Master Stacking Style for Storage Pallets',
  'Bill of Lading',
  'Container Loading Plan',
  'Customs Declaration',
  'Certificate of Origin',
  'Quality Certificate',
  'Other'
];

export default function DocumentUploadModal({
  isOpen,
  onClose,
  transactionId,
  onUploadComplete,
  existingAttachments = []
}: DocumentUploadModalProps) {
  const [attachments, setAttachments] = useState<DocumentAttachment[]>(existingAttachments);
  const [pendingFiles, setPendingFiles] = useState<{ file: File; category: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPendingFiles = acceptedFiles.map(file => ({
      file,
      category: 'Other' // Default category
    }));
    setPendingFiles(prev => [...prev, ...newPendingFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv']
    },
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const updateFileCategory = (index: number, category: string) => {
    setPendingFiles(prev => {
      const updated = [...prev];
      updated[index].category = category;
      return updated;
    });
  };

  const removeFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const uploadedAttachments: DocumentAttachment[] = [];

    try {
      for (const { file, category } of pendingFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        formData.append('transactionId', transactionId);

        const response = await fetch('/api/inventory/documents', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Upload failed');
        }

        const result = await response.json();
        uploadedAttachments.push({
          category: result.attachment.category,
          fileName: result.attachment.fileName,
          fileUrl: result.attachment.fileUrl,
          uploadedAt: result.attachment.uploadedAt
        });
      }

      setAttachments(prev => [...prev, ...uploadedAttachments]);
      setPendingFiles([]);
      toast.success(`${uploadedAttachments.length} files uploaded successfully`);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    onUploadComplete(attachments);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Upload Documents</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-6">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            {isDragActive ? (
              <p className="text-blue-600">Drop the files here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-gray-500">Supported: PDF, Images, Excel, CSV (max 10MB)</p>
              </div>
            )}
          </div>
        </div>

        {pendingFiles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Pending Upload</h3>
            <div className="space-y-2">
              {pendingFiles.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <FileText className="h-5 w-5 text-gray-500" />
                  <span className="flex-1 text-sm truncate">{item.file.name}</span>
                  <select
                    value={item.category}
                    onChange={(e) => updateFileCategory(index, e.target.value)}
                    className="px-3 py-1 border rounded-md text-sm"
                  >
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={uploadFiles}
              disabled={isUploading}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? 'Uploading...' : `Upload ${pendingFiles.length} file(s)`}
            </button>
          </div>
        )}

        {attachments.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">Uploaded Documents</h3>
            <div className="space-y-2">
              {attachments.map((attachment, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                  <FileText className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{attachment.fileName}</p>
                    <p className="text-xs text-gray-500">{attachment.category}</p>
                  </div>
                  <a
                    href={attachment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    View
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {attachments.length === 0 && pendingFiles.length === 0 && (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
            <p className="text-gray-600">No documents uploaded for this transaction</p>
            <p className="text-sm text-gray-500 mt-1">
              Upload relevant documents such as packing lists, invoices, or delivery notes
            </p>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Documents
          </button>
        </div>
      </div>
    </div>
  );
}