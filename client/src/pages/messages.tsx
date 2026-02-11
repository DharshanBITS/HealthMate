import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { MessageSquare, Search, Send, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState, useEffect, useRef } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import clsx from "clsx";

export default function Messages() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [messageText, setMessageText] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: contacts, isLoading: loadingContacts } = useQuery<any[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await fetch(api.appointments.messages.conversations.path, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch contacts');
      return res.json();
    }
  });

  const { data: messages, isLoading: loadingMessages } = useQuery<any[]>({
    queryKey: [api.appointments.messages.list.path, selectedUser?.id],
    enabled: !!selectedUser,
    queryFn: async () => {
      const res = await fetch(`/api/messages/${selectedUser.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch messages');
      return res.json();
    },
    refetchInterval: 3000
  });

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", api.appointments.messages.send.path, {
        receiverId: Number(selectedUser.id),
        content
      });
    },
    onSuccess: () => {
      setMessageText("");
      queryClient.invalidateQueries({ queryKey: [api.appointments.messages.list.path, selectedUser?.id] });
    }
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sendMutation.isPending) return;

    try {
      await sendMutation.mutateAsync(messageText);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive"
      });
    }
  };

  return (
    <Layout>
      <div className="flex h-[calc(100vh-8rem)] gap-4">
        {/* Sidebar */}
        <Card className="w-80 flex flex-col">
          <CardHeader className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search contacts..." className="pl-9" />
            </div>
          </CardHeader>
          <ScrollArea className="flex-1">
            {loadingContacts ? (
              <div className="p-4 space-y-4">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {contacts?.map(contact => (
                  <button
                    key={contact.id}
                    onClick={() => setSelectedUser(contact)}
                    className={clsx(
                      "w-full flex items-center gap-3 p-3 rounded-lg transition-colors",
                      selectedUser?.id === contact.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                    )}
                  >
                    <Avatar className="w-10 h-10 border">
                      <AvatarFallback>{contact.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="text-left truncate">
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className={clsx("text-xs truncate", selectedUser?.id === contact.id ? "text-primary-foreground/70" : "text-muted-foreground")}>
                        {contact.specialization || (contact.role === 'patient' ? 'Patient' : 'Doctor')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex-1 flex flex-col">
          {selectedUser ? (
            <>
              <CardHeader className="p-4 border-b flex flex-row items-center gap-3">
                <Avatar>
                  <AvatarFallback>{selectedUser.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedUser.name}</CardTitle>
                  <p className="text-xs text-muted-foreground capitalize">{selectedUser.role}</p>
                </div>
              </CardHeader>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages?.map(msg => (
                    <div key={msg.id} className={clsx("flex", msg.senderId === user?.id ? "justify-end" : "justify-start")}>
                      <div className={clsx(
                        "max-w-[70%] p-3 rounded-2xl text-sm",
                        msg.senderId === user?.id ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"
                      )}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <form onSubmit={handleSend} className="p-4 border-t flex gap-2">
                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button type="submit" size="icon" disabled={sendMutation.isPending}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
