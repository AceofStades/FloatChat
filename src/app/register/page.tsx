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
import { Checkbox } from "@/src/components/ui/checkbox";
import { Waves, Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [verificationCode, setVerificationCode] = useState("");
    const [isVerifying, setIsVerifying] = useState(false);

    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [agreeToTerms, setAgreeToTerms] = useState(false);

    const { register, confirmRegister, continueAsGuest } = useAuth();
    const router = useRouter();

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({
            ...prev,
            [e.target.name]: e.target.value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        // Validation
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters long.");
            setIsLoading(false);
            return;
        }

        if (!agreeToTerms) {
            setError(
                "Please agree to the Terms of Service and Privacy Policy.",
            );
            setIsLoading(false);
            return;
        }

        try {
            const result = await register(
                formData.email,
                formData.password,
                formData.name,
            );
            if (result.success) {
                router.push("/dashboard");
            } else if (result.nextStep === "CONFIRM_SIGN_UP") {
                setIsVerifying(true);
            } else {
                setError("Registration failed. Please try again.");
            }
        } catch (err: any) {
            setError(
                err.message ||
                    "An error occurred during registration. Please try again.",
            );
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerificationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        try {
            const success = await confirmRegister(
                formData.email,
                verificationCode,
            );
            if (success) {
                // Now they can log in
                router.push("/login?verified=true");
            } else {
                setError("Verification failed. Please try again.");
            }
        } catch (err: any) {
            setError(err.message || "Invalid verification code.");
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
                {/* Logo */}
                <div className="text-center mb-8">
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
                                AI-Powered Ocean Data Platform
                            </div>
                        </div>
                    </Link>
                </div>

                <Card className="shadow-2xl border border-slate-800/50 bg-slate-900/90 backdrop-blur-xl relative overflow-hidden">
                    {/* Card glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />

                    <CardHeader className="space-y-1 relative z-10">
                        <CardTitle className="text-2xl font-bold text-center text-slate-100">
                            {isVerifying ? "Verify Email" : "Create Account"}
                        </CardTitle>
                        <CardDescription className="text-center text-slate-400">
                            {isVerifying
                                ? "Enter the verification code sent to your email"
                                : "Join thousands of researchers exploring ocean data"}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 relative z-10">
                        {error && (
                            <Alert
                                variant="destructive"
                                className="bg-red-950/50 border-red-800/50 text-red-300"
                            >
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {!isVerifying ? (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="name"
                                        className="text-slate-300 font-medium text-sm"
                                    >
                                        Full Name
                                    </Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        type="text"
                                        placeholder="Enter your full name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
                                        className="bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="email"
                                        className="text-slate-300 font-medium text-sm"
                                    >
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="Enter your email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        required
                                        disabled={isLoading}
                                        className="bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="password"
                                        className="text-slate-300 font-medium text-sm"
                                    >
                                        Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            name="password"
                                            type={
                                                showPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Create a password"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                            disabled={isLoading}
                                            className="bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 pr-12"
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

                                <div className="space-y-2">
                                    <Label
                                        htmlFor="confirmPassword"
                                        className="text-slate-300 font-medium text-sm"
                                    >
                                        Confirm Password
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type={
                                                showConfirmPassword
                                                    ? "text"
                                                    : "password"
                                            }
                                            placeholder="Confirm your password"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            required
                                            disabled={isLoading}
                                            className="bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 pr-12"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300"
                                            onClick={() =>
                                                setShowConfirmPassword(
                                                    !showConfirmPassword,
                                                )
                                            }
                                            disabled={isLoading}
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="terms"
                                        checked={agreeToTerms}
                                        onCheckedChange={(checked) =>
                                            setAgreeToTerms(checked as boolean)
                                        }
                                        disabled={isLoading}
                                        className="border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                                    />
                                    <Label
                                        htmlFor="terms"
                                        className="text-sm text-slate-300 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        I agree to the{" "}
                                        <Link
                                            href="/terms"
                                            className="text-blue-400 hover:underline"
                                        >
                                            Terms of Service
                                        </Link>{" "}
                                        and{" "}
                                        <Link
                                            href="/privacy"
                                            className="text-blue-400 hover:underline"
                                        >
                                            Privacy Policy
                                        </Link>
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium shadow-lg hover:shadow-blue-500/25 disabled:opacity-50"
                                    disabled={isLoading || !agreeToTerms}
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Account...
                                        </>
                                    ) : (
                                        "Create Account"
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <form
                                onSubmit={handleVerificationSubmit}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label
                                        htmlFor="code"
                                        className="text-slate-300 font-medium text-sm"
                                    >
                                        Verification Code
                                    </Label>
                                    <Input
                                        id="code"
                                        type="text"
                                        placeholder="Enter 6-digit code"
                                        value={verificationCode}
                                        onChange={(e) =>
                                            setVerificationCode(e.target.value)
                                        }
                                        required
                                        disabled={isLoading}
                                        className="bg-slate-800/50 border-slate-700/50 text-slate-100 placeholder:text-slate-500 focus:border-blue-500/50 focus:ring-blue-500/20 text-center tracking-widest text-lg"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium shadow-lg hover:shadow-blue-500/25 disabled:opacity-50"
                                    disabled={
                                        isLoading || verificationCode.length < 3
                                    }
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Verifying...
                                        </>
                                    ) : (
                                        "Verify & Continue"
                                    )}
                                </Button>
                                <div className="text-center pt-2">
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="text-sm text-slate-400 hover:text-blue-300"
                                        onClick={() => setIsVerifying(false)}
                                        disabled={isLoading}
                                    >
                                        Back to Registration
                                    </Button>
                                </div>
                            </form>
                        )}

                        {!isVerifying && (
                            <>
                                <div className="relative pt-2">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-slate-700/50" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-slate-900 px-4 text-slate-500 font-medium">
                                            Or
                                        </span>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full h-11 bg-transparent border-slate-700/50 text-slate-300 hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-600/50 transition-all duration-200"
                                    onClick={handleGuestAccess}
                                    disabled={isLoading}
                                >
                                    Continue as Guest
                                </Button>

                                <div className="text-center pt-2">
                                    <p className="text-sm text-slate-400">
                                        Already have an account?{" "}
                                        <Link
                                            href="/login"
                                            className="text-blue-400 hover:text-blue-300 font-medium hover:underline transition-colors duration-200"
                                        >
                                            Sign in
                                        </Link>
                                    </p>
                                </div>

                                {/* Account Types Info */}
                                <div className="mt-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
                                    <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                                        Account Types:
                                    </p>
                                    <div className="text-xs text-slate-400 space-y-1">
                                        <p>
                                            <strong className="text-slate-300">
                                                Normal:
                                            </strong>{" "}
                                            Chat history, basic features
                                        </p>
                                        <p>
                                            <strong className="text-slate-300">
                                                Premium:
                                            </strong>{" "}
                                            Unlimited queries, advanced
                                            analytics
                                        </p>
                                        <p>
                                            <strong className="text-slate-300">
                                                Guest:
                                            </strong>{" "}
                                            Limited chat, no history saved
                                        </p>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
