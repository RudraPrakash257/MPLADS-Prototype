import { createContext, useContext, useMemo, useState } from 'react';

const ActionStatusContext = createContext(null);

export function ActionStatusProvider({ children }) {
  const [actionStatuses, setActionStatuses] = useState({});
  const value = useMemo(() => ({
    getActionStatus: (workId) => actionStatuses[workId] || 'Pending Review',
    setWorkActionStatus: (workId, status) => setActionStatuses((previous) => ({ ...previous, [workId]: status })),
  }), [actionStatuses]);
  return <ActionStatusContext.Provider value={value}>{children}</ActionStatusContext.Provider>;
}

export function useActionStatus() {
  const context = useContext(ActionStatusContext);
  if (!context) throw new Error('useActionStatus must be used inside ActionStatusProvider');
  return context;
}