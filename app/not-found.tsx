'use client';

import Link from 'next/link';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#050B14] p-6 text-center">
      <h1 className="text-9xl font-black text-[#1E293B] mb-4">404</h1>
      <h2 className="text-2xl font-bold text-white mb-2">Página não encontrada</h2>
      <p className="text-[#94A3B8] mb-8 max-w-md">
        Desculpe, a página que você está procurando não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="bg-[#0EA5E9] hover:bg-blue-700 text-white font-bold rounded-xl h-12 px-8 gap-2 inline-flex items-center justify-center transition-all no-underline"
      >
        <Home className="h-5 w-5" />
        Voltar para o Início
      </Link>
    </div>
  );
}
