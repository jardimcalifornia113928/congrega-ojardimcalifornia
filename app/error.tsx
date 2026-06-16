'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050B14] p-6 text-center">
      <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <AlertTriangle className="h-10 w-10 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Algo deu errado!</h2>
      <p className="text-[#94A3B8] mb-8 max-w-md">
        Ocorreu um erro inesperado ao carregar esta página.
      </p>
      <button 
        onClick={() => reset()}
        className="bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-xl h-12 px-8 gap-2 inline-flex items-center justify-center cursor-pointer transition-all"
      >
        <RefreshCcw className="h-5 w-5" />
        Tentar novamente
      </button>
    </div>
  );
}
