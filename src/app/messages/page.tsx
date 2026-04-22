"use client";

import { useEffect, useMemo, useState } from "react";
import { ConversationList } from "@/components/messaging/ConversationList";
import InternalPageHeader from "@/components/shared/InternalPageHeader";

interface ApiConversation {
  id: string;
  participant: {
    id: string;
    displayName: string;
    trustLevel: "ANONYMOUS" | "REGISTERED" | "TRUSTED" | "SUSPENDED";
  };
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface MessagesResponse {
  conversations: ApiConversation[];
}

type BadgeTrustLevel = "trusted" | "under_review" | "untrusted";

function mapTrustLevel(
  trustLevel: ApiConversation["participant"]["trustLevel"]
): BadgeTrustLevel {
  if (trustLevel === "TRUSTED") return "trusted";
  if (trustLevel === "SUSPENDED") return "under_review";
  return "untrusted";
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadConversations() {
      setIsLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/messages", { cache: "no-store" });
        const data: MessagesResponse | { error?: string } = await res.json();

        if (!res.ok) {
          throw new Error(
            "error" in data && data.error ? data.error : "Failed to load messages"
          );
        }

        if (active) {
          setConversations((data as MessagesResponse).conversations);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Failed to load messages"
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadConversations();

    return () => {
      active = false;
    };
  }, []);

  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const visible = normalizedSearch
      ? conversations.filter((conversation) => {
          return (
            conversation.participant.displayName
              .toLowerCase()
              .includes(normalizedSearch) ||
            conversation.lastMessage.toLowerCase().includes(normalizedSearch)
          );
        })
      : conversations;

    return visible.map((conversation) => ({
      id: conversation.id,
      participantName: conversation.participant.displayName,
      participantTrustLevel: mapTrustLevel(conversation.participant.trustLevel),
      lastMessage:
        conversation.lastMessage || "No messages yet. Start the conversation.",
      lastMessageDate: conversation.lastMessageAt,
      unreadCount: conversation.unreadCount,
    }));
  }, [conversations, searchTerm]);

  return (
    <div className="space-y-6">
      <InternalPageHeader title="Messages" />

      <div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search conversations..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
        />
      </div>

      {isLoading ? (
        <p className="text-center text-gray-500">Loading messages...</p>
      ) : error ? (
        <p className="text-center text-red-600 py-8">{error}</p>
      ) : searchTerm && filteredConversations.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No conversations found.</p>
      ) : (
        <ConversationList conversations={filteredConversations} />
      )}
    </div>
  );
}
