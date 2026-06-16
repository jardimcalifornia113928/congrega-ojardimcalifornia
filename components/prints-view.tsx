'use client';

import React from 'react';
import { Printer, FileText, Download, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function PrintsView() {
  const prints = [
    { title: "Cartões S-21", desc: "Cartão de Registro de Publicador", icon: Users },
    { title: "Formulário S-1", desc: "Relatório de Congregação", icon: FileText },
    { title: "Quadro de Anúncios", desc: "Designações da Semana", icon: Printer },
    { title: "Lista de Grupos", desc: "Arranjos de Serviço de Campo", icon: Download },
  ];

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">Impressões</h1>
          <p className="text-[#94A3B8] font-bold">Documentos e formulários oficiais da organização.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {prints.map((p) => (
          <Card key={p.title} className="border-[#1E293B] shadow-sm rounded-[32px] overflow-hidden group hover:border-[#0EA5E9]/30 transition-all">
            <CardContent className="p-8 flex items-center gap-8">
              <div className="h-20 w-20 rounded-3xl bg-[#1E293B]/50 flex items-center justify-center group-hover:bg-[#0EA5E9]/10 transition-colors">
                <p.icon className="h-10 w-10 text-[#64748B] group-hover:text-[#0EA5E9] transition-colors" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black text-white">{p.title}</h3>
                <p className="text-[#94A3B8] font-bold text-sm">{p.desc}</p>
              </div>
              <Button size="icon" variant="ghost" className="h-12 w-12 rounded-2xl hover:bg-[#0EA5E9]/10 hover:text-[#0EA5E9] transition-all">
                <Printer className="h-6 w-6" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
