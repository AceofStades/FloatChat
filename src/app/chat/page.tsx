"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Alert, AlertDescription } from "@/src/components/ui/alert";
import {
    Send,
    Loader2,
    UploadCloud,
    CheckCircle,
    AlertTriangle,
    Plus,
    FileText,
    MessageSquare,
    Bot,
} from "lucide-react";
import { Navbar } from "@/src/components/navbar";

import { useAuth } from "@/src/contexts/auth-context";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: string;
    isHtml?: boolean;
    thinking?: string;
};

export default function ChatPage() {
    const { user } = useAuth();
    const [currentSessionId, setCurrentSessionId] = useState(
        `session_${Date.now()}`,
    );
    const [sessions, setSessions] = useState<
        { sessionId: string; filename: string; updatedAt: string }[]
    >([]);

    // --- Chat State ---
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            content:
                "Hello! I'm FloatChat. How can I help you explore oceanographic data today?",
            isUser: false,
            timestamp: new Date().toLocaleTimeString(),
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // --- Upload State ---
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{
        type: "success" | "error";
        message: string;
    } | null>(null);
    const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);

    // Fetch user sessions
    useEffect(() => {
        if (!user) return;
        const fetchSessions = async () => {
            try {
                const res = await fetch(
                    `https://exn01sk1s7.execute-api.ap-south-1.amazonaws.com/prod/sessions/${user.id}`,
                );
                if (res.ok) {
                    const data = await res.json();
                    setSessions(data.sessions || []);
                }
            } catch (err) {
                console.error("Failed to fetch sessions", err);
            }
        };
        fetchSessions();
    }, [user]);

    // Fetch chat history when session changes
    useEffect(() => {
        if (!user) return;

        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(
                    `https://exn01sk1s7.execute-api.ap-south-1.amazonaws.com/prod/chat-history/${user.id}/${currentSessionId}`,
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data.history && data.history.length > 0) {
                        const historyMessages = data.history.map(
                            (msg: any, idx: number) => ({
                                id: `hist_${idx}`,
                                content: msg.content,
                                isUser: msg.role === "user",
                                timestamp: new Date(
                                    msg.timestamp,
                                ).toLocaleTimeString(),
                                isHtml: msg.content.includes("<iframe"),
                            }),
                        );
                        setMessages(historyMessages);
                    } else {
                        setMessages([
                            {
                                id: "1",
                                content:
                                    "Hello! I'm FloatChat. How can I help you explore oceanographic data today?",
                                isUser: false,
                                timestamp: new Date().toLocaleTimeString(),
                            },
                        ]);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch chat history", err);
            } finally {
                setIsLoading(false);
            }
        };

        // Find the current session filename and set uploadedFiles
        const currentSession = sessions.find(
            (s) => s.sessionId === currentSessionId,
        );
        if (
            currentSession &&
            currentSession.filename &&
            currentSession.filename !== "Unknown File"
        ) {
            setUploadedFiles([currentSession.filename]);
        } else if (!sessions.find((s) => s.sessionId === currentSessionId)) {
            setUploadedFiles([]);
        }

        fetchHistory();
    }, [currentSessionId, user, sessions]);

    useEffect(() => {
        const scrollContainer = scrollAreaRef.current?.querySelector(
            "[data-radix-scroll-area-viewport]",
        );
        if (scrollContainer) {
            const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
            // Only auto-scroll if we are already near the bottom (within 100px)
            if (scrollHeight - scrollTop - clientHeight < 100) {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
        } else {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    const stopGeneration = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
            setIsLoading(false);
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const selectedFile = e.target.files[0];

            // API Gateway has a hard 10MB limit. 9MB is a safe buffer for multipart overhead.
            if (selectedFile.size > 9 * 1024 * 1024) {
                setUploadStatus({
                    type: "error",
                    message:
                        "File is too large. Please upload a file smaller than 9MB to ensure successful processing.",
                });
                e.target.value = "";
                return;
            }

            setFile(selectedFile);
            setUploadStatus(null);
            setIsUploading(true);

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("user_id", user?.id || "anonymous");
            formData.append("session_id", currentSessionId);

            try {
                const response = await fetch(
                    "https://exn01sk1s7.execute-api.ap-south-1.amazonaws.com/prod/upload-data",
                    {
                        method: "POST",
                        body: formData,
                    },
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.detail || "Failed to upload data.");
                }

                setUploadStatus({ type: "success", message: result.message });
                setUploadedFiles([selectedFile.name]); // Replace instead of append since it's one file per session

                // Update sessions list with the new session
                setSessions((prev) => {
                    const exists = prev.find(
                        (s) => s.sessionId === currentSessionId,
                    );
                    if (exists) {
                        return prev.map((s) =>
                            s.sessionId === currentSessionId
                                ? {
                                      ...s,
                                      filename: selectedFile.name,
                                      updatedAt: new Date().toISOString(),
                                  }
                                : s,
                        );
                    } else {
                        return [
                            {
                                sessionId: currentSessionId,
                                filename: selectedFile.name,
                                updatedAt: new Date().toISOString(),
                            },
                            ...prev,
                        ];
                    }
                });

                // Add a friendly system message acknowledging the upload
                setMessages((prev) => [
                    ...prev,
                    {
                        id: Date.now().toString(),
                        content: `Awesome! I've successfully loaded the data from \`${selectedFile.name}\`. What would you like to know about it?`,
                        isUser: false,
                        timestamp: new Date().toLocaleTimeString(),
                    },
                ]);
            } catch (err: any) {
                setUploadStatus({
                    type: "error",
                    message: err.message || "Upload failed.",
                });
            } finally {
                setIsUploading(false);
                // Reset the input value so the same file can be uploaded again if needed
                e.target.value = "";
            }
        }
    };

    const handleSendMessage = async (content: string) => {
        if (!content.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content,
            isUser: true,
            timestamp: new Date().toLocaleTimeString(),
        };

        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setIsLoading(true);
        setInputValue("");

        try {
            const formData = new FormData();
            formData.append("query", content);
            formData.append("user_id", user?.id || "anonymous");
            formData.append("session_id", currentSessionId);

            abortControllerRef.current = new AbortController();

            const response = await fetch(
                "https://exn01sk1s7.execute-api.ap-south-1.amazonaws.com/prod/chatbot-response",
                {
                    method: "POST",
                    body: formData,
                    signal: abortControllerRef.current.signal,
                },
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.detail || "Failed to get AI response",
                );
            }

            const contentType = response.headers.get("content-type");

            if (contentType && contentType.includes("text/event-stream")) {
                const aiMessageId = (Date.now() + 1).toString();
                setMessages((prevMessages) => [
                    ...prevMessages,
                    {
                        id: aiMessageId,
                        content: "",
                        isUser: false,
                        timestamp: new Date().toLocaleTimeString(),
                    },
                ]);

                const reader = response.body?.getReader();
                const decoder = new TextDecoder("utf-8");
                let done = false;
                let fullContent = "";
                let fullThinking = "";
                let buffer = "";

                while (reader && !done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) {
                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split("\n");
                        buffer = lines.pop() || "";

                        let shouldUpdate = false;

                        for (const line of lines) {
                            if (line.trim() === "") continue;
                            try {
                                const parsed = JSON.parse(line);

                                // Accumulate thinking state separately
                                if (parsed.thinking) {
                                    fullThinking += parsed.thinking;
                                    shouldUpdate = true;
                                }

                                if (parsed.response) {
                                    fullContent += parsed.response;
                                    shouldUpdate = true;
                                }
                            } catch (e) {
                                console.error("Error parsing stream JSON:", e);
                            }
                        }

                        if (shouldUpdate) {
                            setMessages((prevMessages) =>
                                prevMessages.map((msg) =>
                                    msg.id === aiMessageId
                                        ? {
                                              ...msg,
                                              content: fullContent,
                                              thinking: fullThinking,
                                          }
                                        : msg,
                                ),
                            );
                        }
                    }
                }
            } else if (contentType && contentType.includes("text/html")) {
                const htmlContent = await response.text();
                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content: htmlContent,
                    isUser: false,
                    timestamp: new Date().toLocaleTimeString(),
                    isHtml: true,
                };
                setMessages((prevMessages) => [...prevMessages, aiMessage]);
            } else {
                const data = await response.json();
                const messageContent =
                    data.message || "No data found for this query.";
                const preview = data.preview
                    ? `\n\n**Data Preview:**\n\`\`\`json\n${JSON.stringify(
                          data.preview,
                          null,
                          2,
                      )}\n\`\`\``
                    : "";

                const aiMessage: Message = {
                    id: (Date.now() + 1).toString(),
                    content: messageContent + preview,
                    isUser: false,
                    timestamp: new Date().toLocaleTimeString(),
                };
                setMessages((prevMessages) => [...prevMessages, aiMessage]);
            }
        } catch (error: any) {
            console.error("Chat error:", error);

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                content: `I apologize, but an error occurred.\n\n**Error:** ${error.message}`,
                isUser: false,
                timestamp: new Date().toLocaleTimeString(),
            };

            setMessages((prevMessages) => [...prevMessages, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-screen flex flex-col bg-[#212121]">
            <Navbar />

            <div className="flex flex-1 overflow-hidden">
                {/* Left Column: Chat History */}
                <div className="hidden lg:flex flex-col w-[260px] bg-[#171717] p-3 flex-shrink-0">
                    <Button
                        onClick={() => {
                            const newSessionId = `session_${Date.now()}`;
                            setCurrentSessionId(newSessionId);
                            setMessages([
                                {
                                    id: "1",
                                    content:
                                        "Hello! I'm FloatChat. How can I help you explore oceanographic data today?",
                                    isUser: false,
                                    timestamp: new Date().toLocaleTimeString(),
                                },
                            ]);
                            setUploadedFiles([]);
                            // Add a placeholder to the UI immediately
                            setSessions((prev) => [
                                {
                                    sessionId: newSessionId,
                                    filename: "New Chat",
                                    updatedAt: new Date().toISOString(),
                                },
                                ...prev,
                            ]);
                        }}
                        variant="ghost"
                        className="w-full justify-start gap-2 mb-2 hover:bg-[#212121] text-[#ececec] rounded-lg px-3 h-10 font-medium border-0"
                    >
                        <Plus className="w-4 h-4" /> New chat
                    </Button>
                    <div className="flex-1 overflow-y-auto space-y-1">
                        <h3 className="text-xs font-semibold text-[#b4b4b4] px-3 mb-2 mt-4 uppercase tracking-wider">
                            Sessions
                        </h3>
                        {sessions.length === 0 ? (
                            <div className="px-3 py-2 text-[#b4b4b4] text-xs italic">
                                No previous sessions.
                            </div>
                        ) : (
                            sessions.map((s) => (
                                <div
                                    key={s.sessionId}
                                    onClick={() =>
                                        setCurrentSessionId(s.sessionId)
                                    }
                                    className={`px-3 py-2 rounded-lg cursor-pointer text-sm flex items-center gap-2 truncate ${
                                        currentSessionId === s.sessionId
                                            ? "bg-[#2f2f2f] text-[#ececec]"
                                            : "text-[#b4b4b4] hover:bg-[#212121] hover:text-[#ececec]"
                                    }`}
                                    title={
                                        s.filename !== "Unknown File"
                                            ? s.filename
                                            : "Chat Session"
                                    }
                                >
                                    <MessageSquare className="w-4 h-4 flex-shrink-0" />
                                    <span className="truncate">
                                        {s.filename !== "Unknown File"
                                            ? s.filename
                                            : "Chat Session"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Center Column: Chat Area */}
                <div className="flex-1 flex flex-col w-full overflow-hidden bg-[#212121]">
                    <div className="flex-1 overflow-hidden" ref={scrollAreaRef}>
                        <ScrollArea className="h-full w-full">
                            <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex w-full mb-6 ${message.isUser ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`flex gap-4 w-full ${message.isUser ? "justify-end" : "justify-start"}`}
                                        >
                                            {!message.isUser && (
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-[#3e3e3e] bg-white text-black mt-1">
                                                    <Bot className="w-5 h-5" />
                                                </div>
                                            )}

                                            <div
                                                className={`flex flex-col gap-1 max-w-[85%] sm:max-w-[85%] ${message.isUser ? "items-end" : "items-start"} overflow-hidden`}
                                            >
                                                {message.isUser ? (
                                                    <div className="px-5 py-2.5 rounded-3xl bg-[#2f2f2f] text-[#ececec] text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                                                        {message.content}
                                                    </div>
                                                ) : (
                                                    <div className="py-1 text-[#ececec] text-[15px] leading-relaxed break-words max-w-full w-full">
                                                        {message.thinking && (
                                                            <details className="mb-4">
                                                                <summary className="cursor-pointer text-sm font-medium text-[#b4b4b4] hover:text-[#ececec] transition-colors select-none">
                                                                    Thought
                                                                    process
                                                                </summary>
                                                                <div className="mt-2 pl-4 py-2 border-l-2 border-[#2f2f2f] text-sm text-[#b4b4b4] whitespace-pre-wrap font-mono">
                                                                    {
                                                                        message.thinking
                                                                    }
                                                                </div>
                                                            </details>
                                                        )}
                                                        {message.isHtml ? (
                                                            <div
                                                                className="overflow-x-auto max-w-full"
                                                                dangerouslySetInnerHTML={{
                                                                    __html: message.content,
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="prose prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-[#2f2f2f] prose-pre:border prose-pre:border-[#3e3e3e]">
                                                                <ReactMarkdown
                                                                    remarkPlugins={[
                                                                        remarkGfm,
                                                                    ]}
                                                                >
                                                                    {
                                                                        message.content
                                                                    }
                                                                </ReactMarkdown>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {isLoading &&
                                    messages[messages.length - 1]?.isUser && (
                                        <div className="flex w-full justify-start mb-6">
                                            <div className="flex gap-4 w-full justify-start">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-[#3e3e3e] bg-white text-black mt-1">
                                                    <Bot className="w-5 h-5" />
                                                </div>
                                                <div className="py-2 px-1 text-[#ececec] flex items-center">
                                                    <div className="flex gap-1 items-center h-4">
                                                        <div
                                                            className="w-2 h-2 rounded-full bg-[#b4b4b4] animate-bounce"
                                                            style={{
                                                                animationDelay:
                                                                    "0ms",
                                                            }}
                                                        ></div>
                                                        <div
                                                            className="w-2 h-2 rounded-full bg-[#b4b4b4] animate-bounce"
                                                            style={{
                                                                animationDelay:
                                                                    "150ms",
                                                            }}
                                                        ></div>
                                                        <div
                                                            className="w-2 h-2 rounded-full bg-[#b4b4b4] animate-bounce"
                                                            style={{
                                                                animationDelay:
                                                                    "300ms",
                                                            }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="w-full pb-6 pt-2 px-4 bg-[#212121]">
                        <div className="max-w-3xl mx-auto relative flex items-center bg-[#2f2f2f] rounded-[32px] p-2 px-4 border border-[#3e3e3e]">
                            <label
                                htmlFor="file-upload"
                                className={`p-2 rounded-full transition-colors flex-shrink-0 cursor-pointer ${
                                    isUploading
                                        ? "text-[#b4b4b4] opacity-50 cursor-not-allowed"
                                        : "text-[#b4b4b4] hover:bg-[#3e3e3e] hover:text-white"
                                }`}
                                title="Attach"
                            >
                                {isUploading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Plus className="w-5 h-5" />
                                )}
                            </label>
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (
                                        e.key === "Enter" &&
                                        !e.shiftKey &&
                                        !isLoading &&
                                        !isUploading
                                    ) {
                                        e.preventDefault();
                                        handleSendMessage(inputValue);
                                    }
                                }}
                                disabled={isLoading || isUploading}
                                placeholder={
                                    isUploading
                                        ? "Please wait for upload to finish..."
                                        : "Ask anything"
                                }
                                rows={1}
                                className="flex-1 bg-transparent text-[#ececec] placeholder-[#b4b4b4] focus:outline-none py-3 px-3 text-[15px] resize-none max-h-32 overflow-y-auto disabled:opacity-50"
                                style={{ minHeight: "44px" }}
                            />
                            {isLoading ? (
                                <button
                                    onClick={stopGeneration}
                                    className="p-2 rounded-full transition-all bg-white text-black hover:opacity-80 flex-shrink-0 ml-1 flex items-center justify-center h-[32px] w-[32px]"
                                    title="Stop generating"
                                >
                                    <svg
                                        width="12"
                                        height="12"
                                        viewBox="0 0 24 24"
                                        fill="currentColor"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <rect
                                            x="5"
                                            y="5"
                                            width="14"
                                            height="14"
                                            rx="2"
                                        />
                                    </svg>
                                </button>
                            ) : !inputValue.trim() || isUploading ? (
                                <button
                                    disabled
                                    className="p-2 rounded-full text-[#b4b4b4] hover:bg-[#3e3e3e] hover:text-white transition-colors flex-shrink-0 ml-1 opacity-50 cursor-not-allowed"
                                >
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            d="M12 2C9.79086 2 8 3.79086 8 6V11C8 13.2091 9.79086 15 12 15C14.2091 15 16 13.2091 16 11V6C16 3.79086 14.2091 2 12 2Z"
                                            fill="currentColor"
                                        />
                                        <path
                                            d="M19 10V11C19 14.866 15.866 18 12 18C8.13401 18 5 14.866 5 11V10H3V11C3 15.4183 6.22262 19.0886 10.4996 19.8519V22H13.4996V19.8519C17.777 19.0886 21 15.4183 21 11V10H19Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </button>
                            ) : (
                                <button
                                    onClick={() =>
                                        handleSendMessage(inputValue)
                                    }
                                    className="p-2 rounded-full transition-all bg-white text-black hover:opacity-80 flex-shrink-0 ml-1 flex items-center justify-center h-[32px] w-[32px]"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <div className="text-center mt-3 text-xs text-[#b4b4b4]">
                            FloatChat can make mistakes. Check important info.
                        </div>
                    </div>
                </div>

                {/* Right Column: File Uploads */}
                <div className="hidden xl:flex flex-col w-[260px] bg-[#171717] p-4 flex-shrink-0 border-l border-[#2f2f2f]">
                    <h2 className="text-[#ececec] font-medium mb-6 flex items-center gap-2 text-sm px-2">
                        <UploadCloud className="w-4 h-4 text-[#ececec]" /> Data
                        Management
                    </h2>

                    <div className="flex-1 overflow-hidden flex flex-col mb-4">
                        <h3 className="text-xs font-semibold text-[#b4b4b4] uppercase tracking-wider mb-3 px-2">
                            Available Files
                        </h3>
                        <ScrollArea className="flex-1">
                            <div className="space-y-1 pr-2">
                                {uploadedFiles.length === 0 ? (
                                    <p className="text-xs text-[#b4b4b4] italic px-2">
                                        No files uploaded yet.
                                    </p>
                                ) : (
                                    uploadedFiles.map((fileName, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#2f2f2f] text-[#ececec] cursor-default transition-colors"
                                        >
                                            <FileText className="w-4 h-4 text-[#ececec] flex-shrink-0" />
                                            <span
                                                className="text-sm truncate"
                                                title={fileName}
                                            >
                                                {fileName}
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="mt-auto space-y-4 px-2">
                        {uploadStatus && (
                            <Alert
                                className={`border-0 py-2 px-3 ${
                                    uploadStatus.type === "success"
                                        ? "bg-green-900/30 text-green-400"
                                        : "bg-red-900/30 text-red-400"
                                }`}
                            >
                                <AlertDescription className="text-xs">
                                    {uploadStatus.message}
                                </AlertDescription>
                            </Alert>
                        )}

                        <input
                            id="file-upload"
                            type="file"
                            className="hidden"
                            onChange={handleFileChange}
                            accept=".nc"
                            disabled={isUploading}
                        />
                        <Label
                            htmlFor="file-upload"
                            className={`w-full flex items-center justify-center h-10 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                isUploading
                                    ? "bg-[#2f2f2f] text-[#b4b4b4] cursor-not-allowed"
                                    : "bg-white hover:bg-gray-200 text-black"
                            }`}
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                "Upload Data"
                            )}
                        </Label>
                    </div>
                </div>
            </div>
        </div>
    );
}
