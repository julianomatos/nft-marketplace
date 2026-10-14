export type RouterSession =
  | { status: 'guest' }
  | { status: 'authenticated'; userId: string; displayName: string }

export type RouterContext = {
  session: RouterSession
}
