import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { verifyTurnstileToken } from "@/app/lib/turnstile";

const MSG_PATH = path.join(process.cwd(), "data", "messages.json");

function readMessages() {
  if (!fs.existsSync(MSG_PATH)) return [];
  return JSON.parse(fs.readFileSync(MSG_PATH, "utf-8"));
}

function writeMessages(data: unknown[]) {
  fs.writeFileSync(MSG_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// POST — visitor sends a message (public)
export async function POST(request: Request) {
  try {
    const { name, email, phone, message, captcha, turnstileToken } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Vui lòng điền đầy đủ thông tin" }, { status: 400 });
    }

    const turnstile = await verifyTurnstileToken(request, turnstileToken, "contact");
    if (!turnstile.success) {
      return NextResponse.json({ error: "Xác minh bảo mật thất bại" }, { status: 400 });
    }

    if (!turnstile.enabled && !captcha) {
      return NextResponse.json({ error: "Vui lòng giải captcha" }, { status: 400 });
    }

    const messages = readMessages();
    const newMsg = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      email,
      phone: phone || "",
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    messages.unshift(newMsg);
    writeMessages(messages);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gửi tin nhắn thất bại" }, { status: 500 });
  }
}

// GET — admin reads messages (protected by middleware)
export async function GET() {
  try {
    const messages = readMessages();
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

// PUT — mark message as read
export async function PUT(request: Request) {
  try {
    const { id, read } = await request.json();
    const messages = readMessages();
    const idx = messages.findIndex((m: { id: string }) => m.id === id);
    if (idx >= 0) {
      messages[idx].read = read;
      writeMessages(messages);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi" }, { status: 500 });
  }
}

// DELETE — delete a message
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json();
    const messages = readMessages();
    const filtered = messages.filter((m: { id: string }) => m.id !== id);
    writeMessages(filtered);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi" }, { status: 500 });
  }
}
