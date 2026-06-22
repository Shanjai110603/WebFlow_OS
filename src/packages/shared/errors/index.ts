export class WebLensError extends Error {
  constructor(public code: string, message: string, public context?: Record<string, unknown>) {
    super(message);
    this.name = 'WebLensError';
    // Ensure correct prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ScanError extends WebLensError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('SCAN_FAILED', message, context);
    this.name = 'ScanError';
  }
}

export class StorageError extends WebLensError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('STORAGE_CORRUPTED', message, context);
    this.name = 'StorageError';
  }
}

export class MessagingError extends WebLensError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('MESSAGING_TIMEOUT', message, context);
    this.name = 'MessagingError';
  }
}

export class ExportError extends WebLensError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('EXPORT_FAILED', message, context);
    this.name = 'ExportError';
  }
}

export class HighlightError extends WebLensError {
  constructor(message: string, context?: Record<string, unknown>) {
    super('HIGHLIGHT_FAILED', message, context);
    this.name = 'HighlightError';
  }
}
