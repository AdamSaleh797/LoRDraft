import { AuthInfo, AuthInfoT } from 'common/game/socket-msgs';

const STORAGE_AUTH_INFO_KEY = 'auth_info';

export class CachedAuthInfo {
  private readonly authInfo: AuthInfo | null;

  constructor(authInfo: AuthInfo | null) {
    this.authInfo = authInfo;
  }

  getStorageAuthInfo(): AuthInfo | null {
    return this.authInfo;
  }

  private static readCachedAuthInfo(): AuthInfo | null {
    const auth_info_str = window.sessionStorage.getItem(STORAGE_AUTH_INFO_KEY);
    if (auth_info_str === null) {
      return null;
    }

    const auth_info: unknown = JSON.parse(auth_info_str);
    if (!AuthInfoT.guard(auth_info)) {
      window.sessionStorage.removeItem(STORAGE_AUTH_INFO_KEY);
      return null;
    }

    return auth_info;
  }

  static initialStorageAuthInfo(): CachedAuthInfo {
    return new CachedAuthInfo(CachedAuthInfo.readCachedAuthInfo());
  }

  static setStorageAuthInfo(session_cred: AuthInfo): CachedAuthInfo {
    window.sessionStorage.setItem(
      STORAGE_AUTH_INFO_KEY,
      JSON.stringify(session_cred)
    );
    return new CachedAuthInfo(session_cred);
  }

  static clearStorageAuthInfo(): CachedAuthInfo {
    window.sessionStorage.removeItem(STORAGE_AUTH_INFO_KEY);
    return new CachedAuthInfo(null);
  }
}
