// User types
export interface User {
    id: string
    email: string
    name: string
    avatar?: string | null
    specialization?: string | null
    contactNumber?: string | null
    isActive: boolean
    defaultWorkspaceId?: string | null
    createdAt: Date
}

// Workspace types
export interface Workspace {
    id: string
    name: string
    slug: string
    description?: string | null
    logo?: string | null
    ownerId: string
    createdAt: Date
    updatedAt: Date
}

export interface WorkspaceMember {
    id: string
    workspaceId: string
    userId: string
    role: WorkspaceRole
    createdAt: Date
    user?: User
    workspace?: Workspace
}

export type WorkspaceRole = 'ADMIN' | 'MANAGER' | 'MEMBER' | 'ASSISTANT' | 'INTERN'

// Case types
export interface Case {
    id: string
    caseNumber: string
    title: string
    description?: string | null
    caseCategory: CaseCategory
    caseType: string
    status: CaseStatus
    priority: Priority
    opposingParty?: string | null
    opposingCounsel?: string | null
    caseValue?: number | null
    filingDate: Date
    closedDate?: Date | null
    workspaceId: string
    mainCounselId?: string | null
    createdById: string
    courtId?: string | null
    clientId?: string | null
    createdAt: Date
    updatedAt: Date
}

export type CaseCategory = 'CIVIL' | 'CRIMINAL' | 'FAMILY' | 'CORPORATE' | 'TAX' | 'LABOR' | 'PROPERTY' | 'CONSUMER' | 'OTHER'
export type CaseStatus = 'ACTIVE' | 'PENDING' | 'CLOSED' | 'APPEALED' | 'DISMISSED' | 'SETTLED'
export type Priority = 'HIGH' | 'MEDIUM' | 'LOW'

// Hearing types
export interface Hearing {
    id: string
    caseId: string
    hearingDate: Date
    hearingTime?: string | null
    hearingType: HearingType
    status: HearingStatus
    description?: string | null
    judgeName?: string | null
    courtNumber: string
    courtItemNumber?: string | null
    notes?: string | null
    outcome?: string | null
    createdById: string
    hearingCounselId?: string | null
    createdAt: Date
    updatedAt: Date
}

export type HearingType = 'PRELIMINARY' | 'EVIDENCE' | 'ARGUMENT' | 'FINAL' | 'INTERIM' | 'MOTION' | 'OTHER'
export type HearingStatus = 'SCHEDULED' | 'COMPLETED' | 'POSTPONED' | 'CANCELLED'

// Task types
export interface Task {
    id: string
    title: string
    description?: string | null
    dueDate?: Date | null
    priority: Priority
    status: TaskStatus
    completedAt?: Date | null
    workspaceId: string
    caseId?: string | null
    assignedToId?: string | null
    createdByUserId: string
    createdAt: Date
    updatedAt: Date
}

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'UNDER_REVIEW' | 'COMPLETED' | 'OVERDUE'

// Client types
export interface Client {
    id: string
    name: string
    email?: string | null
    contactNumber?: string | null
    address?: string | null
    company?: string | null
    clientType: ClientType
    notes?: string | null
    workspaceId: string
    createdAt: Date
    updatedAt: Date
}

export type ClientType = 'INDIVIDUAL' | 'CORPORATE' | 'GOVERNMENT' | 'OTHER'

// Document types
export interface Document {
    id: string
    filename: string
    originalName: string
    fileUrl: string
    fileSize?: number | null
    mimeType?: string | null
    documentType: DocumentCategory
    version: number
    uploadedById: string
    caseId: string
    createdAt: Date
    updatedAt: Date
}

export type DocumentCategory = 'PLEADING' | 'EVIDENCE' | 'CORRESPONDENCE' | 'CONTRACT' | 'ORDER' | 'JUDGMENT' | 'OTHER'

// Court types
export interface Court {
    id: string
    courtName: string
    courtType: CourtType
    address?: string | null
    city?: string | null
    state?: string | null
    createdAt: Date
    updatedAt: Date
}

export type CourtType = 'DISTRICT' | 'HIGH' | 'SUPREME' | 'TRIBUNAL' | 'FAMILY' | 'CONSUMER' | 'OTHER'

// Invoice types
export interface Invoice {
    id: string
    invoiceNumber: string
    issueDate: Date
    dueDate: Date
    totalAmount: number
    paidAmount: number
    status: InvoiceStatus
    notes?: string | null
    workspaceId: string
    caseId?: string | null
    clientId?: string | null
    createdById: string
    createdAt: Date
    updatedAt: Date
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'OVERDUE' | 'CANCELLED'

// Notification types
export interface Notification {
    id: string
    userId: string
    type: NotificationType
    title: string
    message: string
    link?: string | null
    read: boolean
    createdAt: Date
}

export type NotificationType = 'INVITATION' | 'CASE_UPDATE' | 'HEARING_REMINDER' | 'TASK_ASSIGNED' | 'TASK_DUE' | 'GENERAL' | 'WORKSPACE_EVENT'

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
    message?: string
}

export interface PaginatedResponse<T> {
    items: T[]
    total: number
    page: number
    limit: number
    totalPages: number
}

// Dashboard stats
export interface DashboardStats {
    totalCases: number
    activeCases: number
    pendingCases: number
    closedCases: number
    upcomingHearings: number
    overdueTs: number
    totalDocuments: number
    totalClients: number
}
