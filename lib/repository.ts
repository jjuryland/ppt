"use client";

import { AppData, PaginationPage, PaginationSection, SlideDraft, SlideReference, StyleDraft, StyleReference } from "./types";
import { seedData } from "./seed";
import { isSupabaseConfigured, storageBucket, supabase } from "./supabase";

const LOCAL_KEY = "ppt-reference:data:v1";

function cloneSeed(): AppData {
  return JSON.parse(JSON.stringify(seedData)) as AppData;
}

function normalizeData(data: Partial<AppData> | null): AppData {
  const seed = cloneSeed();
  return {
    sections: data?.sections?.length ? data.sections : seed.sections,
    pages: data?.pages?.length ? data.pages : seed.pages,
    slides: data?.slides?.length ? data.slides : seed.slides,
    styles: data?.styles?.length ? data.styles : seed.styles,
    tags: data?.tags?.length ? data.tags : seed.tags
  };
}

function readLocal(): AppData {
  if (typeof window === "undefined") return cloneSeed();
  const raw = window.localStorage.getItem(LOCAL_KEY);
  if (!raw) return cloneSeed();
  try {
    return normalizeData(JSON.parse(raw));
  } catch {
    return cloneSeed();
  }
}

function writeLocal(data: AppData) {
  window.localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function uploadImage(file: File, folder: string) {
  if (!isSupabaseConfigured || !supabase) return fileToDataUrl(file);

  const ext = file.name.split(".").pop() || "png";
  const path = `${folder}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(storageBucket).upload(path, file, {
    cacheControl: "31536000",
    upsert: false
  });
  if (error) throw error;
  const { data } = supabase.storage.from(storageBucket).getPublicUrl(path);
  return data.publicUrl;
}

async function loadRemote(): Promise<AppData> {
  if (!supabase) return readLocal();
  const client = supabase;

  const [sections, pages, slides, styles, tags] = await Promise.all([
    client.from("pagination_sections").select("*").order("order_index"),
    client.from("pagination_pages").select("*").order("page_number"),
    client.from("slide_references").select("*").order("created_at", { ascending: false }),
    client.from("style_references").select("*").order("created_at", { ascending: false }),
    client.from("tags").select("*").order("name")
  ]);

  if (sections.error || pages.error || slides.error || styles.error || tags.error) {
    throw sections.error || pages.error || slides.error || styles.error || tags.error;
  }

  return normalizeData({
    sections: sections.data.map((item) => ({
      id: item.id,
      title: item.title,
      orderIndex: item.order_index,
      isOpen: item.is_open
    })),
    pages: pages.data.map((item) => ({
      id: item.id,
      sectionId: item.section_id,
      pageNumber: item.page_number,
      title: item.title,
      description: item.description || "",
      structureTags: item.structure_tags || [],
      selectedSlideIds: item.selected_slide_ids || []
    })),
    slides: slides.data.map((item) => ({
      id: item.id,
      title: item.title,
      imageUrl: item.image_url || "",
      sourceName: item.source_name || "",
      pageNumber: item.page_number || undefined,
      roleTags: item.role_tags || [],
      structureTags: item.structure_tags || [],
      layoutTags: item.layout_tags || [],
      styleTags: item.style_tags || [],
      elementTags: item.element_tags || [],
      memo: item.memo || "",
      createdAt: item.created_at
    })),
    styles: styles.data.map((item) => ({
      id: item.id,
      title: item.title,
      imageUrl: item.image_url || "",
      tone: item.tone || "",
      colors: item.colors || [],
      layoutNotes: item.layout_notes || "",
      styleTags: item.style_tags || [],
      createdAt: item.created_at
    })),
    tags: tags.data.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category
    }))
  });
}

async function saveRemote(data: AppData) {
  if (!supabase) return;
  const client = supabase;

  async function deleteMissing(table: string, ids: string[]) {
    const { data: rows, error } = await client.from(table).select("id");
    if (error) throw error;
    const keep = new Set(ids);
    const stale = rows.map((row) => row.id).filter((id) => !keep.has(id));
    if (stale.length) {
      const { error: deleteError } = await client.from(table).delete().in("id", stale);
      if (deleteError) throw deleteError;
    }
  }

  await Promise.all([
    client.from("pagination_sections").upsert(
      data.sections.map((item) => ({
        id: item.id,
        title: item.title,
        order_index: item.orderIndex,
        is_open: item.isOpen
      }))
    ),
    client.from("pagination_pages").upsert(
      data.pages.map((item) => ({
        id: item.id,
        section_id: item.sectionId,
        page_number: item.pageNumber,
        title: item.title,
        description: item.description,
        structure_tags: item.structureTags,
        selected_slide_ids: item.selectedSlideIds
      }))
    ),
    client.from("slide_references").upsert(
      data.slides.map((item) => ({
        id: item.id,
        title: item.title,
        image_url: item.imageUrl,
        source_name: item.sourceName,
        page_number: item.pageNumber || null,
        role_tags: item.roleTags,
        structure_tags: item.structureTags,
        layout_tags: item.layoutTags,
        style_tags: item.styleTags,
        element_tags: item.elementTags,
        memo: item.memo,
        created_at: item.createdAt
      }))
    ),
    client.from("style_references").upsert(
      data.styles.map((item) => ({
        id: item.id,
        title: item.title,
        image_url: item.imageUrl,
        tone: item.tone,
        colors: item.colors,
        layout_notes: item.layoutNotes,
        style_tags: item.styleTags,
        created_at: item.createdAt
      }))
    ),
    client.from("tags").upsert(data.tags)
  ]);

  await Promise.all([
    deleteMissing("pagination_sections", data.sections.map((item) => item.id)),
    deleteMissing("pagination_pages", data.pages.map((item) => item.id))
  ]);
}

export const repository = {
  mode: isSupabaseConfigured ? "supabase" : "local",

  async load() {
    return isSupabaseConfigured ? loadRemote() : readLocal();
  },

  async persist(data: AppData) {
    if (isSupabaseConfigured) await saveRemote(data);
    writeLocal(data);
  },

  async addSlide(data: AppData, draft: SlideDraft, file?: File): Promise<AppData> {
    const imageUrl = file ? await uploadImage(file, "slides") : "";
    const next: SlideReference = {
      ...draft,
      id: makeId("slide"),
      imageUrl,
      createdAt: new Date().toISOString()
    };
    const updated = { ...data, slides: [next, ...data.slides] };
    await this.persist(updated);
    return updated;
  },

  async addStyle(data: AppData, draft: StyleDraft, file?: File): Promise<AppData> {
    const imageUrl = file ? await uploadImage(file, "styles") : "";
    const next: StyleReference = {
      ...draft,
      id: makeId("style"),
      imageUrl,
      createdAt: new Date().toISOString()
    };
    const updated = { ...data, styles: [next, ...data.styles] };
    await this.persist(updated);
    return updated;
  },

  createSection(data: AppData): AppData {
    return {
      ...data,
      sections: [
        ...data.sections,
        {
          id: makeId("section"),
          title: "새 섹션",
          orderIndex: data.sections.length + 1,
          isOpen: true
        }
      ]
    };
  },

  createPage(data: AppData, sectionId: string): AppData {
    const page: PaginationPage = {
      id: makeId("page"),
      sectionId,
      pageNumber: data.pages.length + 1,
      title: "새 페이지",
      description: "이 페이지에 필요한 메시지와 정보구조를 적어주세요.",
      structureTags: [],
      selectedSlideIds: []
    };
    return { ...data, pages: [...data.pages, page] };
  },

  updateSection(data: AppData, section: PaginationSection): AppData {
    return { ...data, sections: data.sections.map((item) => (item.id === section.id ? section : item)) };
  },

  updatePage(data: AppData, page: PaginationPage): AppData {
    return { ...data, pages: data.pages.map((item) => (item.id === page.id ? page : item)) };
  },

  deleteSection(data: AppData, sectionId: string): AppData {
    const pagesToDelete = new Set(data.pages.filter((page) => page.sectionId === sectionId).map((page) => page.id));
    return {
      ...data,
      sections: data.sections.filter((section) => section.id !== sectionId),
      pages: data.pages.filter((page) => !pagesToDelete.has(page.id))
    };
  },

  deletePage(data: AppData, pageId: string): AppData {
    return { ...data, pages: data.pages.filter((page) => page.id !== pageId) };
  }
};
