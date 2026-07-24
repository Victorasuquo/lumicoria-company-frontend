import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  createPortalSession,
  deletePortalSession,
  getPortalContext,
  getPortalPermissions,
  getPortalSession,
  switchPortalContext,
} from '../api/resources'
import { isPortalApiError } from '../api/client'
import type {
  PortalContext,
  PortalDestination,
  PortalPermissions,
  PortalSession,
} from '../api/types'
import { portalQueryClient } from '../portal/query'
import { isFirebaseConfigured, portalAuth } from './firebase'

type AuthStatus = 'loading' | 'unauthenticated' | 'choosing-organization' | 'authenticated'

type SignInResult = {
  needsOrganization: boolean
}

type AuthContextValue = {
  status: AuthStatus
  firebaseUser: User | null
  session: PortalSession | null
  context: PortalContext | null
  permissions: PortalPermissions | null
  destinations: PortalDestination[]
  selectedEngagementId: string | null
  firebaseConfigured: boolean
  signIn: (email: string, password: string, rememberMe: boolean) => Promise<SignInResult>
  chooseOrganization: (organizationId: string) => Promise<void>
  switchOrganization: (organizationId: string) => Promise<void>
  selectEngagement: (engagementId: string | null) => void
  refreshContext: () => Promise<void>
  logout: () => Promise<void>
  hasScope: (scope: string) => boolean
}

const PortalAuthContext = createContext<AuthContextValue | null>(null)
const organizationStorageKey = 'lumicoria.portal.organization'

function engagementStorageKey(organizationId: string) {
  return `lumicoria.portal.engagement.${organizationId}`
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [session, setSession] = useState<PortalSession | null>(null)
  const [context, setContext] = useState<PortalContext | null>(null)
  const [permissions, setPermissions] = useState<PortalPermissions | null>(null)
  const [destinations, setDestinations] = useState<PortalDestination[]>([])
  const [pendingIdentityToken, setPendingIdentityToken] = useState<string | null>(null)
  const [pendingRememberMe, setPendingRememberMe] = useState(true)
  const [selectedEngagementId, setSelectedEngagementId] = useState<string | null>(null)

  useEffect(() => {
    if (!portalAuth) return
    return onAuthStateChanged(portalAuth, setFirebaseUser)
  }, [])

  const applyContext = useCallback(async (
    nextSession: PortalSession,
    organizationId: string,
  ) => {
    const [{ data: nextContext }, { data: nextPermissions }] = await Promise.all([
      getPortalContext({ organizationId }),
      getPortalPermissions(organizationId),
    ])
    const storedEngagement = localStorage.getItem(engagementStorageKey(organizationId))
    const permittedEngagement = storedEngagement
      && nextContext.engagement_ids.includes(storedEngagement)
      ? storedEngagement
      : nextContext.engagement_ids[0] ?? null

    localStorage.setItem(organizationStorageKey, organizationId)
    setSession(nextSession)
    setContext(nextContext)
    setPermissions(nextPermissions)
    setDestinations(nextContext.destinations ?? [])
    setSelectedEngagementId(permittedEngagement)
    setStatus('authenticated')
  }, [])

  const restore = useCallback(async () => {
    setStatus('loading')
    try {
      const { data: restoredSession } = await getPortalSession()
      const organizationId = localStorage.getItem(organizationStorageKey)
        || restoredSession.organization_id
      await applyContext(restoredSession, organizationId)
    } catch {
      setSession(null)
      setContext(null)
      setPermissions(null)
      setDestinations([])
      setStatus('unauthenticated')
    }
  }, [applyContext])

  useEffect(() => {
    void restore()
  }, [restore])

  const signIn = useCallback(async (
    email: string,
    password: string,
    rememberMe: boolean,
  ): Promise<SignInResult> => {
    if (!portalAuth) {
      throw new Error('Firebase is not configured for this deployment.')
    }

    const credential = await signInWithEmailAndPassword(portalAuth, email, password)
    const identityToken = await credential.user.getIdToken(true)
    const { data: discoveredContext } = await getPortalContext({ identityToken })
    const availableDestinations = discoveredContext.destinations ?? []

    if (availableDestinations.length > 1) {
      setPendingIdentityToken(identityToken)
      setPendingRememberMe(rememberMe)
      setDestinations(availableDestinations)
      setContext(discoveredContext)
      setStatus('choosing-organization')
      return { needsOrganization: true }
    }

    const organizationId = availableDestinations[0]?.organization_id
      || discoveredContext.organization_id
    const { data: nextSession } = await createPortalSession(
      identityToken,
      organizationId,
      rememberMe,
    )
    await applyContext(nextSession, organizationId)
    return { needsOrganization: false }
  }, [applyContext])

  const chooseOrganization = useCallback(async (organizationId: string) => {
    if (!pendingIdentityToken) {
      throw new Error('Sign in again before selecting an organization.')
    }
    const { data: nextSession } = await createPortalSession(
      pendingIdentityToken,
      organizationId,
      pendingRememberMe,
    )
    setPendingIdentityToken(null)
    await applyContext(nextSession, organizationId)
  }, [applyContext, pendingIdentityToken, pendingRememberMe])

  const switchOrganization = useCallback(async (organizationId: string) => {
    if (!session) return
    await switchPortalContext(organizationId)
    await applyContext({ ...session, organization_id: organizationId }, organizationId)
    await portalQueryClient.invalidateQueries({ queryKey: ['portal'] })
  }, [applyContext, session])

  const selectEngagement = useCallback((engagementId: string | null) => {
    setSelectedEngagementId(engagementId)
    if (context?.organization_id && engagementId) {
      localStorage.setItem(engagementStorageKey(context.organization_id), engagementId)
    }
  }, [context?.organization_id])

  const refreshContext = useCallback(async () => {
    if (!session || !context) return
    await applyContext(session, context.organization_id)
  }, [applyContext, context, session])

  const logout = useCallback(async () => {
    try {
      await deletePortalSession()
    } catch (error) {
      if (!isPortalApiError(error) || error.status !== 401) throw error
    } finally {
      if (portalAuth) await firebaseSignOut(portalAuth)
      portalQueryClient.clear()
      setSession(null)
      setContext(null)
      setPermissions(null)
      setDestinations([])
      setSelectedEngagementId(null)
      setStatus('unauthenticated')
    }
  }, [])

  const hasScope = useCallback(
    (scope: string) => Boolean(permissions?.scopes.includes(scope) || context?.scopes.includes(scope)),
    [context?.scopes, permissions?.scopes],
  )

  const value = useMemo<AuthContextValue>(() => ({
    status,
    firebaseUser,
    session,
    context,
    permissions,
    destinations,
    selectedEngagementId,
    firebaseConfigured: isFirebaseConfigured,
    signIn,
    chooseOrganization,
    switchOrganization,
    selectEngagement,
    refreshContext,
    logout,
    hasScope,
  }), [
    chooseOrganization,
    context,
    destinations,
    firebaseUser,
    hasScope,
    logout,
    permissions,
    refreshContext,
    selectEngagement,
    selectedEngagementId,
    session,
    signIn,
    status,
    switchOrganization,
  ])

  return <PortalAuthContext.Provider value={value}>{children}</PortalAuthContext.Provider>
}

export function usePortalAuth() {
  const value = useContext(PortalAuthContext)
  if (!value) throw new Error('usePortalAuth must be used inside AuthProvider')
  return value
}
