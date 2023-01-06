import { Record } from 'runtypes'
import { Static } from 'runtypes/lib/runtype'
import { v4 as uuidv4 } from 'uuid'

// Empty object type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Empty = Record<any, never>

export enum StatusCode {
  OK = 'OK',

  // Generic errors.
  INVALID_CLIENT_REQ = 'INVALID_CLIENT_REQ',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

  // Authentication errors.
  UNKNOWN_USER = 'UNKNOWN_USER',
  LOGGED_IN = 'LOGGED_IN',
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
  SET_PACK_UPDATE_ERROR = 'SET_PACK_UPDATE_ERROR',

  // Generic error when retrieving a Card, used to mask internal errors.
  RETRIEVE_CARD_ERROR = 'RETRIEVE_CARD_ERROR',
  UNKNOWN_CARD = 'UNKNOWN_CARD',

  // Async socket errors
  MESSAGE_TIMEOUT = 'MESSAGE_TIMEOUT',

  // Draft state errors
  NOT_IN_DRAFT_SESSION = 'NOT_IN_DRAFT_SESSION',
  ALREADY_IN_DRAFT_SESSION = 'ALREADY_IN_DRAFT_SESSION',
}

export interface OkStatusT {
  status: StatusCode.OK
}

export type ErrStatusCode = Exclude<StatusCode, StatusCode.OK>

export interface ErrStatusT {
  status: ErrStatusCode
  message: string
  from_statuses?: ErrStatusT[]
}

export type Status = OkStatusT | ErrStatusT

export function MakeErrStatus(
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

export function StatusFromError<E extends Error>(
  error: E | null,
  code: ErrStatusCode
): Status {
  return error === null ? OkStatus : MakeErrStatus(code, error.message)
}

export const OkStatus: OkStatusT = { status: StatusCode.OK }

export function isOk(status: Status): status is OkStatusT {
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
    return MakeErrStatus(sanitized_code, sanitized_message)
  } else {
    return status
  }
}

export function rejectedResults(
  promise_results: PromiseSettledResult<unknown>[]
): PromiseRejectedResult[] {
  return promise_results.filter(
    (result: PromiseSettledResult<unknown>): result is PromiseRejectedResult =>
      result.status === 'rejected'
  )
}

export function rejectedResultReasons<T>(
  promise_results: PromiseSettledResult<unknown>[]
): T[] {
  return rejectedResults(promise_results).map((res) => res.reason)
}

export function allFullfilled<T>(
  promise_results: PromiseSettledResult<T>[]
): promise_results is PromiseFulfilledResult<T>[] {
  return ((
    err_list: PromiseRejectedResult[],
    promise_results: PromiseSettledResult<T>[]
  ): promise_results is PromiseFulfilledResult<T>[] => err_list.length === 0)(
    rejectedResults(promise_results),
    promise_results
  )
}

export function gen_uuid(): string {
  return uuidv4()
}

export function randChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Randomly sample `samples` elements from `arr` without replacement.
 * @param arr The array to sample from.
 * @param samples The number of elements to sample.
 *
 * @return A list of the randomly sampled elements of `arr`.
 */
export function randSample<T>(arr: T[], samples: number): T[] {
  if (samples > arr.length) {
    return []
  }

  const sample_idx = new Array<number>(samples).fill(-1)

  sample_idx.forEach((_1, idx, self) => {
    let rand_idx
    do {
      rand_idx = Math.floor(Math.random() * arr.length)
    } while (self.includes(rand_idx))
    self[idx] = rand_idx
  })

  return sample_idx.map((idx) => arr[idx])
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function narrowType<T extends Record<any, false>>(
  type: T,
  obj: object
): Static<T> | null {
  const optional_type = type.asPartial()
  const res: Static<typeof optional_type> = {}

  for (const [key, val] of Object.entries(obj)) {
    const partial_obj = {
      [key]: val,
    }
    if (!optional_type.guard(partial_obj)) {
      return null
    }

    res[key] = val
  }

  return res as Static<T>
}
