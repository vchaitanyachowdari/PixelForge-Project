import React from 'react';
import { Input } from '../atoms/Input';
import { Button } from '../atoms/Button';

interface FormFieldProps {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required,
  helpText,
}) => {
  return (
    <Input
      label={label}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      placeholder={placeholder}
      required={required}
      helpText={helpText}
    />
  );
};

// Image Upload component
interface ImageUploadProps {
  onUpload: (file: File) => void;
  loading?: boolean;
  accept?: string;
  maxSize?: number;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onUpload,
  loading = false,
  accept = 'image/*',
  maxSize = 10 * 1024 * 1024, // 10MB
}) => {
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > maxSize) {
        alert(`File size must be less than ${maxSize / 1024 / 1024}MB`);
        return;
      }
      onUpload(file);
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
      <input
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
        id="file-upload"
        disabled={loading}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="space-y-2">
          <div className="text-gray-400">
            <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <Button variant="ghost" disabled={loading}>
              {loading ? 'Uploading...' : 'Choose Image'}
            </Button>
          </div>
          <p className="text-xs text-gray-500">PNG, JPG, WebP up to {maxSize / 1024 / 1024}MB</p>
        </div>
      </label>
    </div>
  );
};