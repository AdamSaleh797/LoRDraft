export enum StatusCode {
  OK = 'OK',

  // Generic errors.
  INVALID_CLIENT_REQ = 'INVALID_CLIENT_REQ',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INCORRECT_MESSAGE_ARGUMENTS = 'INCORRECT_MESSAGE_ARGUMENTS',
  THROTTLE = 'THROTTLE',
  INVALID_ARGUMENTS = 'INVALID_ARGUMENTS',

  // Authentication errors.
  UNKNOWN_USER = 'UNKNOWN_USER',
  NOT_LOGGED_IN = 'NOT_LOGGED_IN',
  INCORRECT_PASSWORD = 'INCORRECT_PASSWORD',
  INVALID_TOKEN = 'INVALID_TOKEN',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',

  // Internal file io errors
  UNZIP_ERROR = 'UNZIP_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_CP_ERROR = 'FILE_CP_ERROR',
  FILE_RM_ERROR = 'FILE_RM_ERROR',

  // Internal child process errors.
  CHILD_PROCESS_EXEC_ERROR = 'CHILD_PROCESS_EXEC_ERROR',

  // Generic error for failure to update the set packs.
  UPDATE_ASSET_ERROR = 'UPDATE_ASSET_ERROR',
  SET_PACK_UPDATE_ERROR = 'SET_PACK_UPDATE_ERROR',
  MISSING_RUNETERRAN_CHAMP = 'MISSING_RUNETERRAN_CHAMP',
  INVALID_SET_PACK_FORMAT = 'INVALID_SET_PACK_FORMAT',

  // Generic error when retrieving a Card, used to mask internal errors.
  RETRIEVE_CARD_ERROR = 'RETRIEVE_CARD_ERROR',
  UNKNOWN_CARD = 'UNKNOWN_CARD',
  MAX_REDRAWS_EXCEEDED = 'MAX_REDRAWS_EXCEEDED',

  // Async socket errors
  MESSAGE_TIMEOUT = 'MESSAGE_TIMEOUT',

  // Draft state errors
  NOT_IN_DRAFT_SESSION = 'NOT_IN_DRAFT_SESSION',
  ALREADY_IN_DRAFT_SESSION = 'ALREADY_IN_DRAFT_SESSION',
  DRAFT_COMPLETE = 'DRAFT_COMPLETE',
  NOT_WAITING_FOR_CARD_SELECTION = 'NOT_WAITING_FOR_CARD_SELECTION',
  NOT_PENDING_CARD = 'NOT_PENDING_CARD',
  INCORRECT_NUM_CHOSEN_CARDS = 'INCORRECT_NUM_CHOSEN_CARDS',
  ILLEGAL_CARD_COMBINATION = 'ILLEGAL_CARD_COMBINATION',
}

export interface OkStatusT<T = null> {
  status: StatusCode.OK
  value: T
}

export type ErrStatusCode = Exclude<StatusCode, StatusCode.OK>

export interface ErrStatusT {
  status: ErrStatusCode
  message: string
  from_statuses?: ErrStatusT[]
}

export type Status<T = null> = OkStatusT<T> | ErrStatusT

export function makeErrStatus(
  status: ErrStatusCode,
  message: string,
  from_statuses?: ErrStatusT[]
): ErrStatusT {
  return {
    status: status,
    message: message,
    from_statuses: from_statuses,
  }
}

export function withSubStatuses(
  status: ErrStatusT,
  from_statuses: ErrStatusT[]
): ErrStatusT {
  return makeErrStatus(
    status.status,
    status.message,
    status.from_statuses?.concat(from_statuses) ?? from_statuses
  )
}

export function statusFromError<E extends Error, T>(
  error: E | null,
  code: ErrStatusCode,
  value_on_success: T
): Status<T> {
  return error === null
    ? makeOkStatus<T>(value_on_success)
    : makeErrStatus(code, error.message)
}

export const OkStatus: OkStatusT = { status: StatusCode.OK, value: null }

export function makeOkStatus<T>(value: T): OkStatusT<T> {
  return {
    status: StatusCode.OK,
    value: value,
  }
}

export function isOk<T>(status: Status<T>): status is OkStatusT<T> {
  return status.status === StatusCode.OK
}

export function isInternalError(status: ErrStatusT): boolean {
  switch (status.status) {
    case StatusCode.UNZIP_ERROR:
    case StatusCode.FILE_ERROR:
    case StatusCode.FILE_READ_ERROR:
    case StatusCode.FILE_CP_ERROR:
    case StatusCode.FILE_RM_ERROR:
    case StatusCode.CHILD_PROCESS_EXEC_ERROR:
    case StatusCode.SET_PACK_UPDATE_ERROR:
      return true
    default:
      return false
  }
}

export function statusSanitizeError<T extends Status>(
  status: T,
  sanitized_code: ErrStatusCode,
  sanitized_message: string
): T | ErrStatusT {
  if (!isOk(status) && isInternalError(status)) {
    return makeErrStatus(sanitized_code, sanitized_message)
  } else {
    return status
  }
}
