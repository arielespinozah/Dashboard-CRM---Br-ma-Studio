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
  taxEnabled?: boolean; // New field to persist state
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
  amountPaid: number; // For partial payments
  balance: number; // Remaining amount
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
  type?: 'Product' | 'Service'; // Added type for catalog filtering
}

export interface AppSettings {
  companyName: string;
  address: string;
  website: string;
  phone: string;
  primaryColor: string;
  logoUrl?: string;
  qrCodeUrl?: string;
  paymentInfo: string;
  termsAndConditions: string;
  
  // Finance Settings
  currencySymbol: string; // e.g., "Bs", "$", "€"
  currencyName: string;   // e.g., "Bolivianos"
  currencyPosition: 'before' | 'after'; // "$ 100" vs "100 €"
  decimals: number;       // 0 or 2
  taxRate: number;        // e.g., 13, 16, 21
  taxName: string;        // e.g., "IVA", "RUT", "IGV", "TAX"
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales' | 'Viewer';
  avatar?: string;
  active: boolean;
  password?: string; // In a real app, this would be hashed
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