

export type Review = {
  id: string;
  rating: number;
  text: string;
  author: string;
  date: string;
  status: 'Visible' | 'Oculto';
};

export type Seller = {
  id: string;
  name: string;
  bio: string;
  avatar: string;
};

export type Customization = {
  size?: string;
  patches?: boolean;
  nameAndNumber?: boolean;
  notes?: string;
};

export type Brand = {
  id: string;
  name: string;
  description: string;
  status: 'Activo' | 'Inactivo';
};

export type Product = {
  id: string;
  name:string;
  description: string;
  longDescription: string;
  price: number;
  brandId?: string;
  subcategoryId: string;
  saleType: 'stock' | 'on_demand';
  image: string;
  images: string[];
  seller: Seller;
  reviews: Review[];
  specifications: Record<string, string>;
  stock: number;
  status: 'Activo' | 'Inactivo';
  sizes?: string[];
  customizationOptions?: {
    patches?: boolean;
    nameAndNumber?: boolean;
  };
};

export type CartItem = {
  id: string; // Unique ID for product + customization combo
  product: Product;
  quantity: number;
  price: number; // Price per unit when added, including customizations
  customization: Customization;
};

export type OrderProduct = {
  productId: string;
  quantity: number;
  price: number;
  customization?: Customization;
};

export type OrderStatus = 'Pendiente' | 'Procesando' | 'Enviado' | 'En Tránsito' | 'Entregado' | 'Cancelado';

export type TrackingEvent = {
  status: OrderStatus;
  date: string;
  description: string;
};

export type Order = {
  id: string;
  userId?: string;
  customerName: string;
  email: string;
  phone?: string;
  identification?: string;
  shippingAddress?: Address;
  date: string;
  subtotal: number;
  discountAmount: number;
  taxAmount?: number;
  taxRate?: number;
  couponCode?: string;
  total: number;
  status: OrderStatus;
  items: OrderProduct[];
  trackingHistory: TrackingEvent[];
  paymentMethod?: 'PayPal' | 'Transferencia Bancaria' | 'Punto de Venta';
  eInvoiceStatus?: 'PENDING' | 'AUTHORIZED' | 'REJECTED' | 'ERROR';
  eInvoiceAuthorization?: string;
};

export type KardexEntry = {
  id: string;
  productId: string;
  productName: string;
  date: string;
  type: 'Entrada' | 'Salida';
  quantity: number;
  balance: number;
  notes?: string;
};

export type ProductReview = Review & {
  productId: string;
  productName: string;
  productImage: string;
};

export interface Address {
  id: string;
  name: string; // e.g., "Casa", "Oficina"
  address: string;
  city: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export type Permission =
  | 'view_dashboard'
  | 'manage_pos'
  | 'manage_orders'
  | 'manage_products'
  | 'manage_inventory'
  | 'manage_import_export'
  | 'manage_tournaments'
  | 'manage_categories'
  | 'manage_discounts'
  | 'manage_giveaways'
  | 'manage_users'
  | 'manage_roles'
  | 'manage_reviews'
  | 'view_kardex'
  | 'view_activity'
  | 'manage_backups'
  | 'manage_store_settings';

export type Permissions = {
  all?: boolean;
  [key: string]: boolean | undefined;
};


export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  identification?: string;
  phone?: {
    countryCode: string;
    number: string;
  };
  role: string;
  roleId?: string;
  status: 'Activo' | 'Inactivo';
  addresses?: Address[];
  cart?: CartItem[];
  resetPasswordToken?: string | null;
  resetPasswordExpires?: string | null;
  verificationToken?: string | null;
  verificationTokenExpires?: string | null;
  recentlyViewed?: string[];
  permissions?: Permissions;
}

export type Role = {
    id: string;
    name: string;
    permissions: Permissions;
    status: 'Activo' | 'Inactivo';
}

export type Category = {
    id: string;
    name: string;
    description: string;
    status: 'Activo' | 'Inactivo';
    iconName?: string;
};

export type Subcategory = {
    id: string;
    name: string;
    categoryId: string;
    status: 'Activo' | 'Inactivo';
};

export type Discount = {
    id: string;
    name: string;
    type: 'Porcentaje' | 'Fijo' | 'Combo';
    value: number;
    applicableProductIds: string[];
    status: 'Activo' | 'Inactivo';
    endDate?: string | null;
    uses: number;
    maxUses: number | null;
};

export type Coupon = {
    id: string;
    code: string;
    type: 'Porcentaje' | 'Fijo' | 'Envío Gratis';
    value: number | null;
    uses: number;
    maxUses: number | null;
    status: 'Activo' | 'Expirado' | 'Agotado' | 'Inactivo';
    expiryDate?: string | null;
};

export type StoreConfig = {
    id: number;
    name: string;
    legalName?: string;
    description: string;
    logoUrl?: string;
    logoUrlDark?: string;
    baseUrl: string;
    contactEmail: string;
    contactPhone: string;
    address: {
        street: string;
        city: string;
        postalCode: string;
        country: string;
        ruc: string;
    };
    currency: {
        code: string; // e.g., "USD"
        symbol: string; // e.g., "$"
    };
    socials: {
        facebook?: string;
        twitter?: string;
        instagram?: string;
        linkedin?: string;
        whatsapp?: string;
        threads?: string;
    };
    taxRate?: number;
    paymentGateways?: {
        paypal?: {
            enabled: boolean;
            clientId?: string; // Public ID, safe to send to client
        };
    };
    eSignatureFile?: string; // base64 encoded .p12 file
    isEInvoicingEnabled: boolean;
    nextInvoiceNumber: number;
    eInvoicingEnvironment: '1' | '2';
    contribuyenteRimpe?: "CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE" | "CONTRIBUYENTE RÉGIMEN RIMPE" | 'none';
};

export type Giveaway = {
  id: string;
  name: string;
  description: string;
  entryType: 'open' | 'purchase_based';
  minPurchaseAmount?: number;
  productPrizeIds: string[];
  startDate: string;
  endDate: string;
  status: 'Activo' | 'Programado' | 'Finalizado' | 'Inactivo';
  winnerId: string | null;
  participants: string[]; // array of user IDs
};

export type GiveawayPrize = {
    giveawayId: string;
    productId: string;
}

export type Pillar = {
  icon: string;
  title: string;
  description: string;
};

export type NosotrosPageConfig = {
  main: {
    title: string;
    p1: string;
    p2: string;
    imageUrl: string;
  };
  pillars: {
    title: string;
    description: string;
    items: Pillar[];
  };
};

export type Backup = {
  id: string;
  date: string;
  filename: string;
};

export type ActivityLog = {
    id: string;
    userId: string;
    userName: string;
    action: string;
    entityType: string;
    entityId?: string;
    details?: Record<string, any>;
    createdAt: string;
};

// Tournament Types
export type Tournament = {
  id: string;
  name: string;
  format: 'bracket' | 'league' | 'groups';
  numberOfTeams: number;
  rules: {
    playersPerTeam: number;
    substitutes: number;
    yellowCardsForSuspension: number;
  };
  groupStageConfig?: {
    teamsPerGroup: number;
    teamsAdvancing: number;
  };
  status: 'Abierto' | 'En Curso' | 'Finalizado';
  createdAt: string;
  startDate: string;
  endDate?: string | null;
  championId?: string | null;
};

export type TournamentTeam = {
  id: string;
  tournamentId: string;
  userId: string; // Captain
  name: string;
  status: 'Pendiente' | 'Aprobado' | 'Rechazado';
  createdAt: string;
  players: TournamentPlayer[];
  groupName?: string | null;
};

export type TournamentPlayer = {
  id: string;
  teamId: string;
  name: string;
  dorsal: number;
  position: 'Portero' | 'Defensa' | 'Mediocentro' | 'Delantero';
};

export type Match = {
  id: string;
  tournamentId: string;
  teamA_Id?: string | null;
  teamB_Id?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  round: string;
  groupName?: string | null;
  status: 'Pendiente' | 'En Curso' | 'Finalizado';
  winnerId?: string | null;
  nextMatchId?: string | null;
};

export type MatchEvent = {
  id: string;
  matchId: string;
  teamId: string;
  playerId: string;
  type: 'goal' | 'assist' | 'yellow_card' | 'red_card';
  minute?: number;
  createdAt: string;
};

export type Standing = {
  id: string;
  tournamentId: string;
  teamId: string;
  teamName?: string;
  groupName?: string | null;
  points: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
};

export type PlayerSanction = {
  id: string;
  playerId: string;
  tournamentId: string;
  matchId?: string | null;
  reason: 'double_yellow' | 'direct_red' | 'yellow_accumulation';
  games: number;
  gamesServed: number;
  isActive: boolean;
};

export type TournamentWithDetails = Tournament & {
  teams: TournamentTeam[];
  matches: Match[];
  standings?: Standing[];
  events: MatchEvent[];
  teamsCount?: number;
  approvedTeamsCount?: number;
};

export type Suggestion = {
    id: string;
    userId: string;
    userName: string;
    suggestion: string;
    createdAt: string;
};
