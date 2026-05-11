export type ReferenceKind = "slide" | "style";

export type Tag = {
  id: string;
  name: string;
  category: "structure" | "role" | "layout" | "style" | "element" | "custom";
};

export type PaginationPage = {
  id: string;
  sectionId: string;
  pageNumber: number;
  title: string;
  description: string;
  structureTags: string[];
  selectedSlideIds: string[];
};

export type PaginationSection = {
  id: string;
  title: string;
  orderIndex: number;
  isOpen: boolean;
};

export type SlideReference = {
  id: string;
  title: string;
  imageUrl: string;
  sourceName: string;
  pageNumber?: number;
  roleTags: string[];
  structureTags: string[];
  layoutTags: string[];
  styleTags: string[];
  elementTags: string[];
  memo: string;
  createdAt: string;
};

export type StyleReference = {
  id: string;
  title: string;
  imageUrl: string;
  tone: string;
  colors: string[];
  layoutNotes: string;
  styleTags: string[];
  createdAt: string;
};

export type AppData = {
  sections: PaginationSection[];
  pages: PaginationPage[];
  slides: SlideReference[];
  styles: StyleReference[];
  tags: Tag[];
};

export type SlideDraft = Omit<SlideReference, "id" | "imageUrl" | "createdAt">;
export type StyleDraft = Omit<StyleReference, "id" | "imageUrl" | "createdAt">;
