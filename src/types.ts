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
  bannerUrl?: string;
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
  headerBannerUrl?: string;
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
