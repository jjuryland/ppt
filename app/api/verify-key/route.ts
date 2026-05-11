import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { apiKey } = await request.json().catch(() => ({ apiKey: "" }));
  const key = process.env.OPENAI_API_KEY || apiKey;
  const mode = process.env.OPENAI_API_KEY ? "server" : "user";

  if (!key || typeof key !== "string") {
    return NextResponse.json({ error: "OpenAI API 키가 필요합니다." }, { status: 400 });
  }

  const response = await fetch("https://api.openai.com/v1/models", {
    headers: {
      Authorization: `Bearer ${key}`
    }
  });

  if (!response.ok) {
    return NextResponse.json({ error: "API 키를 확인하지 못했습니다." }, { status: response.status });
  }

  return NextResponse.json({ ok: true, mode });
}
