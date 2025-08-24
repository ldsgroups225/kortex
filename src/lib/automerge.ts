import * as Automerge from '@automerge/automerge'
import { v4 as uuidv4 } from 'uuid'

// Document types for Kortex
export type KortexDocumentType = 'note' | 'snippet' | 'todo' | 'workspace'

// Base document structure
export interface BaseDocument {
  id: string
  type: KortexDocumentType
  userId: string
  createdAt: number
  updatedAt: number
}

// Specific document interfaces
export interface NoteDocument extends BaseDocument {
  type: 'note'
  title: string
  content: string
  tags: string[]
  pinned: boolean
}

export interface SnippetDocument extends BaseDocument {
  type: 'snippet'
  title: string
  content: string
  language: string
  category: string
  pinned: boolean
}

export interface TodoDocument extends BaseDocument {
  type: 'todo'
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'done'
  tags: string[]
  assignedToUserId?: string
  dueDate?: number
}

export interface WorkspaceDocument extends BaseDocument {
  type: 'workspace'
  name: string
  description: string
  noteIds: string[]
  snippetIds: string[]
  todoIds: string[]
}

export type KortexDocument = NoteDocument | SnippetDocument | TodoDocument | WorkspaceDocument

// Document manager class
export class AutomergeDocumentManager {
  private documents = new Map<string, Automerge.Doc<KortexDocument>>()
  private userId: string

  constructor(userId: string) {
    this.userId = userId
  }

  // Create a new document
  createDocument<T extends KortexDocument>(
    type: KortexDocumentType,
    initialData: Partial<T>,
  ): { doc: Automerge.Doc<T>, id: string } {
    const id = uuidv4()
    const now = Date.now()

    let doc = Automerge.init<T>()
    doc = Automerge.change(doc, (draft) => {
      Object.assign(draft, {
        id,
        type,
        userId: this.userId,
        createdAt: now,
        updatedAt: now,
        ...initialData,
      })
    })

    this.documents.set(id, doc as Automerge.Doc<KortexDocument>)
    return { doc, id }
  }

  // Get a document by ID
  getDocument<T extends KortexDocument>(id: string): Automerge.Doc<T> | null {
    const doc = this.documents.get(id)
    return doc ? (doc as Automerge.Doc<T>) : null
  }

  // Update a document
  updateDocument<T extends KortexDocument>(
    id: string,
    updateFn: (draft: T) => void,
  ): Automerge.Doc<T> | null {
    const doc = this.getDocument<T>(id)
    if (!doc)
      return null

    const updatedDoc = Automerge.change(doc, (draft) => {
      draft.updatedAt = Date.now()
      updateFn(draft)
    })

    this.documents.set(id, updatedDoc as Automerge.Doc<KortexDocument>)
    return updatedDoc
  }

  // Delete a document
  deleteDocument(id: string): boolean {
    return this.documents.delete(id)
  }

  // Get all documents of a specific type
  getDocumentsByType<T extends KortexDocument>(type: KortexDocumentType): T[] {
    return Array.from(this.documents.values())
      .map(doc => doc as T)
      .filter(doc => doc.type === type)
  }

  // Save document to binary format
  saveDocument(id: string): Uint8Array | null {
    const doc = this.documents.get(id)
    return doc ? Automerge.save(doc) : null
  }

  // Load document from binary format
  loadDocument(id: string, binary: Uint8Array): void {
    const doc = Automerge.load<KortexDocument>(binary)
    this.documents.set(id, doc)
  }

  // Get changes since a specific state
  getChangesSince(id: string, _heads: Automerge.Heads): Uint8Array | null {
    const doc = this.documents.get(id)
    if (!doc)
      return null

    return Automerge.saveIncremental(doc)
  }

  // Apply changes to a document
  applyChanges(id: string, changes: Uint8Array): boolean {
    try {
      const doc = this.documents.get(id)
      if (!doc)
        return false

      const updatedDoc = Automerge.loadIncremental(doc, changes)
      this.documents.set(id, updatedDoc)
      return true
    }
    catch (error) {
      console.error('Failed to apply changes:', error)
      return false
    }
  }

  // Merge documents (for conflict resolution)
  mergeDocuments(id: string, otherDoc: Automerge.Doc<KortexDocument>): boolean {
    try {
      const doc = this.documents.get(id)
      if (!doc)
        return false

      const mergedDoc = Automerge.merge(doc, otherDoc)
      this.documents.set(id, mergedDoc)
      return true
    }
    catch (error) {
      console.error('Failed to merge documents:', error)
      return false
    }
  }

  // Get document heads (for sync tracking)
  getHeads(id: string): Automerge.Heads | null {
    const doc = this.documents.get(id)
    return doc ? Automerge.getHeads(doc) : null
  }

  // Clone document (for forking/branching)
  cloneDocument(id: string, newId?: string): string | null {
    const doc = this.documents.get(id)
    if (!doc)
      return null

    const clonedId = newId || uuidv4()
    const clonedDoc = Automerge.clone(doc)

    const updatedClone = Automerge.change(clonedDoc, (draft) => {
      draft.id = clonedId
      draft.updatedAt = Date.now()
    })

    this.documents.set(clonedId, updatedClone)
    return clonedId
  }

  // Get all document IDs
  getAllDocumentIds(): string[] {
    return Array.from(this.documents.keys())
  }

  // Clear all documents
  clear(): void {
    this.documents.clear()
  }
}

// Storage utilities for persistence
export class AutomergeStorage {
  private static STORAGE_PREFIX = 'kortex-automerge-'

  // Save document to localStorage
  static saveToLocalStorage(id: string, binary: Uint8Array): void {
    try {
      const key = `${this.STORAGE_PREFIX}${id}`
      const base64 = btoa(String.fromCharCode(...binary))
      localStorage.setItem(key, base64)
    }
    catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }

  // Load document from localStorage
  static loadFromLocalStorage(id: string): Uint8Array | null {
    try {
      const key = `${this.STORAGE_PREFIX}${id}`
      const base64 = localStorage.getItem(key)
      if (!base64)
        return null

      const binaryString = atob(base64)
      return new Uint8Array([...binaryString].map(char => char.charCodeAt(0)))
    }
    catch (error) {
      console.error('Failed to load from localStorage:', error)
      return null
    }
  }

  // Remove document from localStorage
  static removeFromLocalStorage(id: string): void {
    try {
      const key = `${this.STORAGE_PREFIX}${id}`
      localStorage.removeItem(key)
    }
    catch (error) {
      console.error('Failed to remove from localStorage:', error)
    }
  }

  // Get all stored document IDs
  static getAllStoredIds(): string[] {
    const ids: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(this.STORAGE_PREFIX)) {
        ids.push(key.slice(this.STORAGE_PREFIX.length))
      }
    }
    return ids
  }

  // Clear all stored documents
  static clearAll(): void {
    const keys = this.getAllStoredIds().map(id => `${this.STORAGE_PREFIX}${id}`)
    keys.forEach(key => localStorage.removeItem(key))
  }
}
