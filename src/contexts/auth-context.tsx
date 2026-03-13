"use client";

import {
    createContext,
    useContext,
    useState,
    useEffect,
    type ReactNode,
} from "react";
import {
    signIn,
    signUp,
    signOut,
    getCurrentUser,
    fetchUserAttributes,
} from "aws-amplify/auth";

interface User {
    id: string;
    email: string;
    name: string;
    type: "guest" | "normal" | "premium";
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<boolean>;
    register: (
        email: string,
        password: string,
        name: string,
    ) => Promise<boolean>;
    logout: () => Promise<void>;
    continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkUser();
    }, []);

    async function checkUser() {
        try {
            const currentUser = await getCurrentUser();
            const attributes = await fetchUserAttributes();

            setUser({
                id: currentUser.userId,
                email: attributes.email || "",
                name:
                    attributes.name ||
                    attributes.email?.split("@")[0] ||
                    "User",
                type: "normal",
            });
            setIsAuthenticated(true);
        } catch (error) {
            // User is not logged in
            setUser(null);
            setIsAuthenticated(false);
        }
    }

    const login = async (email: string, password: string): Promise<boolean> => {
        try {
            const { isSignedIn } = await signIn({ username: email, password });
            if (isSignedIn) {
                await checkUser();
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error signing in", error);
            return false;
        }
    };

    const register = async (
        email: string,
        password: string,
        name: string,
    ): Promise<boolean> => {
        try {
            const { isSignUpComplete } = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email,
                        name,
                    },
                },
            });

            // Note: In a real app, you'd handle email verification here.
            // For this prototype, we'll try to log them in directly if auto-verified.
            try {
                await signIn({ username: email, password });
                await checkUser();
            } catch (e) {
                // They might need to verify email first
            }
            return true;
        } catch (error) {
            console.error("Error signing up", error);
            return false;
        }
    };

    const logout = async () => {
        try {
            await signOut();
            setUser(null);
            setIsAuthenticated(false);
            localStorage.removeItem("ocean-platform-chat-history");
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    const continueAsGuest = () => {
        const guestUser: User = {
            id: "guest-" + Date.now(),
            email: "guest@ocean-platform.com",
            name: "Guest User",
            type: "guest",
        };

        setUser(guestUser);
        setIsAuthenticated(true);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated,
                login,
                register,
                logout,
                continueAsGuest,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
