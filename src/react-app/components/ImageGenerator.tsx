import { useState } from 'react';
import { Wand2, Loader2, AlertCircle } from 'lucide-react';
import { GenerationRequest, calculateCreditCost } from '@/shared/types';
import ImageUpload from './ImageUpload';

interface ImageGeneratorProps {
  onImageGenerated: () => void;
}

const GENERATION_TYPES = [
  { value: 'standard', label: 'Standard', description: 'Basic product photography' },
  { value: 'lifestyle', label: 'Lifestyle', description: 'Products in real-world settings' },
  { value: 'studio', label: 'Studio', description: 'Clean, professional studio shots' },
  { value: 'seasonal', label: 'Seasonal', description: 'Themed seasonal contexts' },
  { value: 'ecommerce', label: 'E-commerce', description: 'Optimized for online stores' },
];

const RESOLUTIONS = [
  { value: '1024x1024', label: 'Square (1024×1024)', credits: 1 },
  { value: '1920x1080', label: 'Landscape HD (1920×1080)', credits: 2 },
  { value: '1080x1920', label: 'Portrait HD (1080×1920)', credits: 2 },
  { value: '2560x1440', label: '2K (2560×1440)', credits: 3 },
  { value: '3840x2160', label: '4K (3840×2160)', credits: 5 },
];

export default function ImageGenerator({ onImageGenerated }: ImageGeneratorProps) {
  const [images, setImages] = useState<string[]>([]);
  const [prompt, setPrompt] = useState('');
  const [resolution, setResolution] = useState('1024x1024');
  const [generationType, setGenerationType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const creditCost = calculateCreditCost(resolution, images.length);
  const rupeesCost = creditCost * 25;

  const getDefaultPrompt = (type: string): string => {
    switch (type) {
      case 'lifestyle':
        return 'Product in a natural lifestyle setting with beautiful lighting and real-world context';
      case 'studio':
        return 'Professional studio product shot with clean background and perfect lighting';
      case 'seasonal':
        return 'Product styled with seasonal elements and atmospheric mood';
      case 'ecommerce':
        return 'Clean e-commerce product photo optimized for online store display';
      case 'standard':
        return 'Professional product photography with high quality styling';
      default:
        return '';
    }
  };

  const handleGenerate = async () => {
    if (images.length === 0) {
      setError('Please upload at least one product image');
      return;
    }

    // Check if user has provided either a prompt or selected a style type
    if (!prompt.trim() && !generationType) {
      setError('Please provide a custom description or select a style type');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use custom prompt if provided, otherwise use default based on style type
      const finalPrompt = prompt.trim() || getDefaultPrompt(generationType);

      const generationRequest: GenerationRequest = {
        prompt: finalPrompt,
        resolution: resolution as GenerationRequest['resolution'],
        generationType: generationType as GenerationRequest['generationType'],
        productImages: images,
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generationRequest),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Clear form
      setImages([]);
      setPrompt('');
      setGenerationType('');
      
      // Notify parent component
      onImageGenerated();

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
          <Wand2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Generate Product Photo</h2>
          <p className="text-sm text-gray-500">Create professional product photography with AI</p>
        </div>
      </div>

      <ImageUpload 
        images={images} 
        onImagesChange={setImages}
        maxImages={5}
      />

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Custom Description (Optional)
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Modern kitchen countertop with natural lighting, minimalist style"
            className="w-full h-24 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            maxLength={500}
          />
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-500">
              {prompt.trim() ? 'Custom prompt will be used' : 'Either provide a description or select a style type below'}
            </p>
            <span className="text-xs text-gray-400">{prompt.length}/500</span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Style Type
            </label>
            <select
              value={generationType}
              onChange={(e) => setGenerationType(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select a style type (optional)</option>
              {GENERATION_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resolution
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {RESOLUTIONS.map((res) => (
                <option key={res.value} value={res.value}>
                  {res.label} ({res.credits} credit{res.credits > 1 ? 's' : ''})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border">
          <div>
            <p className="text-sm font-medium text-gray-900">Generation Cost</p>
            <p className="text-xs text-gray-600">
              {creditCost} credit{creditCost > 1 ? 's' : ''} • ₹{rupeesCost}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || images.length === 0 || (!prompt.trim() && !generationType)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                <span>Generate Image</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
