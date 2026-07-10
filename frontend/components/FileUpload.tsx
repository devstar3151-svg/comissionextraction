import React, { useState, useRef, useCallback } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  disabled?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, disabled }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        alert('Veuillez télécharger un fichier PDF valide.');
      }
    }
  }, [disabled, onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        alert('Veuillez télécharger un fichier PDF valide.');
      }
    }
  }, [disabled, onFileSelect]);

  const clearFile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div
      className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ease-in-out
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="application/pdf"
        className="hidden"
        disabled={disabled}
      />

      {selectedFile ? (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="p-4 bg-blue-100 rounded-full text-blue-600">
              <FileText size={48} />
            </div>
            {!disabled && (
              <button
                onClick={clearFile}
                className="absolute -top-2 -right-2 p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors"
                title="Supprimer le fichier"
              >
                <X size={16} />
              </button>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-slate-700">{selectedFile.name}</p>
            <p className="text-xs text-slate-500">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="p-4 bg-slate-100 rounded-full text-slate-500">
            <UploadCloud size={48} />
          </div>
          <div>
            <p className="text-base font-medium text-slate-700">
              Glissez et déposez votre relevé de commissions ici
            </p>
            <p className="text-sm text-slate-500 mt-1">
              ou cliquez pour parcourir (PDF uniquement)
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
