
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

export interface AuditLog {
    id: string;
    action: 'Create' | 'Update' | 'Delete' | 'Login';
    module: 'Sales' | 'Quotes' | 'Inventory' | 'Finance' | 'Projects' | 'Clients';
    description: string;
    user: string;
    role: string;
    timestamp: string;
    metadata?: string; // Stores deleted amount, client name, etc. for evidence
}

export interface Client {
  id: string;
  name: string;
  company: string;
  nit?: string; // Added NIT
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
  discount: number; // Percentage
  tax: number;
  total: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Paid' | 'Rejected';
  notes?: string;
  taxEnabled?: boolean;
  termsAndConditions?: string; // New field for custom terms
}

export interface Sale {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  items: QuoteItem[];
  subtotal: number;
  discount?: number; // Added discount field
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
  price: number; // Unit Price
  priceDozen?: number; // Price per unit when buying dozen
  priceBox?: number; // Price per unit when buying 4 dozen
  priceWholesale?: number; // Price per unit for wholesale
  status: 'In Stock' | 'Low Stock' | 'Critical';
  lastUpdated: string;
  type?: 'Product' | 'Service';
  description?: string; 
  stock?: number; 
}

export interface AppSettings {
  // Dashboard & System
  companyName: string; 
  primaryColor: string; // Used for Dashboard Main Actions & Sidebar Active
  secondaryColor?: string; // Used for Accents & Icons
  systemLogoUrl?: string; // LOGO FOR LOGIN & SIDEBAR (Colored)
  
  // PDF Specifics
  logoUrl?: string; // LOGO FOR PDF (White/Document version)
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
  taxIdLabel?: string; // Custom label for NIT/RUC/CI
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Sales' | 'Viewer';
  avatar?: string;
  active: boolean;
  password?: string;
  permissions?: string[]; 
  // Permissions List: 'view_dashboard', 'view_finance', 'view_sales', 'view_quotes', 'view_projects', 'view_inventory', 'view_clients', 'view_calendar', 'view_reports', 'manage_settings'
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

// Finance Types
export interface CashTransaction {
    id: string;
    description: string;
    amount: number;
    type: 'Income' | 'Expense';
    category: 'Sale' | 'Supply' | 'Service' | 'Other';
    date: string;
    user: string;
}

export interface CashShift {
    id: string;
    openDate: string;
    closeDate?: string;
    openedBy: string;
    initialAmount: number;
    finalAmount?: number;
    systemCalculatedAmount?: number;
    difference?: number;
    status: 'Open' | 'Closed';
    transactions: CashTransaction[];
    notes?: string;
}

// Calendar Types
export interface CalendarEvent {
    id: string;
    title: string;
    date: string; // ISO Date String YYYY-MM-DD
    type: 'Project' | 'Meeting' | 'Reminder' | 'Other';
    description?: string;
    time?: string;
    // New Robust Fields
    priority?: 'Low' | 'Medium' | 'High';
    linkedClientId?: string;
    linkedClientName?: string;
    linkedProjectId?: string;
    linkedProjectTitle?: string;
}

export interface AuthContextType {
  user: User | null;
  login: (email: string) => void;
  logout: () => void;
}
