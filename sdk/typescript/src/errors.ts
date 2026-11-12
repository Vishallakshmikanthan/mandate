/**
 * Mandate TypeScript SDK - Error Classes
 */

export class MandateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MandateError";
  }
}

export class IntentBlockedError extends MandateError {
  public reasons: string[];
  public riskScore: number;

  constructor(message: string, reasons: string[], riskScore: number) {
    super(message);
    this.name = "IntentBlockedError";
    this.reasons = reasons;
    this.riskScore = riskScore;
  }
}

export class AuthenticationError extends MandateError {
  constructor(message = "Invalid or expired Mandate API Key.") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class PermissionDeniedError extends MandateError {
  constructor(message: string) {
    super(message);
    this.name = "PermissionDeniedError";
  }
}

export class ResourceNotFoundError extends MandateError {
  constructor(message: string) {
    super(message);
    this.name = "ResourceNotFoundError";
  }
}

