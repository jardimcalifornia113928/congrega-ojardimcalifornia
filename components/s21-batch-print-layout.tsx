'use client';

import React from 'react';
import { S21PrintLayout } from '@/components/s21-print-layout';

interface PublisherData {
  firstName: string;
  middleName: string;
  lastName: string;
  birthDate: string;
  baptismDate: string;
  gender: string;
  tags: string[];
  responsibility: string;
  pioneerType: string;
}

interface S21MonthEntry {
  participou: boolean;
  estudos: string;
  auxiliar: boolean;
  horas: string;
  observacao: string;
}

interface PublisherS21 {
  publisher: PublisherData;
  s21Data: Record<string, S21MonthEntry>;
}

interface Props {
  items: PublisherS21[];
  serviceYear: string;
}

export function S21BatchPrintLayout({ items, serviceYear }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
      {items.map((item, idx) => (
        <div key={idx} data-s21-batch-page>
          <S21PrintLayout
            publisher={item.publisher}
            s21Data={item.s21Data}
            serviceYear={serviceYear}
          />
        </div>
      ))}
    </div>
  );
}
