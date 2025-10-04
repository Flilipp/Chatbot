import { useState } from 'react';
import Navigation from '@/components/Navigation';

const ImageGenerator = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setImageUrl('');

    // TODO: Jutro podłączymy to do naszego backendu
    setTimeout(() => {
        setLoading(false);
        setError("Funkcja zostanie dodana jutro!");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gray-800">
      <Navigation />
      <div className="max-w-4xl mx-auto p-8">
        <h1 className="text-4xl font-bold text-white mb-8">Generator Obrazów AI</h1>
        <form onSubmit={handleGenerate} className="mb-8">
          <div className="flex gap-4">
            <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Opisz obraz, który chcesz wygenerować..." className="flex-1 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <button type="submit" disabled={loading} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50">
              {loading ? 'Generowanie...' : 'Generuj'}
            </button>
          </div>
        </form>
        {error && <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200 mb-8">{error}</div>}
        {loading && <div className="flex justify-center items-center py-20"><div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div></div>}
        {imageUrl && !loading && <div className="bg-gray-700 rounded-lg p-4"><img src={imageUrl} alt="Generated" className="w-full rounded-lg" /></div>}
      </div>
    </div>
  );
};

export default ImageGenerator;