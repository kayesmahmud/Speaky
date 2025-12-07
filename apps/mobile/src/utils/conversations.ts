import type { QueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

// Starts or resumes a conversation, refreshes the connections list, then navigates to chat
export async function startConversationAndNavigate(
  partnerId: number,
  queryClient: QueryClient,
  navigateToChat: (connectionId: number) => void,
) {
  const conversation = await api.startConversation(partnerId);
  queryClient.invalidateQueries({ queryKey: ['connections'] });
  navigateToChat(conversation.id);
}
