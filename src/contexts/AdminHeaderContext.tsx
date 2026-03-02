import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { LucideIcon } from 'lucide-react';

interface AdminHeaderState {
  title: string;
  subtitle: string;
  icon: LucideIcon | null;
  actions?: ReactNode;
}

interface AdminHeaderContextType extends AdminHeaderState {
  setHeader: (state: AdminHeaderState) => void;
  resetHeader: () => void;
}

const defaultState: AdminHeaderState = {
  title: '',
  subtitle: '',
  icon: null,
  actions: undefined,
};

const AdminHeaderContext = createContext<AdminHeaderContextType | undefined>(undefined);

export const AdminHeaderProvider = ({ children }: { children: ReactNode }) => {
  const [header, setHeaderState] = useState<AdminHeaderState>(defaultState);

  const setHeader = useCallback((state: AdminHeaderState) => {
    setHeaderState(state);
  }, []);

  const resetHeader = useCallback(() => {
    setHeaderState(defaultState);
  }, []);

  const value = useMemo(() => ({
    ...header,
    setHeader,
    resetHeader
  }), [header, setHeader, resetHeader]);

  return (
    <AdminHeaderContext.Provider value={value}>
      {children}
    </AdminHeaderContext.Provider>
  );
};

export const useAdminHeader = () => {
  const context = useContext(AdminHeaderContext);
  if (context === undefined) {
    throw new Error('useAdminHeader must be used within an AdminHeaderProvider');
  }
  return context;
};
