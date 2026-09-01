'use client';

export interface SuperintendentDesignations {
  superintendentName?: string;
  superintendentDesignations?: string[];
}

export const SUPERINTENDENT_OPTIONS = ['Orador Local', 'Oração Inicial', 'Oração Final', 'Dirigente de campo'] as const;

export function superintendentDesignationKeys(des: string[] = []): string[] {
  const keys: string[] = [];
  if (des.includes('Orador Local')) keys.push('Fim de semana::Orador local');
  if (des.includes('Oração Inicial')) {
    keys.push('Tesouros da Palavra::Oração inicial');
    keys.push('Fim de semana::Oração inicial');
  }
  if (des.includes('Oração Final')) {
    keys.push('Tesouros da Palavra::Oração final');
    keys.push('Fim de semana::Oração final');
  }
  if (des.includes('Dirigente de campo')) keys.push('Serviço de campo::Dirigente de campo');
  return keys;
}

export function buildSuperintendentVirtual(
  settings: SuperintendentDesignations | undefined
): any | null {
  const name = settings?.superintendentName || '';
  const des = settings?.superintendentDesignations || [];
  if (!name || des.length === 0) return null;
  const parts = name.trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ');
  return {
    id: '__superintendent__',
    firstName,
    middleName: '',
    lastName,
    status: 'ativo',
    designations: superintendentDesignationKeys(des),
  };
}

export function mergeSuperintendent(publishers: any[], settings: SuperintendentDesignations | undefined): any[] {
  const sup = buildSuperintendentVirtual(settings);
  if (!sup) return publishers;
  if (publishers.some((p) => p.id === '__superintendent__')) return publishers;
  return [...publishers, sup];
}
