import { createContext, useContext, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ImpersonatedUser {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface ImpersonationContextType {
  impersonatedUser: ImpersonatedUser | null;
  isImpersonating: boolean;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
  /** Returns the effective user_id — impersonated if active, otherwise the real one */
  getEffectiveUserId: (realUserId: string | undefined) => string | undefined;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  impersonatedUser: null,
  isImpersonating: false,
  startImpersonation: () => {},
  stopImpersonation: () => {},
  getEffectiveUserId: (id) => id,
});

export const useImpersonation = () => useContext(ImpersonationContext);

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);

  const startImpersonation = (user: ImpersonatedUser) => {
    setImpersonatedUser(user);
    toast.info(`Viewing dashboard as ${user.first_name || user.email}`);
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
    toast.success("Exited impersonation mode");
  };

  const getEffectiveUserId = (realUserId: string | undefined) => {
    return impersonatedUser?.user_id || realUserId;
  };

  return (
    <ImpersonationContext.Provider value={{
      impersonatedUser,
      isImpersonating: !!impersonatedUser,
      startImpersonation,
      stopImpersonation,
      getEffectiveUserId,
    }}>
      {children}
    </ImpersonationContext.Provider>
  );
};
