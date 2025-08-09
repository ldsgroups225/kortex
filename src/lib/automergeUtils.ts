import { v4 as uuidv4 } from 'uuid'

/**
 * Utility functions for Automerge operations
 */
export const automergeUtils = {
  /**
   * Generate a unique ID for Automerge documents
   */
  generateId(): string {
    return uuidv4()
  },

  /**
   * Create a timestamp for document operations
   */
  now(): number {
    return Date.now()
  },

  /**
   * Validate document ID format
   */
  isValidId(id: string): boolean {
    // Basic UUID v4 validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  },

  /**
   * Generate a short readable ID for UI display
   */
  shortId(id: string): string {
    return id.split('-')[0]
  },

  /**
   * Create document metadata
   */
  createMetadata(title?: string, tags?: string[], status?: string) {
    return {
      title,
      tags,
      status,
    }
  },

  /**
   * Check if two arrays are equal (shallow comparison)
   */
  arraysEqual(a: any[], b: any[]): boolean {
    if (a.length !== b.length)
      return false
    return a.every((val, i) => val === b[i])
  },

  /**
   * Deep clone an object (for safe mutations)
   */
  deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj))
  },

  /**
   * Sanitize string for safe storage
   */
  sanitizeString(str: string): string {
    return str.trim().slice(0, 1000) // Limit length and trim whitespace
  },

  /**
   * Format timestamp for display
   */
  formatTimestamp(timestamp: number): string {
    return new Date(timestamp).toLocaleString()
  },

  /**
   * Get relative time string (e.g., "2 minutes ago")
   */
  getRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 0)
      return `${days} day${days === 1 ? '' : 's'} ago`
    if (hours > 0)
      return `${hours} hour${hours === 1 ? '' : 's'} ago`
    if (minutes > 0)
      return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
    return 'Just now'
  },

  /**
   * Extract text content from HTML (simple strip)
   */
  stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim()
  },

  /**
   * Truncate text to specified length with ellipsis
   */
  truncateText(text: string, maxLength: number = 100): string {
    if (text.length <= maxLength)
      return text
    return `${text.slice(0, maxLength - 3)}...`
  },

  /**
   * Validate and normalize tags
   */
  normalizeTags(tags: string[]): string[] {
    return tags
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .slice(0, 10) // Limit to 10 tags max
  },
}
