import { NextResponse } from "next/server";

export async function POST(request: Request) {
  await request.json().catch(() => ({}));
  const key = process.env.OPENAI_API_KEY;

  if (!key) {
    return NextResponse.json({ error: "서버 OPENAI_API_KEY가 필요합니다." }, { status: 400 });
  }

  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "API 키를 확인하지 못했습니다." }, { status: response.status });
  }

  return NextResponse.json({ ok: true, mode: "server" });
}
