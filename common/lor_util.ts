import { v4 as uuidv4 } from 'uuid'

// Empty object type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Empty = Record<any, never>

export enum StatusCode {
  OK = 'OK',
  UNKNOWN_USER = 'UNKNOWN_USER',
  LOGGED_IN = 'LOGGED_IN',
  NOT_LOGGED_IN = 'NOT_LOGGED_IN',
  INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
  INVALID_TOKEN = 'INVALID_TOKEN',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
}

export interface OkStatusT {
  status: StatusCode.OK
}

export interface ErrStatusT {
  status: StatusCode
  message: string
}

export type Status = OkStatusT | ErrStatusT

export function MakeErrStatus(
  status: Exclude<StatusCode, StatusCode.OK>,
  message: string
): ErrStatusT {
  return {
    status: status,
    message: message,
  }
}

export const OkStatus: OkStatusT = { status: StatusCode.OK }

export function isOk(status: Status): status is OkStatusT {
  return status.status === StatusCode.OK
}

export function gen_uuid(): string {
  return uuidv4()
}

export function randChoice<T>(arr : T[]) : T {
  return arr[Math.floor(Math.random() * arr.length)]
}
