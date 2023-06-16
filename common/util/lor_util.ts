import { Literal, Record as RecordT, Union } from 'runtypes'
import { RuntypeBase, Static } from 'runtypes/lib/runtype'
import { v4 as uuidv4 } from 'uuid'

// Empty object type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Empty = RecordT<any, never>

/**
 * Gives the return type of a function type, or `never` if the type is not a function.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReturnTypeOrNever<T> = T extends (...args: any[]) => infer U
  ? U
  : never

/**
 * Gives the type of the union of all values of a map type.
 *
 * Example:
 * ```
 * type T = {
 *   field1: 'a'
 *   field2: number
 *   x: 'y'
 * }
 *
 * InterfaceKeys<T> = 'a' | 'y' | number
 * ```
 */
export type MapTypeValues<T> = T extends Record<
  string | number | symbol,
  infer U
>
  ? U
  : never

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

export function genUUID(): string {
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
export function randSample<T>(arr: readonly T[], samples: number): T[] | null {
  return randSampleNumbers(arr.length, samples)?.map((idx) => arr[idx]) ?? null
}

/**
 * Returns a random sample of numbers in the range [0, size) with `samples`
 * elements removed.
 * @param size The size of the range of numbers to sample from.
 * @param samples The count of numbers to remove from the full range [0, size)
 * @returns The sampled list.
 */
function randSampleNumbersNegated(size: number, samples: number): number[] {
  const sample_idx = new Set(Array.from({ length: size }, (_1, i) => i))

  for (let i = 0; i < samples; i++) {
    let rand_idx
    do {
      rand_idx = Math.floor(Math.random() * size)
    } while (!sample_idx.has(rand_idx))
    sample_idx.delete(rand_idx)
  }

  return Array.from(sample_idx.values())
}

/**
 *
 * @param size The number of numbers to choose from.
 * @param samples The number of samples to take. This cannot exceed `size`.
 * @returns A list of numbers sampled randomly from [0, size) with no repeats.
 */
export function randSampleNumbers(
  size: number,
  samples: number
): number[] | null {
  if (samples > size) {
    return null
  }
  if (samples > size / 2) {
    return randSampleNumbersNegated(size, size - samples)
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
 * @param size The number of numbers to choose from.
 * @param samples The number of samples to take. This cannot exceed `size`.
 * @returns A list of numbers sampled randomly from [0, size) with no repeats if
 *   possible, otherwise with minimal skew in the distribution of chosen values.
 */
export function randSampleNumbersAvoidingRepeats(
  size: number,
  samples: number
): number[] {
  if (samples === 0) {
    return []
  }

  const n_repeats = Math.floor(samples / size)
  samples = samples % size

  const broadcast: number[] = Array.from({ length: size }, (_1, i) =>
    Array(n_repeats).fill(i)
  ).flat(1) as number[]

  const sample_idx = new Array<number>(samples).fill(-1)

  sample_idx.forEach((_1, idx, self) => {
    let rand_idx
    do {
      rand_idx = Math.floor(Math.random() * size)
    } while (self.includes(rand_idx))
    self[idx] = rand_idx
  })

  return broadcast.concat(sample_idx)
}

/**
 * Narrows an object to include only fields of the type `type`, discarding the other fields.
 * @param type
 * @param obj
 * @returns
 */
export function narrowType<
  T extends RecordT<{ [_: string]: RuntypeBase }, false>,
  U extends Static<T>
>(type: T, obj: U): Static<T> | null {
  const res: Static<T> = {}

  for (const [key, runtype] of Object.entries(type.fields)) {
    const val = obj[key]
    if (!runtype.guard(val)) {
      return null
    }

    if (val !== undefined) {
      res[key as keyof Static<T>] = val as Static<T>[keyof Static<T>]
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
 * @param keyFn An optional mapping from element values to key values, which
 *   are compared for uniqueness.
 * @returns True if any of the elements in the array have the same key (or value
 *   if no `key_fn` is supplied).
 */
export function containsDuplicates<T>(
  arr: readonly T[],
  keyFn: (val: T) => unknown = (val) => val
): boolean {
  const sorted_keys = arr.map(keyFn).sort()

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

/**
 * For each element of arr1, finds a unique occurrence of arr2 that it matches,
 * ensuring that no other element of arr1 will be matched against the same
 * element of arr2.
 *
 * @param arr1 The list to filter.
 * @param arr2 The list to intersect with `arr1`.
 * @param predicate An equality comparison function between the elements of the
 *   two lists. Must be transitive.
 * @return The intersected list in terms of `arr1`.
 */
export function intersectListsPred<T, U>(
  arr1: readonly T[],
  arr2: readonly U[],
  predicate: (val1: T, val2: U) => boolean
): T[] {
  const chosen_idxs = new Set<number>()

  return arr1.filter((val1) => {
    const idx = arr2.findIndex(
      (val2, i) => predicate(val1, val2) && !chosen_idxs.has(i)
    )
    if (idx !== -1) {
      chosen_idxs.add(idx)
      return true
    } else {
      return false
    }
  })
}

export function enumToRuntype<Enum extends Record<string, string>>(
  e: Enum
): Union<[Literal<string>, ...Literal<string>[]]> {
  const values = Object.keys(e).map((state) => Literal(state))
  return Union(values[0], ...values.slice(1))
}

/**
 * A type guard to check if a key exists in an unknown variable.
 */
export function keyInUnknown<Key extends string | number>(
  obj: unknown,
  key: Key
): obj is Record<Key, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj
}

/**
 * Type guard to check if unknown type is an array.
 */
export function isArray(obj: unknown): obj is unknown[] {
  return Array.isArray(obj)
}
