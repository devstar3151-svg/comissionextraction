import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsDashboard } from './components/ResultsDashboard';
import { extractCommissionData } from './services/gemini';
import { ProcessingState } from './types';
import { AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [processState, setProcessState] = useState<ProcessingState>({ status: 'idle' });

  const handleFileSelect = useCallback(async (file: File) => {
    setProcessState({ status: 'processing', message: 'Lecture du fichier...' });

    try {
      // Convert file to base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const result = reader.result as string;
          // Extract just the base64 string part
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = (error) => reject(error);
      });

      setProcessState({ status: 'processing', message: 'Analyse du document par l\'IA...' });
      
      // Call Gemini API
      const extractedData = await extractCommissionData(base64Data);
      
      setProcessState({ 
        status: 'success', 
        data: extractedData 
      });

    } catch (error: any) {
      setProcessState({ 
        status: 'error', 
        message: error.message || 'Une erreur inattendue s\'est produite lors du traitement.' 
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    setProcessState({ status: 'idle' });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f4f0]">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-[#e6dfd3] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Groupe Premium Logo (Text representation matching their brand) */}
            <div className="flex flex-col items-start justify-center cursor-default">
              <span className="font-sans font-bold text-[14px] tracking-[0.25em] text-[#2d2a26] uppercase leading-none mb-1">Groupe</span>
              <span className="font-sans font-medium text-[22px] tracking-wide text-[#2d2a26] leading-none">Premium<span className="text-[#a87b4f]">.</span></span>
            </div>
            
            <div className="h-8 w-px bg-[#e6dfd3] hidden sm:block"></div>
            
            <h1 className="text-lg font-medium text-[#8c8985] tracking-tight hidden sm:block font-serif italic">
              Commission Extractor AI
            </h1>
          </div>
          
          {processState.status === 'success' && (
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 text-sm font-medium text-[#5c5a58] hover:text-[#a87b4f] transition-colors px-4 py-2 rounded-full hover:bg-[#f5f4f0] border border-transparent hover:border-[#e6dfd3]"
            >
              <RefreshCw size={16} />
              <span>Traiter un autre fichier</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        
        {/* Intro Section */}
        {processState.status === 'idle' && (
          <div className="max-w-3xl mb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <p className="text-xs font-bold tracking-widest text-[#a87b4f] uppercase mb-4">
              Restitution • Bordereaux Assureurs
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-[#2d2a26] mb-6 leading-tight font-serif">
              Déposez vos bordereaux,<br/>récupérez la synthèse.
            </h2>
            <p className="text-lg text-[#5c5a58] leading-relaxed">
              Chaque relevé de commissionnement est lu et ventilé automatiquement dans le tableau de restitution officiel — un onglet par bordereau, prêt à être vérifié.
            </p>
          </div>
        )}

        {/* Upload Area */}
        {(processState.status === 'idle' || processState.status === 'error') && (
          <div className="max-w-3xl animate-in fade-in duration-500">
            <FileUpload 
              onFileSelect={handleFileSelect} 
              disabled={processState.status === 'processing'} 
            />
            
            {processState.status === 'idle' && (
              <div className="mt-8">
                <button disabled className="bg-[#e6dfd3] text-[#8c8985] px-8 py-3.5 rounded-full text-sm font-medium cursor-not-allowed transition-all">
                  Générer le fichier Excel
                </button>
              </div>
            )}

            {processState.status === 'error' && (
              <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700 shadow-sm">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold">Échec du traitement</h4>
                  <p className="text-sm mt-1 opacity-90">{processState.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {processState.status === 'processing' && (
          <div className="max-w-md mt-12 animate-in fade-in duration-300 bg-white p-8 rounded-2xl shadow-sm border border-[#e6dfd3]">
            <div className="flex items-center space-x-5">
              <div className="relative flex items-center justify-center w-12 h-12 bg-[#f5f4f0] rounded-full">
                <Loader2 size={24} className="text-[#a87b4f] animate-spin" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[#2d2a26] font-serif">Traitement en cours</h3>
                <p className="text-[#5c5a58] text-sm mt-1">{processState.message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Results Dashboard */}
        {processState.status === 'success' && processState.data && (
          <div className="mt-2">
            <ResultsDashboard data={processState.data} />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
