'use client';

import React, { useState, useEffect, useRef } from 'react';

export interface PublisherInputProps {
  value: string;
  onChange: (value: string) => void;
  publishers: any[];
  roleName: string;
  placeholder?: string;
  getDesignationKey?: (role: string) => string;
}

const DEFAULT_ROLE_MAP: Record<string, string> = {
  "Presidente": "Tesouros da Palavra::Presidente",
  "Oração inicial": "Tesouros da Palavra::Oração inicial",
  "Oração final": "Tesouros da Palavra::Oração final",
  "Discurso 10min": "Tesouros da Palavra::Discurso 10min",
  "Joias espirituais": "Tesouros da Palavra::Joias espirituais",
  "Leitura da Bíblia": "Tesouros da Palavra::Leitura da Bíblia",
  "Iniciando conversas": "Vida e Ministério::Iniciando conversas",
  "Cultivando o interesse": "Vida e Ministério::Cultivando o interesse",
  "Discurso": "Vida e Ministério::Discurso",
  "Ajudante": "Vida e Ministério::Ajudante",
  "Parte de Vida": "Nossa vida cristã::Partes",
  "Estudo Bíblico de Congregação": "Nossa vida cristã::Estudo Bíblico",
  "EBC Leitor": "Nossa vida cristã::Leitor",
  "Indicador 01": "Designação Mecânica::Indicador",
  "Indicador 02": "Designação Mecânica::Indicador",
  "Microfone 01": "Designação Mecânica::Microfones",
  "Microfone 02": "Designação Mecânica::Microfones",
  "Palco": "Designação Mecânica::Palco",
  "Audio e Video": "Designação Mecânica::Som",
};

function defaultGetDesignationKey(role: string): string {
  return DEFAULT_ROLE_MAP[role] || "";
}

function PublisherInputBase({
  value,
  onChange,
  publishers,
  roleName,
  placeholder = "Selecionar...",
  getDesignationKey = defaultGetDesignationKey,
}: PublisherInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch(value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const designationKey = getDesignationKey(roleName);

  const filteredPubs = publishers
    .filter(p => {
      if (!p || !p.firstName || !p.lastName) return false;
      const fullName = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = fullName.includes((search || "").toLowerCase());
      const hasDesignation = designationKey ? p.designations?.includes(designationKey) : false;
      return matchesSearch && hasDesignation;
    })
    .sort((a, b) => {
      const nameA = `${a.firstName} ${a.lastName}`.toLowerCase();
      const nameB = `${b.firstName} ${b.lastName}`.toLowerCase();
      return nameA.localeCompare(nameB);
    });

  const handleSelect = (fullName: string) => {
    onChange(fullName);
    setSearch(fullName);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="hidden print:block text-xs font-medium text-black border-b border-gray-300 pb-1 min-h-[18px]">
        {value || "—"}
      </div>
      <input
        type="text"
        value={search}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="print:hidden w-full bg-[#1E293B]/20 border border-[#1E293B]/50 hover:border-[#1E293B] focus:border-[#0EA5E9] text-white rounded-lg px-3 py-1.5 h-10 text-xs focus:outline-none transition-all"
      />
      {isOpen && filteredPubs.length > 0 && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-[#0F172A] border border-[#1E293B] rounded-xl shadow-xl scrollbar-thin">
          <div className="p-1">
            <div className="px-2 py-1 text-[9px] font-black text-[#0EA5E9] uppercase tracking-wider">{designationKey || roleName}</div>
            {filteredPubs.map(p => {
              const name = [p.firstName, p.middleName, p.lastName].filter(Boolean).join(' ');
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelect(name)}
                  className="w-full text-left px-3 py-1.5 hover:bg-[#1E293B] rounded-lg text-xs text-white font-medium transition-colors"
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export const PublisherInput = React.memo(PublisherInputBase);
