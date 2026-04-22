"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import VouchProfileButton from "@/app/profile/[id]/VouchProfileButton";

interface ApiParticipant {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  trustLevel: "ANONYMOUS" | "REGISTERED" | "TRUSTED" | "SUSPENDED";
  hasDateOfBirth: boolean;
}

interface ApiMessage {
  id: string;
  body: string;
  createdAt: string;
  sender: {
    id: string;
    displayName: string;
  };
}

interface ConversationResponse {
  conversation: {
    id: string;
    participant: ApiParticipant | null;
  };
  currentUserId: string;
  messages: ApiMessage[];
}

interface PageProps {
  params: {
    conversationId: string;
  };
}

export default function MessageThreadPage({ params }: PageProps) {
  const [participant, setParticipant] = useState<ApiParticipant | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    let active = true;

    async function loadConversation() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/messages/${params.conversationId}`, {
          cache: "no-store",
        });
        const data: ConversationResponse | { error?: string } = await res.json();

        if (!res.ok) {
          throw new Error(
            "error" in data && data.error
              ? data.error
              : "Failed to load conversation"
          );
        }

        if (!active) return;

        const payload = data as ConversationResponse;
        setParticipant(payload.conversation.participant);
        setCurrentUserId(payload.currentUserId);
        setMessages(payload.messages);
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load conversation"
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadConversation();

    return () => {
      active = false;
    };
  }, [params.conversationId]);

  async function handleSendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!newMessage.trim()) return;

    setIsSending(true);
    setError(null);

    try {
      const res = await fetch(`/api/messages/${params.conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: newMessage }),
      });
      const data: ApiMessage | { error?: string } = await res.json();

      if (!res.ok) {
        throw new Error(
          "error" in data && data.error ? data.error : "Failed to send message"
        );
      }

      setMessages((current) => [...current, data as ApiMessage]);
      setNewMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  }

  if (isLoading) {
    return <p className="text-center text-gray-500 py-8">Loading...</p>;
  }

  if (error) {
    return <p className="text-center text-red-600 py-8">{error}</p>;
  }

  if (!participant) {
    return (
      <p className="py-8 text-center text-white">Conversation not found.</p>
    );
  }

  return (
    <div className="max-w-3xl mx-auto h-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-full flex items-center justify-center text-white font-bold">
          {participant.displayName.charAt(0)}
        </div>
        <div className="flex-1">
          <h1 className="font-bold">{participant.displayName}</h1>
          <p className="text-xs text-gray-500">{participant.trustLevel}</p>
        </div>
        <Link
          href={`/profile/${participant.id}`}
          className="text-[var(--brand-primary)] hover:underline text-sm font-semibold"
        >
          View Profile
        </Link>
        <VouchProfileButton
          userId={participant.id}
          firstName={participant.firstName}
          lastName={participant.lastName}
          trustLevel={participant.trustLevel}
          hasDateOfBirth={participant.hasDateOfBirth}
          className="rounded-full border border-[var(--brand-accent)]/20 bg-[var(--brand-accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#8d1929]"
          onSuccess={() =>
            setParticipant((current) =>
              current ? { ...current, trustLevel: "TRUSTED" } : current
            )
          }
        >
          Vouch
        </VouchProfileButton>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No messages yet. Start the conversation.
          </p>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender.id === currentUserId;

            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
                    isOwn
                      ? "bg-[var(--brand-primary)] text-white rounded-br-none"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-none"
                  }`}
                >
                  <p className="break-words">{message.body}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? "text-blue-100" : "text-gray-500"
                    }`}
                  >
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form
        onSubmit={handleSendMessage}
        className="bg-white border-t border-gray-200 p-4 flex gap-2"
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        />
        <button
          type="submit"
          disabled={isSending || !newMessage.trim()}
          className="bg-[var(--brand-primary)] text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-semibold"
        >
          Send
        </button>
      </form>
    </div>
  );
}
