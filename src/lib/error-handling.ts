/**
 * Standardized error handling utilities for CheckingCheckout
 * Provides consistent error handling patterns across the application
 */

import { PostgrestError } from "@supabase/supabase-js";
import { logger } from "./logger";

/**
 * Standard error types
 */
export interface AppError {
	message: string;
	code?: string;
	statusCode?: number;
	originalError?: unknown;
}

/**
 * Check if error is a Supabase PostgrestError
 */
export function isPostgrestError(error: unknown): error is PostgrestError {
	return (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		"message" in error &&
		"details" in error
	);
}

/**
 * Check if error is a standard Error object
 */
export function isError(error: unknown): error is Error {
	return error instanceof Error;
}

/**
 * Extract user-friendly error message from various error types
 */
export function getErrorMessage(error: unknown): string {
	if (isError(error)) {
		return error.message;
	}

	if (isPostgrestError(error)) {
		// Handle common Supabase error codes
		switch (error.code) {
			case "PGRST116":
				return "No data found";
			case "23505":
				return "This record already exists";
			case "23503":
				return "Referenced record does not exist";
			case "42501":
				return "You don't have permission to perform this action";
			default:
				return error.message || "Database error occurred";
		}
	}

	if (typeof error === "string") {
		return error;
	}

	if (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof (error as { message: unknown }).message === "string"
	) {
		return (error as { message: string }).message;
	}

	return "An unexpected error occurred";
}

/**
 * Extract error code from various error types
 */
export function getErrorCode(error: unknown): string | undefined {
	if (isPostgrestError(error)) {
		return error.code;
	}

	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		typeof (error as { code: unknown }).code === "string"
	) {
		return (error as { code: string }).code;
	}

	return undefined;
}

/**
 * Check if error is a permissions/RLS error
 */
export function isPermissionError(error: unknown): boolean {
	if (isPostgrestError(error)) {
		return error.code === "42501" || error.message?.includes("permission");
	}

	const message = getErrorMessage(error).toLowerCase();
	return message.includes("permission") || message.includes("unauthorized");
}

/**
 * Check if error is a "not found" error
 */
export function isNotFoundError(error: unknown): boolean {
	if (isPostgrestError(error)) {
		return error.code === "PGRST116";
	}

	const message = getErrorMessage(error).toLowerCase();
	return (
		message.includes("not found") ||
		message.includes("does not exist") ||
		message.includes("no data")
	);
}

/**
 * Standardized error handler for Supabase queries
 * Logs error and returns standardized error object
 */
export function handleSupabaseError(
	error: unknown,
	context?: string,
): AppError {
	const message = getErrorMessage(error);
	const code = getErrorCode(error);

	if (context) {
		logger.error(`Error in ${context}`, error);
	} else {
		logger.error("Supabase error", error);
	}

	return {
		message,
		code,
		originalError: error,
	};
}

/**
 * Handle RLS policy errors gracefully
 */
export function handleRLSError(error: unknown): AppError {
	if (isPermissionError(error)) {
		return {
			message: "You don't have permission to access this resource",
			code: "PERMISSION_DENIED",
			originalError: error,
		};
	}

	return handleSupabaseError(error, "RLS check");
}

/**
 * Create a user-friendly error message for display
 */
export function getUserFriendlyError(error: unknown): string {
	if (isPermissionError(error)) {
		return "You don't have permission to perform this action. Please contact your administrator if you believe this is an error.";
	}

	if (isNotFoundError(error)) {
		return "The requested resource was not found.";
	}

	return getErrorMessage(error);
}
