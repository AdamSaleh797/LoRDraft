// Empty object type
export type Empty = Record<string, never>

export enum StatusCode {
  OK = 'OK',
  UNKNOWN_USER = 'UNKNOWN_USER',
  LOGGED_IN = 'LOGGED_IN',
  NOT_LOGGED_IN = 'NOT_LOGGED_IN',
  INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
  MISSING_TOKEN = 'MISSING_TOKEN',
}

export interface OkStatusT {
  status: StatusCode.OK
}

export interface ErrStatusT {
  status: StatusCode
  message: string
}

export type Status = OkStatusT | ErrStatusT

export function MakeErrStatus(status: StatusCode, message: string): ErrStatusT {
  return {
    status: status,
    message: message,
  }
}

export const OkStatus: OkStatusT = { status: StatusCode.OK }

export function isOk(status: Status): status is OkStatusT {
  return status.status === StatusCode.OK
}
