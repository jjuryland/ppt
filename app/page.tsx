"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Check,
  Clipboard,
  Copy,
  Database,
  FileImage,
  FileText,
  ImagePlus,
  Loader2,
  Layers3,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Wand2
} from "lucide-react";
import { repository } from "@/lib/repository";
import { seedData } from "@/lib/seed";
import { AppData, PaginationPage, SlideDraft, SlideReference, StyleDraft } from "@/lib/types";

type Tab = "recommend" | "library" | "style";
type ImportMode = "replace" | "append";

const emptySlideDraft: SlideDraft = {
  title: "",
  sourceName: "",
  pageNumber: undefined,
  roleTags: [],
  structureTags: [],
  layoutTags: [],
  styleTags: [],
  elementTags: [],
  memo: ""
};

const emptyStyleDraft: StyleDraft = {
  title: "",
  tone: "",
  colors: [],
  layoutNotes: "",
  styleTags: []
};

const TAG_ALIASES: Record<string, string> = {
  beforeafter: "비교",
  "before/after": "비교",
  vs: "비교",
  대비: "비교",
  전후: "비교",
  좌우분할: "비교",
  좌우: "비교",
  카드: "카드형",
  카드형: "카드형",
  "3가지": "병렬",
  쓰리컬럼: "병렬",
  컬럼: "병렬",
  로드맵: "단계",
  타임라인: "단계",
  프로세스: "단계",
  절차: "단계",
  요약: "요약",
  개요: "요약",
  문제: "문제정의",
  이슈: "문제정의",
  현황: "문제정의",
  표: "표",
  테이블: "표",
  아이콘: "아이콘",
  그래프: "차트",
  차트: "차트"
};

function normalizeTag(tag: string) {
  const trimmed = tag.trim();
  const key = trimmed.toLowerCase().replace(/\s+/g, "");
  return TAG_ALIASES[key] || trimmed;
}

function normalizeTags(tags: string[]) {
  return unique(tags.map(normalizeTag));
}

function splitTags(value: string) {
  return normalizeTags(value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter(Boolean));
}

function joinTags(tags: string[]) {
  return tags.join(", ");
}

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function inferStructureTags(text: string) {
  const rules: Array<[string, string[]]> = [
    ["비교", ["비교", "Before", "After", "전후", "대비", "vs"]],
    ["병렬", ["3가지", "핵심", "요소", "카드", "축", "pillar"]],
    ["단계", ["단계", "프로세스", "로드맵", "절차", "일정", "timeline"]],
    ["요약", ["요약", "개요", "배경", "summary", "overview"]],
    ["문제정의", ["문제", "이슈", "pain", "현황", "진단"]],
    ["그리드", ["사례", "목록", "리스트", "콘텐츠", "예시"]]
  ];
  const lower = text.toLowerCase();
  return normalizeTags(rules.filter(([, keywords]) => keywords.some((keyword) => lower.includes(keyword.toLowerCase()))).map(([tag]) => tag));
}

function parsePaginationInput(raw: string): Pick<AppData, "sections" | "pages"> {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: AppData["sections"] = [];
  const pages: AppData["pages"] = [];
  let currentSectionId = "";

  function ensureSection(title = "가져온 페이지네이션") {
    if (currentSectionId) return currentSectionId;
    currentSectionId = `section-${crypto.randomUUID()}`;
    sections.push({
      id: currentSectionId,
      title,
      orderIndex: sections.length + 1,
      isOpen: true
    });
    return currentSectionId;
  }

  lines.forEach((line) => {
    const normalized = line.replace(/^[*-]\s*/, "");
    const sectionMatch = normalized.match(/^(?:#{1,6}\s*)?(?:section|part|chapter|섹션|파트)\s*[\dIVX가-힣.-]*\s*[:.)-]?\s*(.+)$/i);
    const pageMatch =
      normalized.match(/^(?:p\.?\s*)?(\d{1,3})\s*(?:p|page|페이지)?\s*[:.)-]\s*(.+)$/i) ||
      normalized.match(/^(\d{1,3})\s*(?:p|page|페이지)\s+(.+)$/i);

    if (sectionMatch && !pageMatch) {
      currentSectionId = `section-${crypto.randomUUID()}`;
      sections.push({
        id: currentSectionId,
        title: sectionMatch[1].trim(),
        orderIndex: sections.length + 1,
        isOpen: true
      });
      return;
    }

    if (pageMatch) {
      const pageNumber = Number(pageMatch[1]);
      const body = pageMatch[2].trim();
      const [titlePart, ...descriptionParts] = body.split(/\s[-–—]\s|:\s/);
      const title = titlePart.trim() || `${pageNumber}p`;
      const description = descriptionParts.join(" - ").trim();
      pages.push({
        id: `page-${crypto.randomUUID()}`,
        sectionId: ensureSection(),
        pageNumber,
        title,
        description: description || body,
        structureTags: inferStructureTags(body),
        selectedSlideIds: []
      });
      return;
    }

    if (!pages.length && normalized.length < 48) {
      currentSectionId = `section-${crypto.randomUUID()}`;
      sections.push({
        id: currentSectionId,
        title: normalized.replace(/^#+\s*/, ""),
        orderIndex: sections.length + 1,
        isOpen: true
      });
      return;
    }

    const sectionId = ensureSection();
    const page = pages[pages.length - 1];
    if (page && page.sectionId === sectionId) {
      page.description = [page.description, normalized].filter(Boolean).join("\n");
      page.structureTags = unique([...page.structureTags, ...inferStructureTags(normalized)]);
    }
  });

  if (!sections.length && pages.length) {
    sections.push({
      id: pages[0].sectionId,
      title: "가져온 페이지네이션",
      orderIndex: 1,
      isOpen: true
    });
  }

  return { sections, pages };
}

function scoreSlide(slide: SlideReference, page: PaginationPage | null, query: string) {
  const targetTags = unique([...(page?.structureTags || []), ...splitTags(query)]);
  const slideTags = unique([
    ...slide.roleTags,
    ...slide.structureTags,
    ...slide.layoutTags,
    ...slide.styleTags,
    ...slide.elementTags
  ]);
  const text = [slide.title, slide.sourceName, slide.memo, ...slideTags].join(" ").toLowerCase();
  const queryTerms = splitTags(query.replace(/\s+/g, ","));
  const tagScore = targetTags.filter((tag) => slideTags.includes(tag)).length * 10;
  const textScore = queryTerms.filter((term) => text.includes(term.toLowerCase())).length * 4;
  const selectedBoost = page?.selectedSlideIds.includes(slide.id) ? 20 : 0;
  return tagScore + textScore + selectedBoost;
}

function buildPrompt(page: PaginationPage | null, slides: SlideReference[], styleTitle: string) {
  const referenceText = slides.length
    ? slides
        .map(
          (slide, index) =>
            `${index + 1}. ${slide.title}\n정보구조: ${joinTags(slide.structureTags)}\n레이아웃: ${joinTags(slide.layoutTags)}\n구성요소: ${joinTags(slide.elementTags)}\n메모: ${slide.memo}`
        )
        .join("\n\n")
    : "선택된 장표 레퍼런스 없음";

  return `[ROLE]
당신은 PPT 제작자를 돕는 장표 이미지 프롬프트 작성자입니다.

[PAGE]
${page ? `${page.pageNumber}p. ${page.title}\n${page.description}` : "선택된 페이지 없음"}

[REFERENCE]
${referenceText}

[STYLE]
${styleTitle || (slides[0] ? joinTags(slides[0].styleTags) : "보고서형, 정돈된 레이아웃, 과하지 않은 시각 요소")}

[OUTPUT]
16:9 PPT 장표 이미지처럼 생성. 제목, 본문 카드, 핵심 메시지가 명확하게 보이도록 구성. 실제 회사명/금액/개인정보는 임의로 만들지 말고 placeholder로 처리.`;
}

function Button({
  children,
  variant = "solid",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "outline" | "ghost" }) {
  const styles = {
    solid: "bg-slate-950 text-white hover:bg-slate-800",
    outline: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100"
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

function TagPill({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs ${active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>
      {children}
    </span>
  );
}

function SlideMock({ slide }: { slide: SlideReference }) {
  const isCompare = slide.layoutTags.includes("좌우분할") || slide.structureTags.includes("비교");
  const isProcess = slide.layoutTags.includes("타임라인") || slide.structureTags.includes("단계");
  const isGrid = slide.layoutTags.includes("그리드") || slide.layoutTags.includes("썸네일");

  return (
    <div className="relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-white p-3">
      {slide.imageUrl && <img src={slide.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />}
      <div className="relative h-2 w-1/2 rounded bg-slate-300" />
      <div className="relative mt-2 h-1.5 w-1/3 rounded bg-slate-200" />
      {isCompare ? (
        <div className="relative mt-5 grid h-[55%] grid-cols-2 gap-3">
          {["Before", "After"].map((label) => (
            <div key={label} className="rounded border bg-slate-50 p-2">
              <div className="mb-2 text-[10px] font-semibold text-slate-500">{label}</div>
              <div className="mb-1 h-2 w-4/5 rounded bg-slate-300" />
              <div className="mb-1 h-1.5 w-full rounded bg-slate-200" />
              <div className="h-1.5 w-2/3 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : isProcess ? (
        <div className="relative mt-6 flex h-[50%] items-center gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="flex-1 rounded border bg-slate-50 p-2 text-center">
              <div className="mx-auto mb-2 h-5 w-5 rounded-full bg-slate-300" />
              <div className="mx-auto h-2 w-4/5 rounded bg-slate-300" />
              <div className="mx-auto mt-1 h-1.5 w-2/3 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      ) : isGrid ? (
        <div className="relative mt-4 grid h-[58%] grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded bg-slate-100 p-2">
              <div className="mb-2 h-8 rounded bg-slate-300" />
              <div className="h-1.5 w-4/5 rounded bg-slate-300" />
            </div>
          ))}
        </div>
      ) : (
        <div className="relative mt-4 grid h-[58%] grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded border bg-slate-50 p-2">
              <div className="mb-2 h-5 w-5 rounded-full bg-slate-300" />
              <div className="mb-1 h-2 w-3/4 rounded bg-slate-300" />
              <div className="h-1.5 w-full rounded bg-slate-200" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function OriginalSlideImage({ slide }: { slide: SlideReference }) {
  if (!slide.imageUrl) return <SlideMock slide={slide} />;
  return <img src={slide.imageUrl} alt={slide.title} className="aspect-video w-full rounded-md border border-slate-200 object-contain bg-white" />;
}

export default function Home() {
  const [data, setData] = useState<AppData>(seedData);
  const [selectedPageId, setSelectedPageId] = useState(seedData.pages[0]?.id || "");
  const [selectedSlideId, setSelectedSlideId] = useState(seedData.slides[0]?.id || "");
  const [tab, setTab] = useState<Tab>("recommend");
  const [query, setQuery] = useState("");
  const [paginationText, setPaginationText] = useState("");
  const [parsedPagination, setParsedPagination] = useState<Pick<AppData, "sections" | "pages"> | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("replace");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [slideDraft, setSlideDraft] = useState<SlideDraft>(emptySlideDraft);
  const [styleDraft, setStyleDraft] = useState<StyleDraft>(emptyStyleDraft);
  const [slideFile, setSlideFile] = useState<File>();
  const [styleFile, setStyleFile] = useState<File>();
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [keyStatus, setKeyStatus] = useState("서버 키 우선 사용");
  const [analyzingSlide, setAnalyzingSlide] = useState(false);
  const pageDescriptionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    repository
      .load()
      .then((loaded) => {
        setData(loaded);
        setSelectedPageId(loaded.pages[0]?.id || "");
        setSelectedSlideId(loaded.slides[0]?.id || "");
      })
      .catch((error) => setMessage(`데이터 로드 실패: ${error.message}`));
  }, []);

  const selectedPage = useMemo(() => data.pages.find((page) => page.id === selectedPageId) || data.pages[0] || null, [data.pages, selectedPageId]);
  const selectedSlide = useMemo(() => data.slides.find((slide) => slide.id === selectedSlideId) || data.slides[0] || null, [data.slides, selectedSlideId]);
  const appliedSlides = useMemo(
    () => data.slides.filter((slide) => selectedPage?.selectedSlideIds.includes(slide.id)),
    [data.slides, selectedPage]
  );
  const allTags = useMemo(() => normalizeTags(data.tags.map((tag) => tag.name).concat(data.slides.flatMap((slide) => [...slide.structureTags, ...slide.roleTags, ...slide.layoutTags, ...slide.styleTags, ...slide.elementTags]))), [data]);
  const recommendedSlides = useMemo(() => {
    return [...data.slides]
      .map((slide) => ({ slide, score: scoreSlide(slide, selectedPage, query) }))
      .sort((a, b) => b.score - a.score)
      .map((item) => item.slide);
  }, [data.slides, selectedPage, query]);
  const filteredSlides = useMemo(() => {
    const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return recommendedSlides;
    return recommendedSlides.filter((slide) => {
      const body = [slide.title, slide.sourceName, slide.memo, ...slide.roleTags, ...slide.structureTags, ...slide.layoutTags, ...slide.styleTags, ...slide.elementTags]
        .join(" ")
        .toLowerCase();
      return terms.every((term) => body.includes(term));
    });
  }, [query, recommendedSlides]);
  const prompt = useMemo(() => {
    const slides = appliedSlides.length ? appliedSlides : selectedSlide ? [selectedSlide] : [];
    return buildPrompt(selectedPage, slides, data.styles[0]?.title || "");
  }, [appliedSlides, selectedPage, selectedSlide, data.styles]);

  async function commit(next: AppData) {
    setData(next);
    setSaving(true);
    setMessage("");
    try {
      await repository.persist(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function addSection() {
    await commit(repository.createSection(data));
  }

  async function addPage(sectionId: string) {
    const next = repository.createPage(data, sectionId);
    await commit(next);
    setSelectedPageId(next.pages[next.pages.length - 1].id);
  }

  async function updatePage(page: PaginationPage) {
    await commit(repository.updatePage(data, page));
  }

  function previewPagination() {
    const parsed = parsePaginationInput(paginationText);
    if (!parsed.pages.length) return setMessage("가져올 페이지를 찾지 못했습니다. 예: 1p: 제안 배경 - 시장 변화 요약");
    setParsedPagination(parsed);
    setMessage(`${parsed.pages.length}개 페이지를 찾았습니다. 미리보기 확인 후 반영하세요.`);
  }

  async function importPagination() {
    const parsed = parsedPagination || parsePaginationInput(paginationText);
    if (!parsed.pages.length) return setMessage("가져올 페이지를 찾지 못했습니다. 예: 1p: 제안 배경 - 시장 변화 요약");

    const maxSectionOrder = Math.max(0, ...data.sections.map((section) => section.orderIndex));
    const maxPageNumber = Math.max(0, ...data.pages.map((page) => page.pageNumber));
    const appendSectionIdMap = new Map<string, string>();
    const appendedSections = parsed.sections.map((section, index) => {
      const id = `section-${crypto.randomUUID()}`;
      appendSectionIdMap.set(section.id, id);
      return { ...section, id, orderIndex: maxSectionOrder + index + 1 };
    });
    const appendedPages = parsed.pages.map((page, index) => ({
      ...page,
      id: `page-${crypto.randomUUID()}`,
      sectionId: appendSectionIdMap.get(page.sectionId) || appendedSections[0]?.id || page.sectionId,
      pageNumber: importMode === "append" ? maxPageNumber + index + 1 : page.pageNumber
    }));

    const next: AppData = importMode === "replace" ? {
      ...data,
      sections: parsed.sections,
      pages: parsed.pages
    } : {
      ...data,
      sections: [...data.sections, ...appendedSections],
      pages: [...data.pages, ...appendedPages]
    };
    await commit(next);
    setSelectedPageId((importMode === "replace" ? parsed.pages[0] : appendedPages[0])?.id || "");
    setPaginationText("");
    setParsedPagination(null);
    setMessage(`${parsed.pages.length}개 페이지를 페이지네이션에 반영했습니다.`);
  }

  function useSamplePagination() {
    setPaginationText(`섹션 1. 제안 배경
1p: 제안 배경 요약 - 시장 변화와 사업 필요성을 한 장에 정리
2p: 현재 운영 문제점 - 분산된 채널과 반복 업무 병목을 Before/After 비교 구조로 표현
섹션 2. 추진 전략
3p: 핵심 전략 3가지 - 기술 이해, 참여 확산, 채널 연결을 병렬 카드로 구성
4p: 실행 로드맵 - 단계별 일정과 담당 역할을 타임라인으로 정리`);
  }

  function handleSlidePaste(event: React.ClipboardEvent<HTMLLabelElement>) {
    const file = Array.from(event.clipboardData.files).find((item) => item.type.startsWith("image/"));
    if (!file) return;
    event.preventDefault();
    const pastedFile = new File([file], `pasted-slide-${Date.now()}.${file.type.split("/")[1] || "png"}`, { type: file.type });
    setSlideFile(pastedFile);
    setMessage("붙여넣은 이미지를 장표 등록에 넣었습니다.");
  }

  async function applySlideToPage(slideId: string) {
    if (!selectedPage) return setMessage("먼저 페이지를 선택하세요.");
    const selectedSlideIds = unique([slideId, ...selectedPage.selectedSlideIds]);
    await updatePage({ ...selectedPage, selectedSlideIds });
    setSelectedSlideId(slideId);
    setMessage(`${selectedPage.pageNumber}p에 장표 레퍼런스를 적용했습니다.`);
  }

  async function removeSlideFromPage(slideId: string) {
    if (!selectedPage) return;
    await updatePage({ ...selectedPage, selectedSlideIds: selectedPage.selectedSlideIds.filter((id) => id !== slideId) });
  }

  async function addSlide() {
    if (!slideDraft.title.trim()) return setMessage("장표 제목은 필수입니다.");
    setSaving(true);
    try {
      const next = await repository.addSlide(data, {
        ...slideDraft,
        roleTags: normalizeTags(slideDraft.roleTags),
        structureTags: normalizeTags(slideDraft.structureTags),
        layoutTags: normalizeTags(slideDraft.layoutTags),
        styleTags: normalizeTags(slideDraft.styleTags),
        elementTags: normalizeTags(slideDraft.elementTags)
      }, slideFile);
      setData(next);
      setSlideDraft(emptySlideDraft);
      setSlideFile(undefined);
      setTab("recommend");
      setSelectedSlideId(next.slides[0].id);
      setMessage("장표 레퍼런스를 등록했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "장표 등록 실패");
    } finally {
      setSaving(false);
    }
  }

  async function addStyle() {
    if (!styleDraft.title.trim()) return setMessage("디자인 레퍼런스 제목은 필수입니다.");
    setSaving(true);
    try {
      const next = await repository.addStyle(data, styleDraft, styleFile);
      setData(next);
      setStyleDraft(emptyStyleDraft);
      setStyleFile(undefined);
      setMessage("디자인 레퍼런스를 등록했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "디자인 등록 실패");
    } finally {
      setSaving(false);
    }
  }

  async function copyPrompt() {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function verifyApiKey() {
    const trimmed = apiKey.trim();

    setKeyStatus("확인 중...");
    try {
      const response = await fetch("/api/verify-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: trimmed })
      });
      if (!response.ok) throw new Error("API 키 확인 실패");
      const payload = await response.json();
      setKeyStatus(payload.mode === "server" ? "서버 OpenAI 키 사용 가능" : "임시 입력 키 확인 완료");
    } catch {
      setKeyStatus("API 키를 확인하지 못했습니다.");
    }
  }

  async function analyzeSlideImage() {
    const trimmed = apiKey.trim();
    if (!slideFile) return setMessage("분석할 장표 이미지를 먼저 업로드하세요.");

    setAnalyzingSlide(true);
    setMessage("AI가 장표를 분석하는 중입니다...");
    try {
      const formData = new FormData();
      if (trimmed) formData.append("apiKey", trimmed);
      formData.append("file", slideFile);

      const response = await fetch("/api/analyze-slide", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "AI 분석 실패");

      const analysis = payload.analysis || {};
      setSlideDraft((prev) => ({
        ...prev,
        title: analysis.title || prev.title,
        roleTags: analysis.roleTags?.length ? normalizeTags(analysis.roleTags) : prev.roleTags,
        structureTags: analysis.structureTags?.length ? normalizeTags(analysis.structureTags) : prev.structureTags,
        layoutTags: analysis.layoutTags?.length ? normalizeTags(analysis.layoutTags) : prev.layoutTags,
        styleTags: analysis.styleTags?.length ? normalizeTags(analysis.styleTags) : prev.styleTags,
        elementTags: analysis.elementTags?.length ? normalizeTags(analysis.elementTags) : prev.elementTags,
        memo: analysis.memo || prev.memo
      }));
      setMessage("AI 분석 결과를 등록 폼에 채웠습니다. 저장 전 내용만 확인하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI 분석 실패");
    } finally {
      setAnalyzingSlide(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="mx-auto max-w-[1480px] p-4">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">PPT Reference Manager</h1>
            <p className="mt-1 text-sm text-slate-500">페이지 구조를 먼저 잡고, 태그 기반으로 장표 레퍼런스와 GPT 프롬프트를 빠르게 찾는 내부용 MVP</p>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-slate-600">
            <Database className="h-4 w-4" />
            {repository.mode === "supabase" ? "Supabase 연결" : "로컬 데모 저장소"}
            {saving && <span className="text-slate-400">저장 중...</span>}
          </div>
        </header>

        <div className="mb-3 rounded-lg border bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Sparkles className="h-4 w-4" />
              AI 분석
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setKeyStatus("서버 키 우선 사용");
              }}
              placeholder="팀 서버 키가 없을 때만 임시 API 키 입력"
              className="min-w-[260px] flex-1 rounded-lg border px-3 py-2 text-sm"
            />
            <Button variant="outline" onClick={verifyApiKey}>
              확인
            </Button>
            {keyStatus && <span className="text-sm text-slate-500">{keyStatus}</span>}
          </div>
        </div>

        {message && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">{message}</div>}

        <div className="mb-3 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {[
            ["recommend", "추천 탐색", Sparkles],
            ["library", "장표 등록", ImagePlus],
            ["style", "디자인 등록", Layers3]
          ].map(([key, label, Icon]) => (
            <button
              key={String(key)}
              onClick={() => setTab(key as Tab)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                tab === key ? "bg-slate-950 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {String(label)}
            </button>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_380px]">
          <aside className="min-h-[720px] rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="font-semibold">페이지네이션</div>
                <div className="text-xs text-slate-500">GPTs 결과 붙여넣기/수정/추가/삭제</div>
              </div>
              <Button variant="outline" className="px-2" onClick={addSection}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="border-b p-3">
              <textarea
                value={paginationText}
                onChange={(event) => {
                  setPaginationText(event.target.value);
                  setParsedPagination(null);
                }}
                placeholder={"GPTs가 만든 긴 페이지네이션을 붙여넣으세요.\n예: 1p: 제안 배경 - 시장 변화 요약"}
                className="h-28 w-full resize-none rounded-lg border px-3 py-2 text-xs leading-5 outline-none focus:border-slate-500"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Button variant="outline" className="px-2 text-xs" onClick={useSamplePagination}>
                  <FileText className="h-4 w-4" />
                  예시
                </Button>
                <Button className="px-2 text-xs" onClick={previewPagination} disabled={!paginationText.trim()}>
                  미리보기
                </Button>
              </div>
              {parsedPagination && (
                <div className="mt-3 rounded-lg border bg-slate-50 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">{parsedPagination.pages.length}개 페이지 확인</span>
                    <select
                      value={importMode}
                      onChange={(event) => setImportMode(event.target.value as ImportMode)}
                      className="rounded-md border bg-white px-2 py-1 text-xs"
                    >
                      <option value="replace">기존 페이지 교체</option>
                      <option value="append">뒤에 추가</option>
                    </select>
                  </div>
                  <div className="max-h-36 space-y-1 overflow-auto">
                    {parsedPagination.pages.slice(0, 8).map((page) => (
                      <div key={page.id} className="rounded border bg-white px-2 py-1 text-xs">
                        <span className="font-semibold">{page.pageNumber}p</span> {page.title}
                        <div className="mt-1 truncate text-slate-500">{joinTags(page.structureTags) || "태그 없음"}</div>
                      </div>
                    ))}
                  </div>
                  <Button className="mt-2 w-full px-2 text-xs" onClick={importPagination}>
                    확인 후 반영
                  </Button>
                </div>
              )}
            </div>
            <div className="max-h-[470px] overflow-auto p-2">
              {data.sections
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((section) => {
                  const pages = data.pages.filter((page) => page.sectionId === section.id).sort((a, b) => a.pageNumber - b.pageNumber);
                  return (
                    <div key={section.id} className="mb-2 rounded-lg border">
                      <div className="flex items-center gap-2 bg-slate-50 px-2 py-2">
                        <button onClick={() => commit(repository.updateSection(data, { ...section, isOpen: !section.isOpen }))} className="rounded p-1 hover:bg-white">
                          {section.isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <input
                          value={section.title}
                          onChange={(event) => commit(repository.updateSection(data, { ...section, title: event.target.value }))}
                          className="min-w-0 flex-1 rounded bg-transparent px-1 py-1 text-sm font-semibold outline-none focus:bg-white"
                        />
                        <button className="rounded p-1 text-slate-400 hover:bg-white hover:text-red-600" onClick={() => commit(repository.deleteSection(data, section.id))}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {section.isOpen && (
                        <div className="p-2">
                          {pages.map((page) => (
                            <button
                              key={page.id}
                              onClick={() => setSelectedPageId(page.id)}
                              className={`mb-1 w-full rounded-md px-3 py-2 text-left transition ${selectedPage?.id === page.id ? "bg-slate-950 text-white" : "hover:bg-slate-100"}`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="w-9 shrink-0 text-xs opacity-70">{page.pageNumber}p</span>
                                <span className="min-w-0 flex-1 truncate text-sm font-medium">{page.title}</span>
                              </div>
                            </button>
                          ))}
                          <button className="mt-1 w-full rounded-md border border-dashed px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50" onClick={() => addPage(section.id)}>
                            + 페이지 추가
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </aside>

          <section className="min-w-0 space-y-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 font-semibold">
                    <BookOpen className="h-4 w-4" />
                    선택 페이지
                  </div>
                  <p className="mt-1 text-xs text-slate-500">페이지 설명과 정보구조 태그가 추천 결과에 반영됩니다.</p>
                </div>
                {selectedPage && (
                  <Button variant="ghost" onClick={() => commit(repository.deletePage(data, selectedPage.id))}>
                    <Trash2 className="h-4 w-4" />
                    삭제
                  </Button>
                )}
              </div>
              {selectedPage ? (
                <div className="grid gap-3 md:grid-cols-[90px_1fr]">
                  <input
                    type="number"
                    value={selectedPage.pageNumber}
                    onChange={(event) => updatePage({ ...selectedPage, pageNumber: Number(event.target.value) })}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <input
                    value={selectedPage.title}
                    onChange={(event) => updatePage({ ...selectedPage, title: event.target.value })}
                    className="rounded-lg border px-3 py-2 text-sm"
                  />
                  <textarea
                    ref={pageDescriptionRef}
                    value={selectedPage.description}
                    onChange={(event) => updatePage({ ...selectedPage, description: event.target.value })}
                    className="min-h-20 rounded-lg border px-3 py-2 text-sm md:col-span-2"
                  />
                  <input
                    value={joinTags(selectedPage.structureTags)}
                    onChange={(event) => updatePage({ ...selectedPage, structureTags: normalizeTags(splitTags(event.target.value)) })}
                    placeholder="정보구조 태그: 병렬, 비교, 단계"
                    className="rounded-lg border px-3 py-2 text-sm md:col-span-2"
                  />
                  <div className="rounded-lg border bg-slate-50 p-3 md:col-span-2">
                    <div className="mb-2 text-xs font-semibold text-slate-600">이 페이지에 적용한 장표</div>
                    {appliedSlides.length ? (
                      <div className="flex flex-wrap gap-2">
                        {appliedSlides.map((slide) => (
                          <button
                            key={slide.id}
                            onClick={() => setSelectedSlideId(slide.id)}
                            className="rounded-md border bg-white px-2 py-1 text-xs text-slate-700 hover:border-slate-500"
                          >
                            {slide.title}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500">아래 추천 목록에서 이 페이지에 적용할 장표를 선택하세요.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">섹션에 페이지를 추가하세요.</div>
              )}
            </div>

            {tab === "recommend" && (
              <div className="rounded-lg border bg-white p-4">
                <div className="mb-3 rounded-lg bg-slate-50 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                    <Sparkles className="h-4 w-4" />
                    선택 페이지 기반 추천
                  </div>
                  <p className="mt-1 text-xs text-slate-500">페이지 태그로 먼저 추천하고, 아래 검색어/태그로 결과를 좁힙니다.</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(selectedPage?.structureTags.length ? selectedPage.structureTags : ["페이지 태그 없음"]).map((tag) => (
                      <TagPill key={tag} active={selectedPage?.structureTags.includes(tag)}>
                        {tag}
                      </TagPill>
                    ))}
                  </div>
                </div>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div className="relative min-w-[260px] flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      placeholder="필터: 카드형, 비교, 로드맵, 보고서형"
                      className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-500"
                    />
                  </div>
                  <span className="text-sm text-slate-500">{filteredSlides.length}개 결과</span>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {allTags.slice(0, 18).map((tag) => (
                    <button key={tag} onClick={() => setQuery((prev) => unique([...splitTags(prev), tag]).join(" "))}>
                      <TagPill active={query.includes(tag)}>{tag}</TagPill>
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {filteredSlides.map((slide) => (
                    <div
                      key={slide.id}
                      onClick={() => setSelectedSlideId(slide.id)}
                      className={`rounded-lg border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${selectedSlideId === slide.id ? "border-slate-950 ring-1 ring-slate-950" : "bg-white"}`}
                    >
                      <SlideMock slide={slide} />
                      <div className="mt-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{slide.title}</div>
                          <div className="mt-1 line-clamp-2 text-xs text-slate-500">{slide.memo}</div>
                        </div>
                        <FileImage className="h-4 w-4 shrink-0 text-slate-400" />
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {unique([...slide.structureTags, ...slide.layoutTags, ...slide.styleTags]).slice(0, 5).map((tag) => (
                          <TagPill key={tag}>{tag}</TagPill>
                        ))}
                      </div>
                      <Button
                        className="mt-3 w-full"
                        variant={selectedPage?.selectedSlideIds.includes(slide.id) ? "outline" : "solid"}
                        onClick={(event) => {
                          event.stopPropagation();
                          selectedPage?.selectedSlideIds.includes(slide.id) ? removeSlideFromPage(slide.id) : applySlideToPage(slide.id);
                        }}
                      >
                        {selectedPage?.selectedSlideIds.includes(slide.id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {selectedPage?.selectedSlideIds.includes(slide.id) ? "이 페이지에 적용됨" : "이 페이지에 적용"}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "library" && (
              <div className="rounded-lg border bg-white p-4">
                <h2 className="mb-1 text-lg font-semibold">장표 레퍼런스 등록</h2>
                <p className="mb-4 text-sm text-slate-500">캡처 이미지 1장과 태그를 등록합니다. 검색 속도를 위해 태그는 짧고 일관되게 쓰는 편이 좋습니다.</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <label
                    className="flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50 p-3 text-sm text-slate-500 outline-none focus-within:border-slate-500"
                    onPaste={handleSlidePaste}
                    tabIndex={0}
                  >
                    {slideFile ? (
                      <img src={URL.createObjectURL(slideFile)} alt="" className="mb-3 aspect-video w-full rounded-md object-contain bg-white" />
                    ) : (
                      <Upload className="mb-2 h-6 w-6" />
                    )}
                    장표 이미지 업로드 또는 Ctrl+V 붙여넣기
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setSlideFile(event.target.files?.[0])} />
                    {slideFile && <span className="mt-2 text-xs text-slate-700">{slideFile.name}</span>}
                  </label>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full" onClick={analyzeSlideImage} disabled={analyzingSlide || !slideFile}>
                      {analyzingSlide ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      AI 분석으로 자동 채우기
                    </Button>
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="장표 제목" value={slideDraft.title} onChange={(event) => setSlideDraft({ ...slideDraft, title: event.target.value })} />
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="출처 문서명" value={slideDraft.sourceName} onChange={(event) => setSlideDraft({ ...slideDraft, sourceName: event.target.value })} />
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="역할 태그: 전략, 문제정의" value={joinTags(slideDraft.roleTags)} onChange={(event) => setSlideDraft({ ...slideDraft, roleTags: splitTags(event.target.value) })} />
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="정보구조 태그: 병렬, 비교" value={joinTags(slideDraft.structureTags)} onChange={(event) => setSlideDraft({ ...slideDraft, structureTags: splitTags(event.target.value) })} />
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="레이아웃 태그: 카드형, 타임라인" value={joinTags(slideDraft.layoutTags)} onChange={(event) => setSlideDraft({ ...slideDraft, layoutTags: splitTags(event.target.value) })} />
                  </div>
                  <textarea className="min-h-24 rounded-lg border px-3 py-2 text-sm md:col-span-2" placeholder="메모: 언제 쓰면 좋은 장표인지" value={slideDraft.memo} onChange={(event) => setSlideDraft({ ...slideDraft, memo: event.target.value })} />
                  <div className="grid gap-2 md:col-span-2 md:grid-cols-2">
                    <input className="rounded-lg border px-3 py-2 text-sm" placeholder="스타일 태그: 보고서형, 공공기관" value={joinTags(slideDraft.styleTags)} onChange={(event) => setSlideDraft({ ...slideDraft, styleTags: splitTags(event.target.value) })} />
                    <input className="rounded-lg border px-3 py-2 text-sm" placeholder="구성요소 태그: 아이콘, 표" value={joinTags(slideDraft.elementTags)} onChange={(event) => setSlideDraft({ ...slideDraft, elementTags: splitTags(event.target.value) })} />
                  </div>
                  <Button className="md:col-span-2" onClick={addSlide} disabled={saving}>
                    <ImagePlus className="h-4 w-4" />
                    장표 저장
                  </Button>
                </div>
              </div>
            )}

            {tab === "style" && (
              <div className="rounded-lg border bg-white p-4">
                <h2 className="mb-1 text-lg font-semibold">디자인 레퍼런스 등록</h2>
                <p className="mb-4 text-sm text-slate-500">스타일 방향은 추천 장표보다 GPT 프롬프트의 톤을 잡는 데 사용합니다.</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-slate-50 text-sm text-slate-500">
                    <Upload className="mb-2 h-6 w-6" />
                    디자인 이미지 업로드
                    <input type="file" accept="image/*" className="hidden" onChange={(event) => setStyleFile(event.target.files?.[0])} />
                    {styleFile && <span className="mt-2 text-xs text-slate-700">{styleFile.name}</span>}
                  </label>
                  <div className="space-y-2">
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="스타일 제목" value={styleDraft.title} onChange={(event) => setStyleDraft({ ...styleDraft, title: event.target.value })} />
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="톤: 신뢰감, 미래지향" value={styleDraft.tone} onChange={(event) => setStyleDraft({ ...styleDraft, tone: event.target.value })} />
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="색상: #1f2937, #2563eb" value={joinTags(styleDraft.colors)} onChange={(event) => setStyleDraft({ ...styleDraft, colors: splitTags(event.target.value) })} />
                    <input className="w-full rounded-lg border px-3 py-2 text-sm" placeholder="스타일 태그" value={joinTags(styleDraft.styleTags)} onChange={(event) => setStyleDraft({ ...styleDraft, styleTags: splitTags(event.target.value) })} />
                  </div>
                  <textarea className="min-h-24 rounded-lg border px-3 py-2 text-sm md:col-span-2" placeholder="레이아웃/무드 메모" value={styleDraft.layoutNotes} onChange={(event) => setStyleDraft({ ...styleDraft, layoutNotes: event.target.value })} />
                  <Button className="md:col-span-2" onClick={addStyle} disabled={saving}>
                    <Layers3 className="h-4 w-4" />
                    디자인 저장
                  </Button>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {data.styles.map((style) => (
                    <div key={style.id} className="rounded-lg border p-3">
                      {style.imageUrl ? <img src={style.imageUrl} alt={style.title} className="aspect-video w-full rounded object-cover" /> : <div className="aspect-video rounded bg-slate-100" />}
                      <div className="mt-3 font-semibold">{style.title}</div>
                      <div className="text-sm text-slate-500">{style.tone}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border bg-white p-4">
              <div className="mb-3 font-semibold">선택 장표</div>
              {selectedSlide ? (
                <>
                  <OriginalSlideImage slide={selectedSlide} />
                  {selectedSlide.imageUrl && (
                    <div className="mt-3">
                      <div className="mb-1 text-xs font-semibold text-slate-500">구조 썸네일</div>
                      <SlideMock slide={selectedSlide} />
                    </div>
                  )}
                  <div className="mt-3 font-semibold">{selectedSlide.title}</div>
                  <div className="mt-1 text-sm text-slate-500">{selectedSlide.sourceName}{selectedSlide.pageNumber ? ` · p.${selectedSlide.pageNumber}` : ""}</div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{selectedSlide.memo}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {unique([...selectedSlide.roleTags, ...selectedSlide.structureTags, ...selectedSlide.layoutTags, ...selectedSlide.styleTags, ...selectedSlide.elementTags]).map((tag) => (
                      <TagPill key={tag}>{tag}</TagPill>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-lg bg-slate-50 p-8 text-center text-sm text-slate-500">장표를 선택하세요.</div>
              )}
            </div>

            <div className="rounded-lg border bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2 font-semibold">
                  <Wand2 className="h-4 w-4" />
                  GPT 프롬프트
                </div>
                <Button variant="outline" className="px-2 py-1 text-xs" onClick={copyPrompt}>
                  {copied ? <Clipboard className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "복사됨" : "복사"}
                </Button>
              </div>
              <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-xs leading-6 text-slate-100">{prompt}</pre>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
