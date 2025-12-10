/**
 * Simple routing system for extension pages
 */

import { createContext, useContext, useState, ReactNode } from 'react';

export type Route = 'notes' | 'chat' | 'settings' | 'modelConfig' | 'mcpConfig';

interface RouterContextType {
  route: Route;
  setRoute: (route: Route) => void;
}

const RouterContext = createContext<RouterContextType | undefined>(undefined);

export function RouterProvider({ children, initialRoute = 'notes' }: { children: ReactNode; initialRoute?: Route }) {
  const [route, setRoute] = useState<Route>(initialRoute);

  return (
    <RouterContext.Provider value={{ route, setRoute }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useRouter must be used within RouterProvider');
  }
  return context;
}

