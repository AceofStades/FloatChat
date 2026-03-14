"use client";

import type React from "react";
import { useState } from "react";
import { useAuth } from "@/src/contexts/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/src/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Alert, AlertDescription } from "@/src/components/ui/alert";

import { Waves, Eye, EyeOff, Loader2, Shield } from "lucide-react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    const { login, continueAsGuest } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const result = await login(email, password);
            if (result.success) {
                router.push("/dashboard");
            } else if (result.nextStep === "CONFIRM_SIGN_UP") {
                setError(
                    "Your account is not verified. Please check your email for the verification code and verify it on the registration page.",
                );
            } else {
                setError("Invalid email or password. Please try again.");
            }
        } catch (err: any) {
            if (
                err.name === "UserNotConfirmedException" ||
                err.message?.includes("not confirmed")
            ) {
                setError(
                    "Your account is not verified. Please go to registration page to verify it, or wait a few minutes if the system is still processing.",
                );
            } else {
                setError(
                    err.message ||
                        "An error occurred during login. Please try again.",
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleGuestAccess = () => {
        continueAsGuest();
        router.push("/chat");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(14,165,233,0.15)_0%,transparent_40%)] animate-pulse" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.1)_0%,transparent_40%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(6,182,212,0.08)_0%,transparent_40%)]" />
            </div>

            {/* Grid pattern overlay */}
            <div className="absolute inset-0 opacity-20">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.03)_1px,transparent_1px)] bg-[size:32px_32px]" />
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Logo Section */}
                <div className="text-center mb-12">
                    <Link
                        href="/"
                        className="inline-flex items-center space-x-3 group"
                    >
                        <div className="relative">
                            <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-md group-hover:bg-blue-400/30 transition-colors duration-300" />
                            <Waves className="h-10 w-10 text-blue-400 relative z-10 group-hover:text-blue-300 transition-colors duration-300" />
                        </div>
                        <div className="text-left">
                            <span className="text-3xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                                FloatChat
                            </span>
                            <div className="text-xs text-slate-400 font-medium tracking-wider uppercase">
                                Professional Ocean Analytics
                            </div>
                        </div>
                    </Link>
                </div>

                <Card className="shadow-2xl border border-slate-800/50 bg-slate-900/90 backdrop-blur-xl relative overflow-hidden">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

                    <CardHeader className="space-y-4 relative z-10">
                        <div className="flex items-center justify-center mb-2">
                            <div className="bg-slate-800/50 p-3 rounded-full border border-slate-700/50">
                                <Shield className="h-6 w-6 text-blue-400" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl font-bold text-center text-slate-100">
                            Secure Access
                        </CardTitle>
                        <CardDescription className="text-center text-slate-400 font-medium">
                            Sign in to your professional dashboard
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 relative z-10">
                        {error && (
                            <Alert
                                variant="destructive"
                                className="bg-red-950/50 border-red-800/50 text-red-300"
                            >
                                <AlertDescription className="text-sm">
                                    {error}
                                </AlertDescription>
                            </Alert>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-3">
                                <Label
                                    htmlFor="email"
                                    className="text-slate-300 font-medium text-sm"
                                >
                                    Email Address
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="your.email@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 h-12 transition-all duration-200"
                                />
                            </div>

                            <div className="space-y-3">
                                <Label
                                    htmlFor="password"
                                    className="text-slate-300 font-medium text-sm"
                                >
                                    Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={
                                            showPassword ? "text" : "password"
                                        }
                                        placeholder="Enter your secure password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        required
                                        disabled={isLoading}
                                        className="bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 h-12 pr-12 transition-all duration-200"
                                    />
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        disabled={isLoading}
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4" />
                                        ) : (
                                            <Eye className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-12 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium transition-all duration-300 shadow-lg hover:shadow-blue-500/25 disabled:opacity-50"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Authenticating...
                                    </>
                                ) : (
                                    "Sign In Securely"
                                )}
                            </Button>
                        </form>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-slate-700/50" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-slate-900 px-4 text-slate-500 font-medium">
                                    Alternative Access
                                </span>
                            </div>
                        </div>

                        <Button
                            variant="outline"
                            className="w-full h-12 bg-transparent border-slate-700/50 text-slate-300 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600/50 transition-all duration-200"
                            onClick={handleGuestAccess}
                            disabled={isLoading}
                        >
                            Continue as Guest User
                        </Button>

                        <div className="text-center space-y-3">
                            <p className="text-sm text-slate-400">
                                New to our platform?{" "}
                                <Link
                                    href="/register"
                                    className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors duration-200"
                                >
                                    Create Account
                                </Link>
                            </p>
                            <Link
                                href="/forgot-password"
                                className="text-sm text-cyan-400 hover:text-cyan-300 hover:underline transition-colors duration-200 block"
                            >
                                Forgot Password?
                            </Link>
                        </div>

                        {/* Demo Credentials */}
                        <div className="mt-8 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
                            <div className="flex items-center space-x-2 mb-3">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    Demo Environment
                                </p>
                            </div>
                            <div className="text-xs text-slate-400 space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-slate-300">
                                        Standard User:
                                    </span>
                                    <span className="font-mono">
                                        user@example.com
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-medium text-slate-300">
                                        Premium User:
                                    </span>
                                    <span className="font-mono">
                                        premium@example.com
                                    </span>
                                </div>
                                <div className="text-center pt-1 border-t border-slate-700/50">
                                    <span className="text-slate-500">
                                        Password:{" "}
                                    </span>
                                    <span className="font-mono text-slate-400">
                                        password
                                    </span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-center mt-8 space-y-2">
                    <p className="text-xs text-slate-500">
                        Protected by enterprise-grade security
                    </p>
                    <p className="text-xs text-slate-600">
                        By signing in, you agree to our{" "}
                        <Link
                            href="/terms"
                            className="text-slate-400 hover:text-slate-300 hover:underline transition-colors duration-200"
                        >
                            Terms of Service
                        </Link>{" "}
                        and{" "}
                        <Link
                            href="/privacy"
                            className="text-slate-400 hover:text-slate-300 hover:underline transition-colors duration-200"
                        >
                            Privacy Policy
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
