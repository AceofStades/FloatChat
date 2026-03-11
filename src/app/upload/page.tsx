"use client";

import { useState } from "react";
import { Navbar } from "@/src/components/navbar";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/src/components/ui/card";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import { UploadCloud, Loader2, CheckCircle, AlertTriangle } from "lucide-react";

export default function UploadPage() {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setStatus(null);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setStatus({
                type: "error",
                message: "Please select a file to upload.",
            });
            return;
        }

        setIsUploading(true);
        setStatus(null);

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch(
                "https://xv9mw0wjia.execute-api.ap-south-1.amazonaws.com/default/upload-data",
                {
                    method: "POST",
                    body: formData,
                },
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || "Failed to upload data.");
            }

            setStatus({ type: "success", message: result.message });
        } catch (err: any) {
            setStatus({
                type: "error",
                message: err.message || "An unexpected error occurred.",
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Navbar />
            <div className="flex items-center justify-center p-4">
                <div className="container max-w-2xl py-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <UploadCloud className="w-6 h-6" />
                                Upload ARGO Data
                            </CardTitle>
                            <CardDescription>
                                Upload a NetCDF (.nc) file containing ARGO float
                                data. The backend will process it and store it
                                in the database for querying.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="file-upload">NetCDF File</Label>
                                <Input
                                    id="file-upload"
                                    type="file"
                                    onChange={handleFileChange}
                                    accept=".nc"
                                    disabled={isUploading}
                                />
                            </div>

                            {status && (
                                <Alert
                                    variant={
                                        status.type === "error"
                                            ? "destructive"
                                            : "default"
                                    }
                                >
                                    {status.type === "success" ? (
                                        <CheckCircle className="h-4 w-4" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4" />
                                    )}
                                    <AlertDescription>
                                        {status.message}
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                onClick={handleUpload}
                                disabled={isUploading || !file}
                                className="w-full"
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Uploading...
                                    </>
                                ) : (
                                    "Upload File"
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
