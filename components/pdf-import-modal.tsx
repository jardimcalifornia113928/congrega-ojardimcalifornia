'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Loader2, Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface ExtractedField {
  label: string;
  key: string;
  value: string;
  selected: boolean;
}

interface Props {
  onClose: () => void;
  onImport: (fields: Record<string, string>) => void;
}

const PREDEFINED_PATTERNS: { label: string; key: string; pattern: RegExp }[] = [
  { label: 'Presidente', key: 'president', pattern: /PRESIDENTE[:\s-]+(.+?)(?:\s*\/|\s*ORADOR|\s*TEMA|\s*ESTUDO|\n|$)/i },
  { label: 'Oração Inicial', key: 'openingPrayer', pattern: /ORAÇ[ÃA]O\s*INICIAL[:\s-]+(.+?)(?:\s*\/|\s*ORAÇ|\n|$)/i },
  { label: 'Oração Final', key: 'closingPrayer', pattern: /ORAÇ[ÃA]O\s*FINAL[:\s-]+(.+?)(?:\s*\/|\n|$)/i },
  { label: 'Orador (Discurso)', key: 'talkSpeaker', pattern: /(?:ORADOR|DISCURSO)[:\s-]+(.+?)(?:\s*\/|\s*\d|\n|$)/i },
  { label: 'Tema do Discurso', key: 'talkTheme', pattern: /TEMA[:\s-]+(.+?)(?:\s*--|\s*–|\s*ORADOR|\n|$)/i },
  { label: 'Joias Espirituais', key: 'gemsSpeaker', pattern: /JOIAS\s*ESPIRITUAIS[:\s-]+(.+?)(?:\s*\/|\s*\d|\n|$)/i },
  { label: 'Leitura da Bíblia', key: 'bibleReadingReader', pattern: /LEITURA\s*DA\s*B[ÍI]BLIA[:\s-]+(.+?)(?:\s*\/|\s*\d|\n|$)/i },
  { label: 'Dirigente CBS', key: 'cbsConductor', pattern: /ESTUDO\s*B[ÍI]BLICO.*?DIRIGENTE[:\s-]+(.+?)(?:\s*LEITOR|\n|$)/i },
  { label: 'Leitor CBS', key: 'cbsReader', pattern: /ESTUDO\s*B[ÍI]BLICO.*?LEITOR[:\s-]+(.+?)(?:\s*$|\n)/i },
  { label: 'Indicador 1', key: 'mechanicalIndicador1', pattern: /INDICADOR\s*[-]?\s*1[:\s-]+(.+?)(?:\s*(?:MICROFONE|INDICADOR|\n)|$)/i },
  { label: 'Indicador 2', key: 'mechanicalIndicador2', pattern: /INDICADOR\s*[-]?\s*2[:\s-]+(.+?)(?:\s*(?:MICROFONE|PALCO|\n)|$)/i },
  { label: 'Microfone 1', key: 'mechanicalMicrofone1', pattern: /MICROFONE\s*[-]?\s*1[:\s-]+(.+?)(?:\s*(?:AUDIO|MICROFONE|\n)|$)/i },
  { label: 'Microfone 2', key: 'mechanicalMicrofone2', pattern: /MICROFONE\s*[-]?\s*2[:\s-]+(.+?)(?:\s*(?:PALCO|\n)|$)/i },
  { label: 'Áudio e Vídeo', key: 'mechanicalAudioVideo', pattern: /[ÁA]UDIO\s*E\s*V[ÍI]DEO[:\s-]+(.+?)(?:\s*(?:PALCO|\n)|$)/i },
  { label: 'Palco', key: 'mechanicalPalco', pattern: /PALCO[:\s-]+(.+?)(?:\s*$|\n)/i },
  { label: 'Dirigente A Sentinela', key: 'watchtowerConductor', pattern: /SENTINELA.*?DIRIGENTE[:\s-]+(.+?)(?:\s*LEITOR|\n|$)/i },
  { label: 'Leitor A Sentinela', key: 'watchtowerReader', pattern: /SENTINELA.*?LEITOR[:\s-]+(.+?)(?:\s*$|\n)/i },
];

export function PdfImportModal({ onClose, onImport }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [fields, setFields] = useState<ExtractedField[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || f.type !== 'application/pdf') {
      toast.error('Selecione um arquivo PDF válido.');
      return;
    }
    setFile(f);
    setPdfUrl(URL.createObjectURL(f));
    setIsExtracting(true);
    try {
      const text = await extractPdfText(f);
      setExtractedText(text);
      const extracted = PREDEFINED_PATTERNS.map(({ label, key, pattern }) => {
        const match = text.match(pattern);
        return {
          label,
          key,
          value: match ? match[1].trim() : '',
          selected: !!match,
        };
      }).filter(f => f.value);
      setFields(extracted.length > 0 ? extracted : []);
      if (extracted.length === 0) {
        toast.error('Nenhum campo reconhecido. Use a extração manual.');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao extrair texto do PDF.');
    } finally {
      setIsExtracting(false);
    }
  };

  const toggleField = (key: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, selected: !f.selected } : f));
  };

  const handleImport = () => {
    const result: Record<string, string> = {};
    fields.forEach(f => { if (f.selected) result[f.key] = f.value; });
    if (Object.keys(result).length === 0) {
      toast.error('Selecione pelo menos um campo para importar.');
      return;
    }
    onImport(result);
    toast.success(`${Object.keys(result).length} campo(s) importado(s)!`);
    onClose();
  };

  const handleManualFieldAdd = () => {
    const raw = extractedText;
    const lines = raw.split('\n').filter(l => l.trim());
    const manual: ExtractedField[] = lines.map((line, i) => ({
      label: `Trecho ${i + 1}`,
      key: `manual_${i}`,
      value: line.trim(),
      selected: false,
    }));
    setFields(prev => [...prev, ...manual]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col items-center overflow-y-auto">
      <div className="sticky top-0 w-full z-10 bg-[#0F172A]/95 backdrop-blur border-b border-[#1E293B] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E293B] transition-colors">
            <X className="w-5 h-5" />
          </button>
          <p className="text-white font-bold text-sm">Importar PDF</p>
        </div>
      </div>

      <div className="w-full max-w-4xl p-6 space-y-6">
        {/* Upload */}
        {!file && (
          <div className="border-2 border-dashed border-[#1E293B] rounded-2xl p-12 text-center hover:border-[#0EA5E9]/50 transition-colors cursor-pointer"
            onClick={() => fileRef.current?.click()}>
            <Upload className="w-12 h-12 text-[#64748B] mx-auto mb-4" />
            <p className="text-white font-bold text-lg">Clique para selecionar um PDF</p>
            <p className="text-[#94A3B8] text-sm mt-1">ou arraste o arquivo aqui</p>
            <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} className="hidden" />
          </div>
        )}

        {/* Preview + Extração */}
        {file && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Preview do PDF */}
            <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-4">
              <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Visualização
              </h3>
              {pdfUrl && (
                <iframe src={pdfUrl} className="w-full h-[500px] rounded-xl bg-white" title="Preview PDF" />
              )}
              <div className="mt-3 flex gap-2">
                <Button onClick={() => { setFile(null); setPdfUrl(null); setExtractedText(''); setFields([]); }}
                  variant="outline" size="sm" className="border-[#1E293B] text-[#94A3B8] text-xs">
                  <Upload className="w-3 h-3 mr-1" /> Trocar PDF
                </Button>
                <Button onClick={handleManualFieldAdd} variant="outline" size="sm"
                  className="border-[#1E293B] text-[#94A3B8] text-xs">
                  Extrair linhas
                </Button>
              </div>
            </div>

            {/* Campos extraídos */}
            <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-4">
              <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider mb-3">
                Campos Extraídos {isExtracting && <Loader2 className="w-3 h-3 animate-spin inline ml-1" />}
              </h3>

              {isExtracting ? (
                <div className="flex items-center justify-center h-[300px]">
                  <Loader2 className="w-8 h-8 animate-spin text-[#0EA5E9]" />
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {fields.length === 0 && extractedText && (
                    <p className="text-[#94A3B8] text-xs">Nenhum campo reconhecido automaticamente. Clique em "Extrair linhas" para extrair manualmente.</p>
                  )}
                  {fields.map(f => (
                    <label key={f.key} className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors ${f.selected ? 'bg-[#0EA5E9]/10 border border-[#0EA5E9]/30' : 'bg-[#1E293B]/30 border border-transparent hover:bg-[#1E293B]/50'}`}>
                      <input type="checkbox" checked={f.selected} onChange={() => toggleField(f.key)} className="mt-0.5 accent-[#0EA5E9]" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-bold">{f.label}</p>
                        <p className="text-[#94A3B8] text-[11px] truncate">{f.value}</p>
                      </div>
                      {f.selected && <Check className="w-4 h-4 text-[#0EA5E9] shrink-0 mt-0.5" />}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Texto cru extraído */}
        {extractedText && (
          <div className="bg-[#0B1220]/70 border border-[#1E293B]/60 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-black text-[#94A3B8] uppercase tracking-wider">Texto Extraído (bruto)</h3>
              <Button onClick={() => { navigator.clipboard.writeText(extractedText); toast.success('Copiado!'); }}
                variant="ghost" size="sm" className="text-[#94A3B8] text-xs gap-1">
                <Copy className="w-3 h-3" /> Copiar
              </Button>
            </div>
            <pre className="text-xs text-[#94A3B8] bg-[#050B14] rounded-xl p-4 max-h-[200px] overflow-y-auto whitespace-pre-wrap font-mono">
              {extractedText}
            </pre>
          </div>
        )}

        {/* Ações */}
        {fields.length > 0 && (
          <div className="flex justify-end gap-3">
            <Button onClick={onClose} variant="outline" className="border-[#1E293B] text-[#94A3B8] rounded-xl">
              Cancelar
            </Button>
            <Button onClick={handleImport} className="bg-[#0EA5E9] hover:bg-blue-600 text-white rounded-xl gap-2">
              <Check className="w-4 h-4" /> Importar {fields.filter(f => f.selected).length} campo(s)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import('pdfjs-dist');

  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@6.0.227/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useSystemFonts: true }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items.map((item: any) => item.str).join(' ');
    pages.push(text);
  }

  return pages.join('\n---\n');
}
