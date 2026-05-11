import { AppData } from "./types";

const now = new Date().toISOString();

export const seedData: AppData = {
  sections: [
    { id: "section-1", title: "제안 배경", orderIndex: 1, isOpen: true },
    { id: "section-2", title: "문제 정의", orderIndex: 2, isOpen: true },
    { id: "section-3", title: "전략 구조", orderIndex: 3, isOpen: true },
    { id: "section-4", title: "콘텐츠 예시", orderIndex: 4, isOpen: false }
  ],
  pages: [
    {
      id: "page-1",
      sectionId: "section-1",
      pageNumber: 1,
      title: "제안 배경 요약",
      description: "시장 변화와 사업 필요성을 한 장에서 정리",
      structureTags: ["요약", "배경"],
      selectedSlideIds: ["slide-1"]
    },
    {
      id: "page-2",
      sectionId: "section-2",
      pageNumber: 2,
      title: "현재 운영 문제점",
      description: "분산된 채널과 반복 업무의 병목을 비교 구조로 표현",
      structureTags: ["비교", "문제정의"],
      selectedSlideIds: ["slide-3"]
    },
    {
      id: "page-3",
      sectionId: "section-3",
      pageNumber: 3,
      title: "핵심 전략 3가지",
      description: "기술 이해, 참여 확산, 채널 연결을 병렬 카드로 표현",
      structureTags: ["병렬", "3가지"],
      selectedSlideIds: ["slide-1", "slide-2"]
    }
  ],
  slides: [
    {
      id: "slide-1",
      title: "3대 전략 카드형",
      imageUrl: "",
      sourceName: "샘플 레퍼런스",
      pageNumber: 12,
      roleTags: ["전략", "핵심메시지"],
      structureTags: ["병렬", "3가지"],
      layoutTags: ["카드형", "3열"],
      styleTags: ["공공기관", "보고서형"],
      elementTags: ["아이콘", "짧은설명"],
      memo: "동등한 무게의 3개 전략을 설명할 때 적합",
      createdAt: now
    },
    {
      id: "slide-2",
      title: "단계별 프로세스",
      imageUrl: "",
      sourceName: "샘플 레퍼런스",
      pageNumber: 21,
      roleTags: ["실행계획", "운영전략"],
      structureTags: ["단계", "흐름"],
      layoutTags: ["타임라인", "프로세스"],
      styleTags: ["보고서형", "미니멀"],
      elementTags: ["화살표", "날짜"],
      memo: "순서가 있는 실행 흐름이나 월별 일정에 적합",
      createdAt: now
    },
    {
      id: "slide-3",
      title: "Before / After 비교",
      imageUrl: "",
      sourceName: "샘플 레퍼런스",
      pageNumber: 8,
      roleTags: ["문제정의", "개선방향"],
      structureTags: ["비교", "대조"],
      layoutTags: ["좌우분할"],
      styleTags: ["공공기관", "선명한대비"],
      elementTags: ["표", "강조박스"],
      memo: "현재 문제와 개선 후 모습을 빠르게 대비할 때 사용",
      createdAt: now
    },
    {
      id: "slide-4",
      title: "콘텐츠 예시 썸네일 그리드",
      imageUrl: "",
      sourceName: "샘플 레퍼런스",
      pageNumber: 34,
      roleTags: ["콘텐츠예시", "샘플"],
      structureTags: ["그룹핑", "나열"],
      layoutTags: ["그리드", "썸네일"],
      styleTags: ["트렌디", "시각중심"],
      elementTags: ["이미지", "캡션"],
      memo: "여러 산출물 예시를 빠르게 탐색시키는 장표",
      createdAt: now
    }
  ],
  styles: [
    {
      id: "style-1",
      title: "공공기관 보고서형",
      imageUrl: "",
      tone: "신뢰감, 정돈, 정보 중심",
      colors: ["#1f2937", "#2563eb", "#f8fafc"],
      layoutNotes: "넓은 여백, 얇은 라인, 표와 카드 중심",
      styleTags: ["공공기관", "보고서형", "미니멀"],
      createdAt: now
    }
  ],
  tags: [
    "병렬",
    "3가지",
    "비교",
    "단계",
    "요약",
    "문제정의",
    "전략",
    "카드형",
    "타임라인",
    "공공기관",
    "보고서형",
    "트렌디",
    "아이콘",
    "표"
  ].map((name, index) => ({
    id: `tag-${index + 1}`,
    name,
    category: index < 6 ? "structure" : index < 8 ? "role" : index < 10 ? "layout" : index < 12 ? "style" : "element"
  }))
};
