import { NextResponse } from "next/server";

type BlogAiMode = "outline" | "draft" | "rewrite" | "seo" | "social" | "translate" | "score";
type BlogAiIntent = "research_plan" | "longform_from_plan" | "plan_article" | "draft_from_plan" | "make_outline" | "draft_from_brief" | "continue" | "rewrite_selection" | "improve_article" | "seo_pack" | "product_pitch" | "critique";
type PatchOperation = "replaceSelection" | "replaceContent" | "appendContent" | "updateFields" | "showOnly";

interface BlogAiRequest {
  mode?: BlogAiMode;
  intent?: BlogAiIntent;
  instruction?: string;
  memory?: string;
  tone?: string;
  diction?: string;
  researchEnabled?: boolean;
  targetWords?: number;
  audience?: string;
  scenario?: BlogAiScenario;
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

interface BlogAiScenario {
  id?: string;
  title?: string;
  angle?: string;
  readerPromise?: string;
  outline?: string[];
  tone?: string;
  productFit?: string;
  suggestedTags?: string[];
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
  scenarios?: BlogAiScenario[];
  researchBrief?: string;
}

const PATCH_OPERATIONS: PatchOperation[] = ["replaceSelection", "replaceContent", "appendContent", "updateFields", "showOnly"];

const INTENT_PROMPTS: Record<BlogAiIntent, { operation: PatchOperation; prompt: string }> = {
  research_plan: {
    operation: "showOnly",
    prompt: "Đóng vai researcher + editor trưởng. Dựa trên ý tưởng/title/brief, dùng web search để tìm dữ liệu thật, nguồn đáng tin và insight mới. Trả đúng 3 kịch bản bài viết có thesis, outline, nguồn nên dùng, từ khóa SEO, search intent, góc kể chuyện và rủi ro fact-check. Không viết bài hoàn chỉnh.",
  },
  longform_from_plan: {
    operation: "replaceContent",
    prompt: "Viết bài blog dài hoàn chỉnh 2.000-3.000 từ bằng Markdown. Phải dựa trên selectedScenario nếu có, hoặc title/brief nếu chưa có scenario. Dùng web search khi researchEnabled=true, chèn citation markdown cạnh các dữ kiện quan trọng, có mở bài, H2/H3, ví dụ thực tế, FAQ, kết luận, CTA mềm và phần nguồn tham khảo cuối bài. Đồng thời đề xuất SEO fields.",
  },
  plan_article: {
    operation: "showOnly",
    prompt: "Đề xuất đúng 3 kịch bản/hướng triển khai bài viết dựa trên title, brief, category, tags, sản phẩm đính kèm và phong cách đã chọn. Không viết bài hoàn chỉnh. Mỗi kịch bản phải khác nhau thật sự về góc nhìn, lời hứa với người đọc và outline.",
  },
  draft_from_plan: {
    operation: "replaceContent",
    prompt: "Viết bản nháp hoàn chỉnh bằng Markdown dựa trên selectedScenario, title, brief, tone, diction và currentPost. Phải đi theo outline đã chọn, không tự đổi hướng. Nếu có attachedProducts thì chỉ lồng ghép mềm khi phù hợp.",
  },
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
  research_plan: ["showOnly"],
  longform_from_plan: ["replaceContent", "showOnly"],
  plan_article: ["showOnly"],
  draft_from_plan: ["replaceContent", "showOnly"],
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

function cleanScenarios(value: unknown): BlogAiScenario[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .slice(0, 3)
    .map((item, index) => ({
      id: typeof item.id === "string" && item.id.trim() ? item.id : `scenario-${index + 1}`,
      title: typeof item.title === "string" ? item.title.trim() : `Hướng ${index + 1}`,
      angle: typeof item.angle === "string" ? item.angle.trim() : "",
      readerPromise: typeof item.readerPromise === "string" ? item.readerPromise.trim() : "",
      outline: Array.isArray(item.outline) ? item.outline.filter((line): line is string => typeof line === "string").slice(0, 8) : [],
      tone: typeof item.tone === "string" ? item.tone.trim() : "",
      productFit: typeof item.productFit === "string" ? item.productFit.trim() : "",
      suggestedTags: Array.isArray(item.suggestedTags) ? item.suggestedTags.filter((tag): tag is string => typeof tag === "string").slice(0, 6) : [],
    }));
}

function extractCitations(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const data = payload as { citations?: unknown };
  if (!Array.isArray(data.citations)) return [];
  return data.citations.filter((item): item is string => typeof item === "string").slice(0, 20);
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
          scenarios: cleanScenarios((parsed as { scenarios?: unknown }).scenarios),
          researchBrief: typeof (parsed as { researchBrief?: unknown }).researchBrief === "string" ? (parsed as { researchBrief: string }).researchBrief : "",
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
        "Nhiệm vụ của bạn là trả về một patch an toàn để editor áp dụng vào bài hiện tại; với workflow dài, bạn là researcher, strategist, SEO editor và ghostwriter.",
        "SOURCE OF TRUTH tuyệt đối: currentPost, selectedText, beforeSelection, afterSelection, editorMemory và userInstruction.",
        "Fidelity rule: không đổi chủ đề, title, thesis, facts, persona, timeline, dự án, tên riêng hoặc scope trừ khi userInstruction yêu cầu rõ.",
        "Rewrite rule: khi intent là rewrite_selection, chỉ sửa selectedText; giữ cùng ý, cùng thông tin, cùng phạm vi, chỉ làm câu chữ rõ/sắc/mạch lạc hơn.",
        "Whole-article rule: khi intent là improve_article, được chỉnh toàn bài nhưng phải giữ luận điểm, bố cục chính và dữ kiện; không biến bài thành một bài khác.",
        "Research rule: khi intent là research_plan hoặc longform_from_plan và có web_search, phải ưu tiên nguồn hiện hành/đáng tin, phân biệt dữ kiện đã kiểm chứng với nhận định, và thêm citation markdown ngay sau claim quan trọng.",
        "Longform rule: khi intent là longform_from_plan, viết như một bài hoàn chỉnh khoảng targetWords từ; không trả outline rỗng, không bắt blogger tự viết tiếp. Nếu thiếu dữ kiện cá nhân thì dùng placeholder rõ ràng hoặc hỏi lại bằng showOnly.",
        "Draft rule: bản nháp phải đi từ title/excerpt/tags/content hiện có; nếu brief mơ hồ nhưng vẫn có title, được chủ động xây bài với giả định minh bạch.",
        "Planning rule: khi intent là plan_article hoặc research_plan, trả đúng 3 scenarios khác nhau và patch.operation='showOnly'. Mỗi scenario cần title, angle, readerPromise, outline, tone, productFit, suggestedTags.",
        "Scenario draft rule: khi intent là draft_from_plan hoặc longform_from_plan, selectedScenario là bản thiết kế ưu tiên; không đổi sang hướng khác, không bỏ outline chính.",
        "SEO rule: chỉ trả fields khi operation là updateFields; không trộn nội dung bài vào SEO fields.",
        "SEO longform rule: với longform_from_plan, patch.operation='replaceContent' nhưng patch.fields vẫn nên có slug, excerpt, metaTitle, metaDescription, tags, category.",
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
        `targetWords: ${Math.max(800, Math.min(3500, Number(body.targetWords) || 2200))}`,
        `researchEnabled: ${body.researchEnabled === false ? "false" : "true"}`,
        body.instruction ? `userInstruction: ${body.instruction}` : "userInstruction: ",
        body.audience ? `targetAudience: ${body.audience}` : "targetAudience: blogger's general audience",
        body.tone ? `selectedTone: ${body.tone}` : "selectedTone: ",
        body.diction ? `selectedDiction: ${body.diction}` : "selectedDiction: ",
        body.memory ? `editorMemory/styleGuide: ${body.memory}` : "editorMemory/styleGuide: ",
        body.scenario ? `selectedScenario: ${JSON.stringify(body.scenario)}` : "selectedScenario: ",
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
          "- replaceContent may also include fields for SEO metadata when writing a full longform article.",
          "- showOnly: content is advisory text; it will not be applied to the article.",
          "- For research_plan, patch.content must summarize research findings, source angles and what the blogger should approve.",
          "- For longform_from_plan, patch.content must be a full Markdown article with inline citations and a final 'Nguồn tham khảo' section.",
          "- Never choose an operation outside allowedOperations.",
        ].join("\n"),
        "Return exactly this JSON shape:",
        JSON.stringify({
          assistantNote: "Một câu ngắn nói AI đã làm gì.",
          scenarios: [
            {
              id: "scenario-1",
              title: "optional for plan_article",
              angle: "optional for plan_article",
              readerPromise: "optional for plan_article",
              outline: ["optional"],
              tone: "optional",
              productFit: "optional",
              suggestedTags: ["optional"],
            },
          ],
          researchBrief: "optional: nguồn, insight, search intent, keyword, rủi ro fact-check",
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
    const useResearch = body.researchEnabled !== false && (intent === "research_plan" || intent === "longform_from_plan");

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
        tools: useResearch ? [{ type: "web_search" }] : undefined,
        parallel_tool_calls: useResearch ? true : undefined,
        max_output_tokens: intent === "longform_from_plan" ? 9000 : intent === "draft_from_plan" || intent === "draft_from_brief" || intent === "improve_article" ? 5200 : 2600,
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
    const citations = extractCitations(payload);
    return NextResponse.json({
      result: routed.patch.content || routed.assistantNote,
      ...routed,
      citations,
      intent,
      model,
      keySource: process.env.XAI_API_KEY ? "env" : "session",
      usage: payload && typeof payload === "object" && "usage" in payload ? (payload as { usage: unknown }).usage : null,
    });
  } catch {
    return NextResponse.json({ error: "Không thể gọi xAI lúc này." }, { status: 500 });
  }
}
