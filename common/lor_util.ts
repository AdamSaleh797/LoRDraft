import { Record } from 'runtypes'
import { Runtype, Static } from 'runtypes/lib/runtype'
import { v4 as uuidv4 } from 'uuid'

// Empty object type
export type Empty = Record<any, never>

export enum StatusCode {
  OK = 'OK',

  // Generic errors.
  INVALID_CLIENT_REQ = 'INVALID_CLIENT_REQ',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  INCORRECT_MESSAGE_ARGUMENTS = 'INCORRECT_MESSAGE_ARGUMENTS',

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

export function statusFromError<E extends Error>(
  error: E | null,
  code: ErrStatusCode
): Status {
  return error === null ? OkStatus : makeErrStatus(code, error.message)
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
    return makeErrStatus(sanitized_code, sanitized_message)
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

export function randChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

/**
 * Randomly sample `samples` elements from `arr` without replacement.
 * @param arr The array to sample from.
 * @param samples The number of elements to sample.
 *
 * @return A list of the randomly sampled elements of `arr`.
 */
export function randSample<T>(arr: readonly T[], samples: number): T[] {
  return randSampleNumbers(arr.length, samples).map((idx) => arr[idx])
}

/**
 *
 * @param size The number of numbers to choose from.
 * @param samples The number of samples to take. This cannot exceed `size`.
 * @returns A list of numbers sampled randomly from [0, size) with no repeats.
 */
export function randSampleNumbers(size: number, samples: number): number[] {
  if (samples > size) {
    return []
  }

  const sample_idx = new Array<number>(samples).fill(-1)

  sample_idx.forEach((_1, idx, self) => {
    let rand_idx
    do {
      rand_idx = Math.floor(Math.random() * size)
    } while (self.includes(rand_idx))
    self[idx] = rand_idx
  })

  return sample_idx
}

/**
 * Narrows an object to include only fields of the type `type`, discarding the other fields.
 * @param type
 * @param obj
 * @returns
 */
export function narrowType<T extends Record<any, false>, U extends Static<T>>(
  type: T,
  obj: U
): Static<T> | null {
  const res: Static<T> = {}
  console.log(Object.keys(type.fields))

  for (const [key, runtype] of Object.entries<Runtype>(type.fields)) {
    const val = obj[key]
    if (!runtype.guard(val)) {
      return null
    }

    if (val !== undefined) {
      res[key as keyof Static<T>] = val as any
    }
  }

  return res as Static<T>
}

/**
 * Binary searches through `arr` for `el`, assuming `arr` is sorted in
 * increasing order.
 *
 * @param arr The array of elements to search through.
 * @param el The element to search for
 *
 * @return The index of `el` in `arr`, or the index of the largest element less
 * than or equal to `el`, or `-1` if `el` is smaller than the smallest element
 * of `arr`. If there are multiple equal elements which are all return
 * candidates, the one with largest index is returned.
 */
export function binarySearch<T>(arr: readonly T[], el: T): number {
  let l = 0
  let r = arr.length

  while (l < r) {
    const m = (l + r) >> 1

    if (arr[m] <= el) {
      l = m + 1
    } else {
      r = m
    }
  }

  return l - 1
}

/**
 * Checks for duplicate values in an array.
 *
 * @param arr The array to search for duplicate elements in.
 * @param key_fn An optional mapping from element values to key values, which
 *   are compared for uniqueness.
 * @returns True if any of the elements in the array have the same key (or value
 *   if no `key_fn` is supplied).
 */
export function containsDuplicates<T>(
  arr: readonly T[],
  key_fn: (val: T) => any = (val) => val
): boolean {
  const sorted_keys = arr.map(key_fn).sort()

  for (let i = 0; i < sorted_keys.length - 1; i++) {
    if (sorted_keys[i] === sorted_keys[i + 1]) {
      return true
    }
  }

  return false
}

export function allNonNull<T>(arr: readonly T[]): arr is Exclude<T, null>[] {
  return !arr.some((val) => val === null)
}

export function unionLists<T>(arr1: readonly T[], arr2: readonly T[]): T[] {
  return arr1.concat(...arr2.map((el2) => (arr1.includes(el2) ? [] : [el2])))
}

export function intersectLists<T>(arr1: readonly T[], arr2: readonly T[]): T[] {
  return ([] as T[]).concat(
    ...arr1.map((el1) => (arr2.includes(el1) ? [el1] : []))
  )
}
