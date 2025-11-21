/**
 * Centralized logging utility for CheckingCheckout
 * Provides environment-aware logging with different log levels
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
	[key: string]: unknown;
}

class Logger {
	private isDevelopment: boolean;

	constructor() {
		this.isDevelopment = import.meta.env.DEV;
	}

	/**
	 * Debug logs - only shown in development
	 */
	debug(message: string, ...args: unknown[]): void {
		if (this.isDevelopment) {
			console.log("[DEBUG]", message, ...args);
		}
	}

	/**
	 * Info logs - shown in all environments
	 */
	info(message: string, ...args: unknown[]): void {
		console.info("[INFO]", message, ...args);
	}

	/**
	 * Warning logs - shown in all environments
	 */
	warn(message: string, ...args: unknown[]): void {
		console.warn("[WARN]", message, ...args);
	}

	/**
	 * Error logs - shown in all environments
	 * TODO: Integrate with error tracking service (Sentry, etc.)
	 */
	error(message: string, error?: Error | unknown, ...args: unknown[]): void {
		console.error("[ERROR]", message, error, ...args);

		// In production, you might want to send to error tracking service
		if (!this.isDevelopment && error instanceof Error) {
			// TODO: Send to error tracking service
			// Example: Sentry.captureException(error, { extra: { message, ...args } });
		}
	}

	/**
	 * Log with context object for structured logging
	 */
	logWithContext(
		level: LogLevel,
		message: string,
		context?: LogContext,
		...args: unknown[]
	): void {
		const logMessage = context
			? `${message} ${JSON.stringify(context)}`
			: message;

		switch (level) {
			case "debug":
				this.debug(logMessage, ...args);
				break;
			case "info":
				this.info(logMessage, ...args);
				break;
			case "warn":
				this.warn(logMessage, ...args);
				break;
			case "error":
				this.error(logMessage, ...args);
				break;
		}
	}
}

export const logger = new Logger();
