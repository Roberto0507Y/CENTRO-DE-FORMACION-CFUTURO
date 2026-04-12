export type PricingStatus = "activo" | "inactivo";

export type PricingSetting = {
  id: number;
  nombre: string;
  precio: number;
  payment_link: string;
  estado: PricingStatus;
  created_at: string;
  updated_at: string;
};

export type CreatePricingInput = {
  precio: number;
  payment_link: string;
};

export type UpdatePricingInput = {
  precio?: number;
  payment_link?: string;
  estado?: PricingStatus;
};

