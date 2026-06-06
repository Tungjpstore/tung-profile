import path from "path";
import os from "os";
import { readJsonFromStorage, writeJsonToStorage } from "./storage-helper";

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  read: boolean;
  createdAt: string;
}

const keys = {
  r2Key: "data/messages.json",
  blobPath: "data/messages.json",
  kvKey: "tung-profile:messages",
  filePath: path.join(process.cwd(), "data", "messages.json"),
  runtimePath: path.join(os.tmpdir(), "tung-profile-data", "messages.json"),
};

export async function readMessages(): Promise<ContactMessage[]> {
  return readJsonFromStorage<ContactMessage[]>(keys, []);
}

export async function saveMessage(message: Omit<ContactMessage, "id" | "read" | "createdAt">): Promise<ContactMessage> {
  const messages = await readMessages();
  const newMsg: ContactMessage = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    ...message,
    read: false,
    createdAt: new Date().toISOString(),
  };
  messages.unshift(newMsg);
  await writeJsonToStorage(keys, messages);
  return newMsg;
}

export async function updateMessageStatus(id: string, read: boolean): Promise<boolean> {
  const messages = await readMessages();
  const idx = messages.findIndex((m) => m.id === id);
  if (idx >= 0) {
    messages[idx].read = read;
    await writeJsonToStorage(keys, messages);
    return true;
  }
  return false;
}

export async function deleteMessage(id: string): Promise<boolean> {
  const messages = await readMessages();
  const filtered = messages.filter((m) => m.id !== id);
  if (filtered.length !== messages.length) {
    await writeJsonToStorage(keys, filtered);
    return true;
  }
  return false;
}
