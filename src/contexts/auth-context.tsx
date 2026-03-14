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
    confirmSignUp,
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
    login: (
        email: string,
        password: string,
    ) => Promise<{ success: boolean; nextStep?: string }>;
    register: (
        email: string,
        password: string,
        name: string,
    ) => Promise<{ success: boolean; nextStep?: string }>;
    confirmRegister: (email: string, code: string) => Promise<boolean>;
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

    const login = async (
        email: string,
        password: string,
    ): Promise<{ success: boolean; nextStep?: string }> => {
        try {
            const { isSignedIn, nextStep } = await signIn({
                username: email,
                password,
            });
            if (isSignedIn) {
                await checkUser();
                return { success: true };
            }
            return { success: false, nextStep: nextStep?.signInStep };
        } catch (error) {
            console.error("Error signing in", error);
            throw error;
        }
    };

    const register = async (
        email: string,
        password: string,
        name: string,
    ): Promise<{ success: boolean; nextStep?: string }> => {
        try {
            const { isSignUpComplete, nextStep } = await signUp({
                username: email,
                password,
                options: {
                    userAttributes: {
                        email,
                        name,
                    },
                },
            });

            if (isSignUpComplete) {
                try {
                    await signIn({ username: email, password });
                    await checkUser();
                } catch (e) {
                    // ignore sign in error
                }
                return { success: true };
            } else {
                return { success: false, nextStep: nextStep.signUpStep };
            }
        } catch (error) {
            console.error("Error signing up", error);
            throw error;
        }
    };

    const confirmRegister = async (
        email: string,
        code: string,
    ): Promise<boolean> => {
        try {
            const { isSignUpComplete } = await confirmSignUp({
                username: email,
                confirmationCode: code,
            });
            return isSignUpComplete;
        } catch (error) {
            console.error("Error confirming sign up", error);
            throw error;
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
                confirmRegister,
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
