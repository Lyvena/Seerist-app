import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { insforge, db } from '../lib/insforge';
import type { Organization, OrgMembership, Profile, Workspace } from '../lib/types';

interface AppState {
  loading: boolean;
  user: { id: string; email: string } | null;
  profile: Profile | null;
  orgs: Organization[];
  activeOrg: Organization | null;
  workspaces: Workspace[];
  activeWs: Workspace | null;
  setActiveOrg: (id: string) => void;
  setActiveWs: (id: string) => void;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AppState>(null as unknown as AppState);
export const useApp = () => useContext(Ctx);

const LS_ORG = 'seerist_active_org';
const LS_WS = 'seerist_active_ws';

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(localStorage.getItem(LS_ORG));
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWsId, setActiveWsId] = useState<string | null>(localStorage.getItem(LS_WS));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await insforge.auth.getCurrentUser();
      const u = (data as any)?.user;
      if (!u?.id) {
        setUser(null); setProfile(null); setOrgs([]); setWorkspaces([]);
        return;
      }
      setUser({ id: u.id, email: u.email });

      // Ensure the spec's `users` row (profiles mirrors the auth identity).
      const { data: existing } = await db().from('profiles').select('*').eq('id', u.id).maybeSingle();
      if (!existing) {
        await db().from('profiles').insert({ id: u.id, email: u.email, name: u.profile?.name || null });
      }
      setProfile((existing as Profile) || { id: u.id, email: u.email, name: u.profile?.name || null });

      const { data: memberships } = await db()
        .from('organization_memberships')
        .select('*, organizations(*)')
        .eq('user_id', u.id);
      const orgList = ((memberships as OrgMembership[]) || [])
        .map((m) => m.organizations)
        .filter(Boolean) as Organization[];
      setOrgs(orgList);

      const { data: wsList } = await db().from('workspaces').select('*').order('created_at', { ascending: true });
      setWorkspaces((wsList as Workspace[]) || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) || orgs[0] || null,
    [orgs, activeOrgId],
  );
  const orgWorkspaces = useMemo(
    () => workspaces.filter((w) => w.organization_id === activeOrg?.id),
    [workspaces, activeOrg],
  );
  const activeWs = useMemo(
    () => orgWorkspaces.find((w) => w.id === activeWsId) || orgWorkspaces[0] || null,
    [orgWorkspaces, activeWsId],
  );

  const value: AppState = {
    loading,
    user,
    profile,
    orgs,
    activeOrg,
    workspaces: orgWorkspaces,
    activeWs,
    setActiveOrg: (id) => { setActiveOrgId(id); localStorage.setItem(LS_ORG, id); },
    setActiveWs: (id) => { setActiveWsId(id); localStorage.setItem(LS_WS, id); },
    refresh: load,
    signOut: async () => {
      await insforge.auth.signOut();
      localStorage.removeItem(LS_ORG); localStorage.removeItem(LS_WS);
      setUser(null); setProfile(null); setOrgs([]); setWorkspaces([]);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
