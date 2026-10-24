import type { Metadata } from "next";
import { ChatView } from "@/components/chatbot/chat-view";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Fragrance assistant" };

export default function ChatPage() {
  return (
    <div className="page-container max-w-5xl">
      <PageHeader eyebrow="Fragrance assistant" title="Ask like you'd ask a friend" className="pb-8" />
      <ChatView />
    </div>
  );
}
