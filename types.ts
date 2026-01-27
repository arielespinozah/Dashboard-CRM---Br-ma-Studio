
export enum Status {
  PLANNED = 'PLANNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ON_HOLD = 'ON_HOLD'
}

export enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface Client {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  avatar?: string;
  type: 'Prospect' | 'Client';
  notes?: string;
  lastContactDate?: string;
}

export interface ProjectStage {
    id: string;
    name: string;
    status: 'Pending' | 'In Progress' | 'Completed';
    date?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  client: string;
  status: Status;
  priority: Priority;
  dueDate: string;
  budget: number;
  category: 'Design' | 'Repair' | 'Sublimation' | 'Development';
  stages: ProjectStage[]; 
  clientViewToken?: string; 
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Quote {
  id: string;
  clientName: string;
  clientEmail?: string;
  date: string;
  validUntil: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Paid' | 'Rejected';
  notes?: string;
  taxEnabled?: boolean;
}

export interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  balance: number;
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  paymentMethod: 'Cash' | 'Transfer' | 'QR' | 'Card';
  notes?: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  minStock: number;
  price: number;
  status: 'In Stock' | 'Low Stock' | 'Critical';
  lastUpdated: string;
  type?: 'Product' | 'Service';
  description?: string; 
  stock?: number; 
}

export interface AppSettings {
  // Dashboard & System
  companyName: string; 
  primaryColor: string;
  
  // PDF Specifics
  logoUrl?: string; 
  pdfSenderInfo: string; 
  pdfFooterText: string;
  pdfHeaderColor?: string; 
  
  // Contact info (fallback)
  address: string;
  website: string;
  phone: string;
  
  // Payment & Signature
  paymentInfo: string;
  qrCodeUrl?: string; 
  termsAndConditions: string;
  
  signatureName: string;
  signatureTitle: string;
  signatureUrl?: string; 

  // Finance Settings
  currencySymbol: string;
  currencyName: string;
  currencyPosition: 'before' | 'after';
  decimals: number;
  taxRate: number;
  taxName: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales' | 'Viewer';
  avatar?: string;
  active: boolean;
  password?: string;
  permissions?: string[]; // New: Granular permissions
}

export interface Category {
  id: string;
  name: string;
  type: 'Service' | 'Product';
}

export interface MessageThread {
  id: string;
  clientName: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  platform: 'WhatsApp' | 'Email';
  avatar?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'me' | 'client';
  timestamp: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
}
