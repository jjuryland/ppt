import React, { useMemo, useState } from "react";

const initialGroups = [
  {
    id: "section-1",
    section: "제안 배경",
    open: true,
    pages: [
      { id: "page-1", page: 1, title: "표지", desc: "2026 SNS 운영 제안서" },
      { id: "page-2", page: 2, title: "시장 환경", desc: "시장/트렌드 변화 요약" },
    ],
  },
  {
    id: "section-2",
    section: "문제 정의",
    open: false,
    pages: [{ id: "page-3", page: 3, title: "현재 운영 문제점", desc: "정보 전달 중심 구조의 한계" }],
  },
  {
    id: "section-3",
    section: "전략 구조",
    open: true,
    pages: [{ id: "page-4", page: 4, title: "핵심 전략 구조", desc: "기술 이해 → 참여 확산 → 채널 연결" }],
  },
  {
    id: "section-4",
    section: "콘텐츠",
    open: false,
    pages: [{ id: "page-5", page: 5, title: "콘텐츠 예시", desc: "숏폼 및 카드뉴스 예시" }],
  },
  {
    id: "section-5",
    section: "운영 프로세스",
    open: false,
    pages: [{ id: "page-6", page: 6, title: "운영 프로세스", desc: "기획부터 리포트까지 운영 흐름" }],
  },
];

const sampleSlides = [
  {
    id: 1,
    title: "3단 전략 카드형",
    role: "운영전략",
    structure: "병렬",
    layout: "3단 카드",
    style: "공공기관",
    elements: "아이콘+텍스트",
    memo: "동등한 3개 전략을 설명할 때 적합",
  },
  {
    id: 2,
    title: "단계형 프로세스",
    role: "운영전략",
    structure: "단계",
    layout: "프로세스",
    style: "보고서형",
    elements: "화살표+도형",
    memo: "순서가 있는 실행 흐름에 적합",
  },
  {
    id: 3,
    title: "Before / After 비교형",
    role: "문제정의",
    structure: "비교",
    layout: "좌우분할",
    style: "공공기관",
    elements: "표+텍스트",
    memo: "현재 문제와 개선 방향 비교에 적합",
  },
  {
    id: 4,
    title: "콘텐츠 예시 썸네일형",
    role: "콘텐츠예시",
    structure: "그룹핑",
    layout: "그리드",
    style: "트렌디",
    elements: "이미지+설명",
    memo: "콘텐츠 유형이나 예시를 빠르게 보여줄 때 적합",
  },
  {
    id: 5,
    title: "핵심 메시지 강조형",
    role: "핵심메시지",
    structure: "강조",
    layout: "중앙집중",
    style: "미니멀",
    elements: "큰문장+도형",
    memo: "한 문장으로 설득해야 하는 장표에 적합",
  },
  {
    id: 6,
    title: "로드맵 타임라인형",
    role: "일정",
    structure: "단계",
    layout: "타임라인",
    style: "보고서형",
    elements: "날짜+카드",
    memo: "월별 실행계획이나 단계별 일정을 보여줄 때 적합",
  },
];

const prompt = `[STYLE]\n공공기관 보고서형 슬라이드. 네이비/화이트 기반, 얇은 라인, 넓은 여백, 정보 밀도는 높지만 정돈된 느낌. 과한 3D 효과와 장식 요소는 사용하지 않음.\n\n[STRUCTURE]\n상단에는 제목과 한 줄 핵심 메시지. 본문은 가로 3단 카드 구조. 각 카드에는 아이콘, 소제목, 2줄 설명을 배치.\n\n[PURPOSE]\nSNS 운영 전략 3가지를 동등한 비중으로 설명하는 장표.\n\n[CONTENT]\n1. 기술 이해\n2. 참여 확산\n3. 채널 연결\n\n[OUTPUT]\n16:9 비율의 PPT 슬라이드 이미지처럼 제작.`;

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl bg-white shadow-sm ${className}`}>{children}</div>;
}

function Button({ children, className = "", variant = "solid", onClick }) {
  const base = "rounded-xl px-4 py-2 text-sm font-medium transition";
  const styles =
    variant === "outline"
      ? "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      : "bg-slate-900 text-white hover:bg-slate-700";

  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      {children}
    </button>
  );
}

function SlideMock({ item }) {
  const isProcess = item.layout.includes("프로세스") || item.layout.includes("타임라인");
  const isCompare = item.layout.includes("좌우");
  const isGrid = item.layout.includes("그리드");

  return (
    <div className="aspect-video rounded-xl border bg-white p-3 shadow-sm">
      <div className="h-2 w-1/2 rounded-full bg-slate-300" />
      <div className="mt-2 h-1.5 w-1/3 rounded-full bg-slate-200" />

      {isCompare ? (
        <div className="mt-5 grid h-24 grid-cols-2 gap-3">
          {["Before", "After"].map((label) => (
            <div key={label} className="rounded-lg border bg-slate-50 p-2">
              <div className="mb-2 text-[9px] font-bold text-slate-500">{label}</div>
              <div className="mb-1 h-2 w-4/5 rounded-full bg-slate-300" />
              <div className="mb-1 h-1.5 w-full rounded-full bg-slate-200" />
              <div className="h-1.5 w-2/3 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      ) : isProcess ? (
        <div className="mt-7 flex h-20 items-center gap-2">
          {[1, 2, 3].map((n) => (
            <React.Fragment key={n}>
              <div className="flex-1 rounded-lg border bg-slate-50 p-2 text-center">
                <div className="mx-auto mb-2 h-5 w-5 rounded-full bg-slate-300" />
                <div className="mx-auto h-2 w-4/5 rounded-full bg-slate-300" />
                <div className="mx-auto mt-1 h-1.5 w-2/3 rounded-full bg-slate-200" />
              </div>
              {n < 3 && <div className="text-slate-300">→</div>}
            </React.Fragment>
          ))}
        </div>
      ) : isGrid ? (
        <div className="mt-5 grid h-24 grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg bg-slate-100 p-2">
              <div className="mb-2 h-10 rounded-md bg-slate-300" />
              <div className="h-1.5 w-4/5 rounded-full bg-slate-300" />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 grid h-24 grid-cols-3 gap-2">
          {[0, 1, 2].map((n) => (
            <div key={n} className="rounded-lg border bg-slate-50 p-2">
              <div className="mb-2 h-5 w-5 rounded-full bg-slate-300" />
              <div className="mb-1 h-2 w-3/4 rounded-full bg-slate-300" />
              <div className="h-1.5 w-full rounded-full bg-slate-200" />
              <div className="mt-1 h-1.5 w-2/3 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-1 text-[10px] text-slate-500">
        <span>{item.role}</span>
        <span>·</span>
        <span>{item.structure}</span>
        <span>·</span>
        <span>{item.layout}</span>
      </div>
    </div>
  );
}

export default function ProposalReferenceToolWireframe() {
  const [query, setQuery] = useState("SNS 운영 전략 3가지를 보여주는 장표");
  const [groups, setGroups] = useState(initialGroups);
  const [selectedPage, setSelectedPage] = useState(initialGroups[2].pages[0]);
  const [selected, setSelected] = useState(sampleSlides[0]);
  const [tab, setTab] = useState("recommend");
  const [showGuide, setShowGuide] = useState(false);

  const toggleGroup = (groupId) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId ? { ...group, open: !group.open } : group
      )
    );
  };

  const updateSectionName = (groupId, value) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId ? { ...group, section: value } : group
      )
    );
  };

  const updatePageTitle = (groupId, pageId, value) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? {
              ...group,
              pages: group.pages.map((page) =>
                page.id === pageId ? { ...page, title: value } : page
              ),
            }
          : group
      )
    );

    if (selectedPage.id === pageId) {
      setSelectedPage((prev) => ({ ...prev, title: value }));
    }
  };

  const addPageToGroup = (groupId) => {
    const totalPages = groups.reduce((sum, group) => sum + group.pages.length, 0);
    const newPage = {
      id: `page-${Date.now()}`,
      page: totalPages + 1,
      title: "새 페이지",
      desc: "페이지 설명 입력",
    };

    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, open: true, pages: [...group.pages, newPage] }
          : group
      )
    );
    setSelectedPage(newPage);
  };

  const deletePage = (groupId, pageId) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.id === groupId
          ? { ...group, pages: group.pages.filter((page) => page.id !== pageId) }
          : group
      )
    );

    if (selectedPage.id === pageId) {
      const remaining = groups
        .flatMap((group) => group.pages)
        .filter((page) => page.id !== pageId);
      if (remaining[0]) setSelectedPage(remaining[0]);
    }
  };

  const deleteSection = (groupId) => {
    const target = groups.find((group) => group.id === groupId);
    setGroups((prev) => prev.filter((group) => group.id !== groupId));

    if (target?.pages.some((page) => page.id === selectedPage.id)) {
      const remaining = groups
        .filter((group) => group.id !== groupId)
        .flatMap((group) => group.pages);
      if (remaining[0]) setSelectedPage(remaining[0]);
    }
  };

  const addSection = () => {
    const newGroup = {
      id: `section-${Date.now()}`,
      section: "새 섹션",
      open: true,
      pages: [],
    };
    setGroups((prev) => [...prev, newGroup]);
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return sampleSlides;
    const normalized = query.replace(/장표|보여주는|싶어|하는|추천|찾아줘/g, "").trim();
    const terms = normalized.split(/\s+/).filter(Boolean);
    if (terms.length === 0) return sampleSlides;
    return sampleSlides.filter((s) =>
      terms.some((term) =>
        [s.title, s.role, s.structure, s.layout, s.style, s.elements, s.memo]
          .join(" ")
          .includes(term)
      )
    );
  }, [query]);

  const results = filtered.length ? filtered : sampleSlides;

  return (
    <div className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Proposal Reference Assistant</h1>
            <p className="mt-1 text-sm text-slate-500">장표 레퍼런스 검색 · 추천 · GPT 이미지 생성 프롬프트 복사</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowGuide(!showGuide)}>작동/보안 안내</Button>
            <Button onClick={() => setTab("library")}>＋ 장표 등록</Button>
          </div>
        </header>

        {showGuide && (
          <Card className="mb-5 border border-slate-200">
            <div className="grid grid-cols-3 gap-4 p-5 text-sm">
              <div>
                <div className="mb-2 font-bold">어떻게 작동하나요?</div>
                <p className="text-slate-600">페이지 내용을 보고 정보 구조를 분석한 뒤, 태그가 맞는 장표 레퍼런스를 추천합니다. GPT는 추천/프롬프트 생성 보조 역할만 합니다.</p>
              </div>
              <div>
                <div className="mb-2 font-bold">프로그램은 안전한가요?</div>
                <p className="text-slate-600">이 프로그램은 사내 NAS/서버 내부에서 레퍼런스를 관리하는 구조를 권장합니다. 실제 PPT 원본 전체를 외부 AI에 업로드하기보다, 장표 분류용 태그·정보 구조·스타일 설명 등 최소 정보만 활용하는 방식으로 운영 가능합니다.</p>
              </div>
              
            </div>
          </Card>
        )}

        <div className="mb-4 flex gap-2 border-b pb-3">
          {[
            ["recommend", "✨ 페이지 추천"],
            ["search", "🔍 장표 검색"],
            ["library", "▦ 라이브러리"],
            ["style", "🎨 디자인 레퍼런스"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                tab === key ? "bg-slate-900 text-white" : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[280px_1fr_360px] gap-5">
          <aside className="space-y-3">
            <Card>
              <div className="border-b p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">페이지네이션</div>
                    <p className="mt-1 text-xs text-slate-500">섹션/페이지를 직접 수정</p>
                  </div>
                  <div className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-500">개별 수정</div>
                </div>
              </div>

              <div className="max-h-[600px] overflow-auto p-2">
                {groups.map((group) => (
                  <div key={group.id} className="mb-2 overflow-hidden rounded-xl border bg-white">
                    <div className="flex items-center justify-between bg-slate-50 px-3 py-3">
                      <div className="flex flex-1 items-center gap-2">
                        <button
                          onClick={() => toggleGroup(group.id)}
                          className="rounded px-1 hover:bg-white"
                        >
                          {group.open ? "▼" : "▶"}
                        </button>
                        <input
                          value={group.section}
                          onChange={(e) => updateSectionName(group.id, e.target.value)}
                          className="w-full rounded-md bg-transparent px-1 py-0.5 text-sm font-semibold outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-slate-300"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-slate-500">{group.pages.length}개</div>
                        <button
                          onClick={() => deleteSection(group.id)}
                          className="rounded px-1 text-xs text-slate-400 hover:bg-white hover:text-red-500"
                        >
                          삭제
                        </button>
                      </div>
                    </div>

                    {group.open && (
                      <div className="border-t bg-white p-2">
                        {group.pages.map((page) => (
                          <button
                            key={page.id}
                            onClick={() => setSelectedPage(page)}
                            className={`mb-1 w-full rounded-lg px-3 py-2 text-left transition ${
                              selectedPage.id === page.id ? "bg-slate-900 text-white" : "hover:bg-slate-100"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className={`shrink-0 text-sm ${
                                  selectedPage.id === page.id ? "text-slate-300" : "text-slate-400"
                                }`}
                              >
                                ㄴ {page.page}P
                              </span>
                              <input
                                value={page.title}
                                onChange={(e) => updatePageTitle(group.id, page.id, e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className={`w-full rounded-md bg-transparent px-1 py-0.5 text-sm outline-none hover:bg-white/70 focus:bg-white focus:text-slate-900 focus:ring-1 focus:ring-slate-300 ${
                                  selectedPage.id === page.id ? "text-white" : "text-slate-800"
                                }`}
                              />
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deletePage(group.id, page.id);
                                }}
                                className={`shrink-0 rounded px-1 text-xs ${selectedPage.id === page.id ? "text-slate-300 hover:bg-white/20" : "text-slate-400 hover:bg-slate-200 hover:text-red-500"}`}
                              >
                                삭제
                              </span>
                            </div>
                          </button>
                        ))}
                        <button
                          onClick={() => addPageToGroup(group.id)}
                          className="mt-1 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2 text-left text-xs text-slate-500 hover:bg-slate-50"
                        >
                          ＋ 페이지 추가
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t p-3">
                <button
                  onClick={addSection}
                  className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"
                >
                  ＋ 섹션 추가
                </button>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="mb-3 text-sm font-semibold">정보 구조 태그</div>
                <div className="space-y-2 text-xs">
                  {["병렬", "단계", "비교", "강조", "확장", "흐름", "요약", "설득"].map((tag) => (
                    <span key={tag} className="mr-1 inline-block rounded-full bg-slate-100 px-3 py-1 text-slate-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          </aside>

          <main className="space-y-4">
            {tab === "recommend" && (
              <>
                <Card>
                  <div className="p-4">
                    <label className="mb-2 block text-sm font-semibold">선택한 페이지 정보</label>
                    <div className="whitespace-pre-line rounded-2xl border bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-700">
                      {`${selectedPage.page}p. ${selectedPage.title}\n${selectedPage.desc}`}
                    </div>
                    <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                      <b>정보 구조</b> 병렬 · 3개 요소 · 카드형 표현 추천
                    </div>
                  </div>
                </Card>

                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-semibold">추천 장표</h2>
                    <span className="text-sm text-slate-500">{results.length}개 후보</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {results.map((item) => (
                      <Card
                        key={item.id}
                        className={`cursor-pointer p-3 transition hover:-translate-y-0.5 hover:shadow-md ${
                          selected.id === item.id ? "ring-2 ring-slate-900" : ""
                        }`}
                      >
                        <div onClick={() => setSelected(item)}>
                          <SlideMock item={item} />
                          <div className="mt-3 flex items-start justify-between gap-2">
                            <div>
                              <h3 className="text-sm font-semibold">{item.title}</h3>
                              <p className="mt-1 text-xs text-slate-500">{item.memo}</p>
                            </div>
                            <span className="text-slate-400">☆</span>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              </>
            )}

            {tab === "search" && (
              <Card>
                <div className="p-5">
                  <div className="mb-4">
                    <h2 className="text-lg font-bold">장표 검색</h2>
                    <p className="mt-1 text-sm text-slate-500">원하는 장표를 직접 검색해서 탐색합니다.</p>
                  </div>
                  <div className="mb-5 flex gap-2">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="예: 운영 전략 3단 카드형"
                      className="flex-1 rounded-xl border bg-white px-4 py-3 text-sm outline-none"
                    />
                    <Button>검색</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {results.map((item) => (
                      <Card
                        key={item.id}
                        className={`cursor-pointer p-3 transition hover:-translate-y-0.5 hover:shadow-md ${
                          selected.id === item.id ? "ring-2 ring-slate-900" : ""
                        }`}
                      >
                        <div onClick={() => setSelected(item)}>
                          <SlideMock item={item} />
                          <div className="mt-3">
                            <h3 className="text-sm font-semibold">{item.title}</h3>
                            <p className="mt-1 text-xs text-slate-500">{item.memo}</p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {tab === "library" && (
              <Card>
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">장표 라이브러리 등록</h2>
                      <p className="mt-1 text-sm text-slate-500">좋은 레퍼런스 장표를 등록하고 태그를 입력합니다.</p>
                    </div>
                    <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-500">
                      우상단 [장표 등록]과 같은 기능입니다
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      <div className="mb-3 font-semibold text-slate-700">장표 이미지 업로드 영역</div>
                      <div className="rounded-xl bg-amber-50 p-3 text-left text-xs leading-relaxed text-amber-800">
                        등록 전 확인: 클라이언트명, 계약금액, 내부 전략, 담당자 정보 등 민감한 내용은 삭제하거나 가린 뒤 올려주세요.
                      </div>
                    </div>
                    <div className="space-y-3 rounded-2xl border bg-white p-4">
                      {[
                        ["페이지 역할", "예: 운영전략"],
                        ["정보 구조", "예: 병렬 / 단계 / 비교"],
                        ["스타일", "예: 공공기관형"],
                      ].map(([label, placeholder]) => (
                        <div key={label}>
                          <label className="mb-1 block text-xs font-semibold text-slate-500">{label}</label>
                          <input className="w-full rounded-xl border px-3 py-2 text-sm" placeholder={placeholder} />
                        </div>
                      ))}
                      <Button className="w-full">저장</Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {tab === "style" && (
              <Card>
                <div className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold">디자인 레퍼런스 관리</h2>
                      <p className="mt-1 text-sm text-slate-500">대표 스타일 슬라이드를 등록해 디자인 톤/분위기를 관리합니다. 추천 장표와 GPT 프롬프트 생성 시 함께 활용됩니다.</p>
                    </div>
                    <Button>＋ 스타일 이미지 등록</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                      <div className="mb-3 font-semibold text-slate-700">스타일 레퍼런스 이미지 업로드</div>
                      <div className="mx-auto max-w-xl rounded-xl bg-white p-4 text-left text-xs leading-relaxed text-slate-600">
                        추천 방식: PPT 전체보다 대표 슬라이드 캡처(표지, 전략, 콘텐츠 예시 등)를 등록하는 것을 권장합니다.
                        <br />
                        등록된 스타일은 색감, 여백감, 정보 밀도, 도형 스타일 등을 분석해 GPT 프롬프트 생성 시 함께 반영됩니다.
                      </div>
                    </div>

                    {["KT 공공기관형", "트렌디 SNS형", "스타트업 IR형", "미니멀 보고서형"].map((style) => (
                      <div key={style} className="overflow-hidden rounded-2xl border bg-white">
                        <div className="aspect-video bg-slate-200" />
                        <div className="p-4">
                          <div className="mb-2 font-semibold">{style}</div>
                          <div className="text-xs leading-relaxed text-slate-500">
                            네이비/화이트 기반 · 넓은 여백 · 얇은 라인 · 카드형 레이아웃
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </main>

          <aside className="space-y-4">
            <Card>
              <div className="p-4">
                <div className="mb-3 font-semibold">선택한 장표</div>
                <SlideMock item={selected} />
                <div className="mt-4 space-y-2 text-sm">
                  <div><b>역할</b> {selected.role}</div>
                  <div><b>정보 구조</b> {selected.structure}</div>
                  <div><b>레이아웃</b> {selected.layout}</div>
                  <div><b>스타일</b> {selected.style}</div>
                  <div><b>구성요소</b> {selected.elements}</div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold">GPT 이미지 생성 프롬프트</h3>
                  <Button variant="outline" className="px-3 py-1 text-xs">복사</Button>
                </div>
                <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-950 p-3 text-xs leading-relaxed text-slate-100">
                  {prompt}
                </pre>
              </div>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
