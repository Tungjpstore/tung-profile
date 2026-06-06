import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/app/lib/turnstile";
import {
  readMessages,
  saveMessage,
  updateMessageStatus,
  deleteMessage,
} from "@/app/lib/contact-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    await saveMessage({
      name,
      email,
      phone: phone || "",
      message,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Gửi tin nhắn thất bại" }, { status: 500 });
  }
}

// GET — admin reads messages (protected by middleware)
export async function GET() {
  try {
    const messages = await readMessages();
    return NextResponse.json(messages);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}

// PUT — mark message as read
export async function PUT(request: Request) {
  try {
    const { id, read } = await request.json();
    const success = await updateMessageStatus(id, read);
    if (!success) {
      return NextResponse.json({ error: "Không tìm thấy tin nhắn" }, { status: 404 });
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
    const success = await deleteMessage(id);
    if (!success) {
      return NextResponse.json({ error: "Không tìm thấy tin nhắn" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Lỗi" }, { status: 500 });
  }
}
