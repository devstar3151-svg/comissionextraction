import React, { useState, useRef, useCallback } from 'react';
import { Download, FileText, X } from 'lucide-react';

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
      className={`relative border border-dashed rounded-xl p-12 text-center transition-all duration-200 ease-in-out bg-white shadow-sm
        ${isDragging ? 'border-[#a87b4f] bg-[#fdfbf9]' : 'border-[#d1ccc5] hover:border-[#a87b4f]'}
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
            <div className="p-4 bg-[#f5f4f0] rounded-full text-[#a87b4f]">
              <FileText size={40} strokeWidth={1.5} />
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
            <p className="text-base font-medium text-[#2d2a26]">{selectedFile.name}</p>
            <p className="text-sm text-[#8c8985]">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center space-y-4">
          <Download size={36} strokeWidth={1.5} className="text-[#a87b4f] mb-2" />
          <div>
            <p className="text-lg font-medium text-[#2d2a26]">
              Glissez vos PDF ici, ou <span className="text-[#a87b4f] underline decoration-[#a87b4f]/30 underline-offset-4 hover:decoration-[#a87b4f] transition-colors">parcourez vos fichiers</span>
            </p>
            <p className="text-sm text-[#8c8985] mt-3">
              Un onglet sera généré par bordereau · PDF uniquement
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
