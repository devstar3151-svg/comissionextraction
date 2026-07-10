import React, { useState, useCallback } from 'react';
import { FileUpload } from './components/FileUpload';
import { ResultsDashboard } from './components/ResultsDashboard';
import { extractCommissionData } from './services/gemini';
import { ProcessingState } from './types';
import { FileSearch, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
              <FileSearch size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Commission Extractor <span className="text-blue-600">AI</span>
            </h1>
          </div>
          {processState.status === 'success' && (
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-md hover:bg-blue-50"
            >
              <RefreshCw size={16} />
              <span>Traiter un autre fichier</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        
        {/* Intro Section (only show when idle) */}
        {processState.status === 'idle' && (
          <div className="max-w-3xl mx-auto mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">
              Standardisez vos relevés de commissions instantanément
            </h2>
            <p className="text-lg text-slate-600">
              Téléchargez n'importe quel relevé de commissions PDF. Notre agent IA identifiera automatiquement le format, extraira les données clés et les associera à une structure standardisée.
            </p>
          </div>
        )}

        {/* Upload Area */}
        {(processState.status === 'idle' || processState.status === 'error') && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-500">
            <FileUpload 
              onFileSelect={handleFileSelect} 
              disabled={processState.status === 'processing'} 
            />
            
            {processState.status === 'error' && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3 text-red-700">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium">Échec du traitement</h4>
                  <p className="text-sm mt-1 opacity-90">{processState.message}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing State */}
        {processState.status === 'processing' && (
          <div className="max-w-md mx-auto mt-12 text-center animate-in fade-in duration-300">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                <FileSearch size={32} className="animate-pulse" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-900 mb-2">Traitement du document</h3>
            <p className="text-slate-500">{processState.message}</p>
          </div>
        )}

        {/* Results Dashboard */}
        {processState.status === 'success' && processState.data && (
          <div className="mt-4">
            <div className="mb-6 flex items-center space-x-2 text-emerald-600 bg-emerald-50 px-4 py-3 rounded-lg border border-emerald-100 inline-flex">
              <CheckCircle2 size={20} />
              <span className="font-medium">Extraction et standardisation terminées avec succès.</span>
            </div>
            <ResultsDashboard data={processState.data} />
          </div>
        )}

      </main>
    </div>
  );
};

export default App;
