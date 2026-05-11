import { NextResponse } from "next/server";

type Analysis = {
  title: string;
  roleTags: string[];
  structureTags: string[];
  layoutTags: string[];
  styleTags: string[];
  elementTags: string[];
  memo: string;
};

const fallbackAnalysis: Analysis = {
  title: "",
  roleTags: [],
  structureTags: [],
  layoutTags: [],
  styleTags: [],
  elementTags: [],
  memo: ""
};

function extractJson(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallbackAnalysis;
  try {
    return { ...fallbackAnalysis, ...JSON.parse(match[0]) } as Analysis;
  } catch {
    return fallbackAnalysis;
  }
}

async function fileToDataUrl(file: File) {
  const bytes = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/png"};base64,${bytes.toString("base64")}`;
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const apiKey = process.env.OPENAI_API_KEY;
  const file = formData.get("file");

  if (!apiKey) {
    return NextResponse.json({ error: "서버 OPENAI_API_KEY가 필요합니다." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "분석할 이미지가 필요합니다." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 분석할 수 있습니다." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "이미지는 8MB 이하로 등록하세요." }, { status: 413 });
  }

  const imageUrl = await fileToDataUrl(file);
  const model = process.env.OPENAI_ANALYSIS_MODEL || "gpt-4o-mini";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "이 PPT 장표 이미지를 레퍼런스 관리용으로 분석하세요. 반드시 JSON만 반환하세요. " +
                "필드: title(string), roleTags(string[]), structureTags(string[]), layoutTags(string[]), styleTags(string[]), elementTags(string[]), memo(string). " +
                "태그는 한국어의 짧은 명사로 2~5개씩 작성하세요. " +
                "structureTags는 가능한 한 병렬, 비교, 단계, 요약, 문제정의, 그리드 중에서 고르세요. " +
                "layoutTags는 가능한 한 카드형, 좌우분할, 타임라인, 표, 차트, 썸네일 중에서 고르세요."
            },
            {
              type: "input_image",
              image_url: imageUrl
            }
          ]
        }
      ]
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json({ error: payload?.error?.message || "AI 분석 실패" }, { status: response.status });
  }

  const outputText =
    payload.output_text ||
    payload.output?.flatMap((item: { content?: Array<{ text?: string }> }) => item.content || []).map((item: { text?: string }) => item.text || "").join("\n") ||
    "";

  return NextResponse.json({ analysis: extractJson(outputText) });
}
