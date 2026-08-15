import { supabase } from "./supabase";

type RealtimeCallback = () => void;

type ChannelRegistryEntry = {
  channel: ReturnType<typeof supabase.channel>;
  listeners: Set<RealtimeCallback>;
};

const channelRegistry = new Map<string, ChannelRegistryEntry>();

export const subscribeToTableChanges = (
  topic: string,
  table: string,
  filter: string,
  callback: RealtimeCallback
) => {
  let entry = channelRegistry.get(topic);

  if (!entry) {
    const channel = supabase.channel(topic);
    entry = {
      channel,
      listeners: new Set<RealtimeCallback>(),
    };
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table,
        filter,
      },
      () => {
        const currentEntry = channelRegistry.get(topic);
        currentEntry?.listeners.forEach((cb) => cb());
      }
    );
    channel.subscribe((status) => {
      if (status === "CHANNEL_ERROR") {
        console.warn(`Realtime channel error for ${topic}`);
      }
    });
    channelRegistry.set(topic, entry);
  }

  entry.listeners.add(callback);

  return () => {
    const currentEntry = channelRegistry.get(topic);
    if (!currentEntry) return;

    currentEntry.listeners.delete(callback);
    if (currentEntry.listeners.size === 0) {
      channelRegistry.delete(topic);
      void supabase.removeChannel(currentEntry.channel);
    }
  };
};
