// lib/logger.ts
// ponytail: thin console wrapper + sentry plug point. No DI, no transports, no levels config.

type LogContext = Record<string, unknown> | undefined;
type SentryCallback = (level: string, message: string, context?: LogContext, error?: unknown) => void;

let sentryEnabled = false;
let sentryCallback: SentryCallback | null = null;

export function setSentryEnabled(enabled: boolean, cb?: SentryCallback) {
  sentryEnabled = enabled;
  if (cb) sentryCallback = cb;
}

function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

function formatContext(ctx: LogContext): string {
  if (!ctx || Object.keys(ctx).length === 0) return '';
  try { return ` ${JSON.stringify(ctx)}`; } catch { return ''; }
}

function notifySentry(level: string, message: string, context?: LogContext, error?: unknown) {
  if (sentryEnabled && sentryCallback) {
    sentryCallback(level, message, context, error);
  }
}

export const logger = {
  debug(name: string, message: string, context?: LogContext) {
    if (__DEV__) {
      console.debug(`🔍 [${timestamp()}] [${name}] ${message}${formatContext(context)}`);
    }
  },

  info(name: string, message: string, context?: LogContext) {
    if (__DEV__) {
      console.info(`ℹ️ [${timestamp()}] [${name}] ${message}${formatContext(context)}`);
    }
  },

  warn(name: string, message: string, context?: LogContext, error?: unknown) {
    console.warn(`⚠️ [${timestamp()}] [${name}] ${message}${formatContext(context)}`);
    notifySentry('warn', message, context, error);
  },

  error(name: string, message: string, context?: LogContext, error?: unknown) {
    console.error(`🚨 [${timestamp()}] [${name}] ${message}${formatContext(context)}`);
    notifySentry('error', message, context, error);
  },
};
