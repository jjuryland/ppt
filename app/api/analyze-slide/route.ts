import { NextResponse } from "next/server";

type Analysis = {
  title: string;
  roleTags: string[];
  structureTags: string[];
  elementTags: string[];
  memo: string;
};

const fallbackAnalysis: Analysis = {
  title: "",
  roleTags: [],
  structureTags: [],
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
                "이 PPT 장표 이미지를 레퍼런스 관리용으로 분석하세요. 반드시 JSON만 반환하세요.\n" +
                "필드: title(string), roleTags(string[]), structureTags(string[]), elementTags(string[]), memo(string)\n" +
                "roleTags: 이 장표가 쓰이는 페이지 목적. 다음 중에서 고르세요: 표지, 목차, 배경/도입, 문제정의, 전략, 실행계획, 성과/결과, 콘텐츠예시, 팀/조직소개, 예산/비용\n" +
                "structureTags: 정보가 배치되는 방식. 다음 중에서 고르세요: 병렬, 비교, 단계, 그리드, 요약, 단일메시지, 매트릭스, 계층, 목록\n" +
                "elementTags: 장표에 들어가는 시각 요소. 다음 중에서 고르세요: 카드, 표, 차트, 아이콘, 타임라인, 이미지, 강조박스, 화살표, 숫자강조, 인용구, 다이어그램\n" +
                "memo: 이 장표를 언제 쓰면 좋은지 1~2문장으로 설명"
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
