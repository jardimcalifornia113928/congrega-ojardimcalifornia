'use client';

import React from 'react';

export interface CongregationPrintRow {
  name: string;
  phone: string;
  groupName: string;
  responsibility: string;
  status: string;
}

interface Props {
  title: string;
  subtitle?: string;
  rows: CongregationPrintRow[];
}

export function CongregationPrintLayout({ title, subtitle, rows }: Props) {
  return (
    <div
      data-congregation-page
      style={{
        width: '794px',
        backgroundColor: '#ffffff',
        color: '#111827',
        fontFamily: 'Arial, Helvetica, sans-serif',
        padding: '40px 36px',
        boxSizing: 'border-box',
      }}
    >
      <header style={{ textAlign: 'center', marginBottom: '28px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '1px', margin: 0, textTransform: 'uppercase' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: '12px', color: '#333', margin: '6px 0 0' }}>{subtitle}</p>
        )}
      </header>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #111827' }}>
            <th style={{ textAlign: 'left', padding: '8px 6px', fontWeight: 700 }}>Nome</th>
            <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700 }}>Celular</th>
            <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700 }}>Grupo de Campo</th>
            <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700 }}>Responsabilidade</th>
            <th style={{ textAlign: 'center', padding: '8px 6px', fontWeight: 700 }}>Situação</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '7px 6px', fontWeight: 700 }}>{r.name}</td>
              <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.phone || '—'}</td>
              <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.groupName}</td>
              <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.responsibility}</td>
              <td style={{ padding: '7px 6px', textAlign: 'center' }}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p style={{ textAlign: 'right', fontSize: '10px', color: '#666', marginTop: '24px' }}>
        Gerado em {new Date().toLocaleDateString('pt-BR')}
      </p>
    </div>
  );
}

export default CongregationPrintLayout;