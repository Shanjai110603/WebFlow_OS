import { CommandMap, CommandResponse } from '../../shared/types';
import { PayloadValidators } from '../../shared/schemas';

export class MessageClient {
  public static async send<K extends keyof CommandMap>(
    type: K,
    payload: CommandMap[K]['payload'],
    timeoutMs?: number
  ): Promise<CommandResponse<any>> {
    // 1. Validate payload before sending
    const validator = PayloadValidators[type];
    if (validator) {
      const parseResult = validator.safeParse(payload);
      if (!parseResult.success) {
        return {
          success: false,
          error: {
            code: 'INVALID_PAYLOAD',
            message: 'Payload validation checks failed.',
            context: { errors: parseResult.error.format() }
          }
        };
      }
    }

    // 2. Resolve timeout thresholds
    const defaultTimeout = (type === 'RUN_AUDIT' || type === 'APPLY_FIXER_SETTINGS' || type === 'HIGHLIGHT_ISSUE' || type === 'CLEAR_HIGHLIGHT') 
      ? 5000 
      : 3000;
    const finalTimeout = timeoutMs || defaultTimeout;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          error: {
            code: 'MESSAGING_TIMEOUT',
            message: `Messaging timeout exceeded (${finalTimeout}ms) for command ${type}.`
          }
        });
      }, finalTimeout);

      try {
        chrome.runtime.sendMessage({ type, payload }, (response: CommandResponse<any>) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: {
                code: 'CONTENT_SCRIPT_UNAVAILABLE',
                message: chrome.runtime.lastError.message || 'Messaging channel closed.'
              }
            });
          } else if (response) {
            resolve(response);
          } else {
            resolve({
              success: false,
              error: {
                code: 'SCAN_FAILED',
                message: 'No response returned from the messaging channel.'
              }
            });
          }
        });
      } catch (err: any) {
        clearTimeout(timer);
        resolve({
          success: false,
          error: {
            code: 'SCAN_FAILED',
            message: err.message || 'Messaging exception occurred.'
          }
        });
      }
    });
  }

  public static async sendToTab(
    tabId: number,
    type: string,
    payload: any,
    timeoutMs: number = 5000
  ): Promise<CommandResponse<any> > {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        resolve({
          success: false,
          error: {
            code: 'MESSAGING_TIMEOUT',
            message: `Tab messaging timeout exceeded (${timeoutMs}ms) for command ${type}.`
          }
        });
      }, timeoutMs);

      try {
        chrome.tabs.sendMessage(tabId, { type, payload }, (response) => {
          clearTimeout(timer);
          if (chrome.runtime.lastError) {
            resolve({
              success: false,
              error: {
                code: 'CONTENT_SCRIPT_UNAVAILABLE',
                message: 'Content script unavailable. Try reloading the tab.'
              }
            });
          } else if (response) {
            resolve(response);
          } else {
            resolve({
              success: false,
              error: {
                code: 'SCAN_FAILED',
                message: 'No response returned from target content script.'
              }
            });
          }
        });
      } catch (err: any) {
        clearTimeout(timer);
        resolve({
          success: false,
          error: {
            code: 'SCAN_FAILED',
            message: err.message || 'Tab messaging exception occurred.'
          }
        });
      }
    });
  }
}
