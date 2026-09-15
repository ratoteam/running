export interface KitOption {
  name: string;
  imageUrl: string;
  tshirtSizes?: Record<string, number>;
}

export interface AppConfig {
  tshirtSizes: Record<string, number>;
  maxRegistrations: number;
  isAutoMax: boolean;
  isActive: boolean;
  topBannerUrl?: string;
  topBannerEnabled?: boolean;
  topBannerScale?: number;
  topBannerPosition?: 'left' | 'center' | 'right';
  topBannerFit?: 'cover' | 'contain';
  kits?: KitOption[];
  genders?: string[];
  modalities?: string[];
  enablePCD?: boolean;
  showHeader?: boolean;
  pageTitle?: string;
  pageTitleColor?: string;
  pageSubtitle?: string;
  pageSubtitleColor?: string;
  pageTitleSize?: 'pequeno' | 'medio' | 'grande';
  pageSubtitleSize?: 'pequeno' | 'medio' | 'grande';
  pageTitleBold?: boolean;
  pageTitleItalic?: boolean;
  pageSubtitleBold?: boolean;
  pageSubtitleItalic?: boolean;
  whatsappGroupUrl?: string;
  allowAdminRegistration?: boolean;
}

export interface Registration {
  id?: string;
  cpf: string;
  nome: string;
  sobrenome: string;
  dataNascimento?: string;
  whatsapp: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  kit: string;
  tshirtSize?: string;
  genero?: string;
  modalidade?: string;
  pcd?: string;
  isAdmin: boolean;
  createdAt: number;
}

export interface ResultItem {
  id?: string;
  numero: string;
  participante: string;
  documento: string;
  dataNascimento?: string;
  genero?: string;
  categoria?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  modalidade?: string;
  etinia?: string;
  bairro?: string;
  pcd?: string;
  camiseta?: string;
  tLiq: string;
  tBruto: string;
  pace: string;
  cgcp?: string;
  createdAt?: number;
}

