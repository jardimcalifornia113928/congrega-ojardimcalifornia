'use client';

import React, { useEffect, useState } from 'react';
import { generateCarrinhoPDF } from '@/print/services/carrinho-pdf-generator';

interface DayRow {
  date: string;
  diaSemana: string;
  manha: { designado1: string; designado2: string };
  tarde: { designado1: string; designado2: string };
  noite: { designado1: string; designado2: string };
}

interface CarrinhoPrintViewProps {
  month: string;
  carrinhoMacaco: DayRow[];
  carrinhoRetao: DayRow[];
  orientacoes?: string;
}

export function CarrinhoPrintView({
  month,
  carrinhoMacaco,
  carrinhoRetao,
  orientacoes,
}: CarrinhoPrintViewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;

    const generatePreview = async () => {
      try {
        const pdfBytes = await generateCarrinhoPDF({
          month,
          carrinhoMacaco,
          carrinhoRetao,
          orientacoes,
        });
        if (cancelled) return;
        const blob = new Blob([pdfBytes as BlobPart], { type: 'application/pdf' });
        currentUrl = URL.createObjectURL(blob);
        setPdfUrl(currentUrl);
      } catch (error) {
        console.error('Erro ao gerar preview:', error);
      }
    };

    generatePreview();

    return () => {
      cancelled = true;
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [month, carrinhoMacaco, carrinhoRetao, orientacoes]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#f3f4f6',
      display: 'flex',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {pdfUrl ? (
        <iframe
          src={`${pdfUrl}#toolbar=0&navpanes=0`}
          style={{
            width: '794px',
            height: '1123px',
            border: '1px solid #ccc',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            backgroundColor: '#ffffff',
          }}
          title="Preview do PDF"
        />
      ) : (
        <div style={{
          width: '794px',
          height: '1123px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          border: '1px solid #ccc',
        }}>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>Gerando preview...</p>
        </div>
      )}
    </div>
  );
}
