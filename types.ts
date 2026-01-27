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
}

export interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  items: QuoteItem[];
  subtotal: number;
  total: number;
  amountPaid: number; // For partial payments
  balance: number; // Remaining amount
  paymentStatus: 'Pending' | 'Partial' | 'Paid';
  paymentMethod: 'Cash' | 'Transfer' | 'QR' | 'Card';
  notes?: string;
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales' | 'Viewer';
  avatar?: string;
  active: boolean;
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