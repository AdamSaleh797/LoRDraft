import { Buffer } from 'buffer'

import { SessionCred, SessionCredT } from 'common/game/socket-msgs'

const STORAGE_AUTH_INFO_KEY = 'auth_info'

export class CachedAuthInfo {
  private readonly authInfo: SessionCred | null

  constructor(authInfo: SessionCred | null) {
    this.authInfo = authInfo
  }

  getStorageAuthInfo(): SessionCred | null {
    return this.authInfo
  }

  private static readCachedAuthInfo(): SessionCred | null {
    const auth_info_str = window.sessionStorage.getItem(STORAGE_AUTH_INFO_KEY)
    if (auth_info_str === null) {
      return null
    }

    const auth_info_prim: unknown = JSON.parse(
      auth_info_str,
      (_1, val: unknown) => {
        // Transform the serialized Buffers back into the correct Buffer view.
        if (
          val !== null &&
          typeof val === 'object' &&
          'type' in val &&
          val.type === 'Buffer' &&
          'data' in val &&
          Array.isArray(val.data)
        ) {
          return Buffer.from(val.data)
        } else {
          return val
        }
      }
    )

    if (!SessionCredT.guard(auth_info_prim)) {
      console.log("session cred doesn't match expected format:")
      console.log(auth_info_prim)
      window.sessionStorage.removeItem(STORAGE_AUTH_INFO_KEY)
      return null
    }

    const { token, ...auth_info_no_token } = { ...auth_info_prim }

    return {
      token: Buffer.from(token),
      ...auth_info_no_token,
    }
  }

  static initialStorageAuthInfo(): CachedAuthInfo {
    return new CachedAuthInfo(CachedAuthInfo.readCachedAuthInfo())
  }

  static setStorageAuthInfo(session_cred: SessionCred): CachedAuthInfo {
    window.sessionStorage.setItem(
      STORAGE_AUTH_INFO_KEY,
      JSON.stringify(session_cred)
    )
    return new CachedAuthInfo(session_cred)
  }

  static clearStorageAuthInfo(): CachedAuthInfo {
    window.sessionStorage.removeItem(STORAGE_AUTH_INFO_KEY)
    return new CachedAuthInfo(null)
  }
}
