'use client';

import { account } from '@/lib/appwrite';
import { Models } from 'appwrite';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type AppwriteContextType = {
    user: Models.User<Models.Preferences> | null;
    isLoading: boolean;
};

const AppwriteContext = createContext<AppwriteContextType>({ user: null, isLoading: true });

export const useAppwrite = () => {
    return useContext(AppwriteContext);
};

export function AppwriteProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<Models.User<Models.Preferences> | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            try {
                const currentUser = await account.get();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };
        checkUser();
    }, []);

    return (
        <AppwriteContext.Provider value={{ user, isLoading }}>
            {children}
        </AppwriteContext.Provider>
    );
};

export const useUser = () => {
    const { user, isLoading } = useAppwrite();
    return { user, loading: isLoading };
}
