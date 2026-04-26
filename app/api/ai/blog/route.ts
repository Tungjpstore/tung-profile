import { NextResponse } from "next/server";

type BlogAiMode = "outline" | "draft" | "rewrite" | "seo" | "social" | "translate" | "score";
type BlogAiIntent = "make_outline" | "draft_from_brief" | "continue" | "rewrite_selection" | "improve_article" | "seo_pack" | "product_pitch" | "critique";
type PatchOperation = "replaceSelection" | "replaceContent" | "appendContent" | "updateFields" | "showOnly";

interface BlogAiRequest {
  mode?: BlogAiMode;
  intent?: BlogAiIntent;
  instruction?: string;
  memory?: string;
  selection?: {
    text?: string;
    start?: number;
    end?: number;
    before?: string;
    after?: string;
  };
  post?: {
    title?: string;
    slug?: string;
    excerpt?: string;
    metaTitle?: string;
    metaDescription?: string;
    content?: string;
    tags?: string[];
    category?: string;
    products?: Array<{
      id?: string;
      name?: string;
      price?: string;
      image?: string;
      href?: string;
      description?: string;
      cta?: string;
    }>;
    productAngle?: string;
  };
}

interface BlogAiPatch {
  operation: PatchOperation;
  content?: string;
  fields?: Partial<NonNullable<BlogAiRequest["post"]>>;
}

interface BlogAiRouterResult {
  assistantNote: string;
  patch: BlogAiPatch;
  warnings?: string[];
}

const PATCH_OPERATIONS: PatchOperation[] = ["replaceSelection", "replaceContent", "appendContent", "updateFields", "showOnly"];

const INTENT_PROMPTS: Record<BlogAiIntent, { operation: PatchOperation; prompt: string }> = {
  make_outline: {
    operation: "appendContent",
    prompt: "Tạo dàn ý Markdown bám sát title, category, tags, excerpt và brief. Nếu bài đã có nội dung, chỉ append outline như phần bổ sung, không thay toàn bài.",
  },
  draft_from_brief: {
    operation: "replaceContent",
    prompt: "Viết bản nháp hoàn chỉnh từ brief nhưng phải giữ đúng chủ đề/title hiện tại. Nếu đã có content, dùng nó làm nền, không đổi luận điểm sang chủ đề khác.",
  },
  continue: {
    operation: "appendContent",
    prompt: "Viết tiếp từ đoạn cuối của content hiện tại. Giữ giọng, mạch, heading structure và không lặp lại phần đã có.",
  },
  rewrite_selection: {
    operation: "replaceSelection",
    prompt: "Chỉ biên tập phần selectedText. Giữ nguyên ý, thông tin, thuật ngữ và độ liên quan với đoạn trước/sau. Không viết lại cả bài.",
  },
  improve_article: {
    operation: "replaceContent",
    prompt: "Biên tập toàn bài cho rõ, sắc, mạch lạc hơn nhưng giữ cùng title, thesis, bố cục chính, facts và scope. Không biến bài thành bài khác.",
  },
  seo_pack: {
    operation: "updateFields",
    prompt: "Tạo SEO pack dựa trên bài hiện tại. Chỉ cập nhật fields: title nếu cần, slug, excerpt, metaTitle, metaDescription, tags, category. Không tạo content mới.",
  },
  product_pitch: {
    operation: "appendContent",
    prompt: "Viết một đoạn CTA/sản phẩm gắn tự nhiên vào bài dựa trên attachedProducts và productAngle. Không bịa sản phẩm, giá, link. Không biến bài thành landing page. Nếu không có sản phẩm, trả showOnly.",
  },
  critique: {
    operation: "showOnly",
    prompt: "Đánh giá bài viết như editor trưởng: nêu vấn đề logic, chỗ lan man, thiếu bằng chứng, cấu trúc yếu, SEO, CTA. Không sửa trực tiếp.",
  },
};

const ALLOWED_OPERATIONS: Record<BlogAiIntent, PatchOperation[]> = {
  make_outline: ["appendContent", "showOnly"],
  draft_from_brief: ["replaceContent", "showOnly"],
  continue: ["appendContent", "showOnly"],
  rewrite_selection: ["replaceSelection", "showOnly"],
  improve_article: ["replaceContent", "showOnly"],
  seo_pack: ["updateFields", "showOnly"],
  product_pitch: ["appendContent", "showOnly"],
  critique: ["showOnly"],
};

function isPatchOperation(value: unknown): value is PatchOperation {
  return typeof value === "string" && PATCH_OPERATIONS.includes(value as PatchOperation);
}

function cleanFields(fields: unknown): BlogAiPatch["fields"] | undefined {
  if (!fields || typeof fields !== "object") return undefined;
  const raw = fields as Record<string, unknown>;
  const cleaned: BlogAiPatch["fields"] = {};
  if (typeof raw.title === "string") cleaned.title = raw.title;
  if (typeof raw.slug === "string") cleaned.slug = raw.slug;
  if (typeof raw.excerpt === "string") cleaned.excerpt = raw.excerpt;
  if (typeof raw.metaTitle === "string") cleaned.metaTitle = raw.metaTitle;
  if (typeof raw.metaDescription === "string") cleaned.metaDescription = raw.metaDescription;
  if (typeof raw.category === "string") cleaned.category = raw.category;
  if (Array.isArray(raw.tags)) cleaned.tags = raw.tags.filter((tag): tag is string => typeof tag === "string");
  return Object.keys(cleaned).length ? cleaned : undefined;
}

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const data = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown; type?: string }> }> };
  if (typeof data.output_text === "string") return data.output_text;

  return (data.output || [])
    .flatMap((item) => item.content || [])
    .map((content) => (typeof content.text === "string" ? content.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

function resolveIntent(body: BlogAiRequest): BlogAiIntent {
  if (body.intent) return body.intent;
  const mode = body.mode || "continue";
  if (mode === "outline") return "make_outline";
  if (mode === "draft") return "draft_from_brief";
  if (mode === "rewrite") return body.selection?.text ? "rewrite_selection" : "improve_article";
  if (mode === "seo") return "seo_pack";
  if (mode === "score") return "critique";
  return "continue";
}

function parseRouterResult(text: string, fallbackOperation: PatchOperation, allowedOperations: PatchOperation[]): BlogAiRouterResult {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start !== -1 && end !== -1) {
    try {
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as BlogAiRouterResult;
      const operation = parsed?.patch?.operation;
      if (isPatchOperation(operation)) {
        const content = typeof parsed.patch.content === "string" ? parsed.patch.content : undefined;
        const fields = cleanFields(parsed.patch.fields);
        if (!allowedOperations.includes(operation)) {
          return {
            assistantNote: "AI đề xuất thao tác không an toàn nên mình giữ ở chế độ xem trước.",
            patch: { operation: "showOnly", content: content || parsed.assistantNote || "" },
            warnings: [...(Array.isArray(parsed.warnings) ? parsed.warnings : []), `Blocked unsafe operation: ${operation}`],
          };
        }
        return {
          assistantNote: typeof parsed.assistantNote === "string" ? parsed.assistantNote : "AI đã tạo patch cho bài viết.",
          patch: { operation, content, fields },
          warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter((warning): warning is string => typeof warning === "string") : [],
        };
      }
    } catch {
      // Fall through to a safe display-only response.
    }
  }
  return {
    assistantNote: "AI trả về text tự do nên mình chưa áp dụng trực tiếp.",
    patch: { operation: fallbackOperation === "updateFields" ? "showOnly" : fallbackOperation, content: text },
    warnings: ["Model did not return valid router JSON."],
  };
}

function buildInput(body: BlogAiRequest, intent: BlogAiIntent) {
  const intentConfig = INTENT_PROMPTS[intent];
  return [
    {
      role: "system",
      content: [
        "Bạn là AI editorial router nằm trực tiếp trong trình soạn blog, không phải chatbot tách biệt.",
        "Nhiệm vụ của bạn là trả về một patch an toàn để editor áp dụng vào bài hiện tại.",
        "SOURCE OF TRUTH tuyệt đối: currentPost, selectedText, beforeSelection, afterSelection, editorMemory và userInstruction.",
        "Fidelity rule: không đổi chủ đề, title, thesis, facts, persona, timeline, dự án, tên riêng hoặc scope trừ khi userInstruction yêu cầu rõ.",
        "Rewrite rule: khi intent là rewrite_selection, chỉ sửa selectedText; giữ cùng ý, cùng thông tin, cùng phạm vi, chỉ làm câu chữ rõ/sắc/mạch lạc hơn.",
        "Whole-article rule: khi intent là improve_article, được chỉnh toàn bài nhưng phải giữ luận điểm, bố cục chính và dữ kiện; không biến bài thành một bài khác.",
        "Draft rule: bản nháp phải đi từ title/excerpt/tags/content hiện có; nếu brief mơ hồ, hỏi lại bằng showOnly thay vì bịa.",
        "SEO rule: chỉ trả fields khi operation là updateFields; không trộn nội dung bài vào SEO fields.",
        "Commerce rule: attachedProducts là nguồn sự thật duy nhất cho sản phẩm. Không tự thêm giá, ưu đãi, link, cam kết hoặc thông số không có trong dữ liệu. CTA phải giống bài tư vấn/review, không rẻ tiền.",
        "Safety rule: nếu thiếu thông tin quan trọng hoặc yêu cầu mâu thuẫn với bài hiện tại, trả patch.operation='showOnly' với câu hỏi/nguyên nhân ngắn.",
        "Style rule: tiếng Việt tự nhiên, chuyên nghiệp, có chất người viết, ít sáo rỗng, không văn quảng cáo nếu user không yêu cầu.",
        "Format rule: giữ Markdown hợp lệ, không lạm dụng heading, không thêm lời giải thích ngoài JSON.",
      ].join(" "),
    },
    {
      role: "user",
      content: [
        `intent: ${intent}`,
        `defaultOperation: ${intentConfig.operation}`,
        `allowedOperations: ${ALLOWED_OPERATIONS[intent].join(", ")}`,
        `task: ${intentConfig.prompt}`,
        body.instruction ? `userInstruction: ${body.instruction}` : "userInstruction: ",
        body.memory ? `editorMemory/styleGuide: ${body.memory}` : "editorMemory/styleGuide: ",
        "currentPost:",
        JSON.stringify({
          title: body.post?.title || "",
          slug: body.post?.slug || "",
          excerpt: body.post?.excerpt || "",
          metaTitle: body.post?.metaTitle || "",
          metaDescription: body.post?.metaDescription || "",
          category: body.post?.category || "",
          tags: body.post?.tags || [],
          productAngle: body.post?.productAngle || "",
          attachedProducts: body.post?.products || [],
          content: body.post?.content || "",
        }),
        "selectionAndCursor:",
        JSON.stringify({
          selectedText: body.selection?.text || "",
          beforeSelection: body.selection?.before || "",
          afterSelection: body.selection?.after || "",
        }),
        "Patch contract:",
        [
          "- replaceSelection: content must be only the replacement for selectedText, not the whole article.",
          "- replaceContent: content is the full new Markdown article and must preserve the existing topic and facts.",
          "- appendContent: content is only the section/paragraph to append, no repeated intro.",
          "- updateFields: fields may include only title, slug, excerpt, metaTitle, metaDescription, category, tags.",
          "- showOnly: content is advisory text; it will not be applied to the article.",
          "- Never choose an operation outside allowedOperations.",
        ].join("\n"),
        "Return exactly this JSON shape:",
        JSON.stringify({
          assistantNote: "Một câu ngắn nói AI đã làm gì.",
          patch: {
            operation: intentConfig.operation,
            content: "Markdown text nếu operation cần content.",
            fields: {
              title: "optional",
              slug: "optional",
              excerpt: "optional",
              metaTitle: "optional",
              metaDescription: "optional",
              category: "optional",
              tags: ["optional"],
            },
          },
          warnings: ["optional"],
        }),
      ].filter(Boolean).join("\n\n"),
    },
  ];
}

export async function POST(request: Request) {
  try {
    const sessionApiKey = request.headers.get("x-xai-api-key")?.trim() || "";
    const apiKey = process.env.XAI_API_KEY || sessionApiKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa có xAI key. Hãy cấu hình XAI_API_KEY trên server hoặc nhập key tạm thời trong Blog Studio." },
        { status: 501 }
      );
    }

    if (sessionApiKey && !sessionApiKey.startsWith("xai-")) {
      return NextResponse.json({ error: "xAI key tạm thời không đúng định dạng." }, { status: 400 });
    }

    const body = (await request.json()) as BlogAiRequest;
    const intent = resolveIntent(body);
    const intentConfig = INTENT_PROMPTS[intent];

    const model = process.env.XAI_MODEL || "grok-4.20-reasoning";
    const response = await fetch("https://api.x.ai/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: buildInput(body, intent),
        max_output_tokens: intent === "draft_from_brief" || intent === "improve_article" ? 3200 : 1600,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        { error: "xAI trả về lỗi.", detail: payload },
        { status: response.status }
      );
    }

    const text = extractText(payload);
    const routed = parseRouterResult(text, intentConfig.operation, ALLOWED_OPERATIONS[intent]);
    return NextResponse.json({
      result: routed.patch.content || routed.assistantNote,
      ...routed,
      intent,
      model,
      keySource: process.env.XAI_API_KEY ? "env" : "session",
      usage: payload && typeof payload === "object" && "usage" in payload ? (payload as { usage: unknown }).usage : null,
    });
  } catch {
    return NextResponse.json({ error: "Không thể gọi xAI lúc này." }, { status: 500 });
  }
}
