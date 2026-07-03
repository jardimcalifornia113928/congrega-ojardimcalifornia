'use client';

import React, { useEffect, useState } from 'react';

interface ScheduleRow {
  day?: string;
  date?: string;
  time: string;
  location: string;
  leader: string;
}

interface ServicePrintViewProps {
  month: string;
  weekSchedule: ScheduleRow[];
  saturdaySchedule: ScheduleRow[];
  sundayLontras: ScheduleRow[];
  sundayPraia: ScheduleRow[];
}

export function ServicePrintView({
  month,
  weekSchedule,
  saturdaySchedule,
  sundayLontras,
  sundayPraia,
}: ServicePrintViewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let currentUrl: string | null = null;

    const generatePreview = async () => {
      try {
        const { generateServicePDF } = await import('@/print/services/pdf-generator');
        const pdfBytes = await generateServicePDF({
          month,
          weekSchedule,
          saturdaySchedule,
          sundayLontras,
          sundayPraia,
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
  }, [month, weekSchedule, saturdaySchedule, sundayLontras, sundayPraia]);

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
