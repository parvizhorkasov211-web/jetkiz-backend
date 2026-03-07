'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { apiFetch, API_URL } from '@/lib/api';

type MenuCategory = {
  id: string;
  titleRu: string;
  sortOrder?: number;
};

type ProductImage = {
  id: string;
  url: string;
  isMain: boolean;
  sortOrder: number;
};

type MenuItem = {
  id: string;
  titleRu: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string | null;

  weight?: string | null;
  composition?: string | null;
  description?: string | null;
  isDrink?: boolean;

  images?: ProductImage[];
};

type MenuResponse = {
  restaurant: { id: string; nameRu: string };
  categories: MenuCategory[];
  items: MenuItem[];
};

function normalizeBaseUrl(raw: string) {
  const s = String(raw || '').trim();
  if (!s) return '';
  return s.endsWith('/') ? s.slice(0, -1) : s;
}

const BASE = normalizeBaseUrl(API_URL || 'http://localhost:3001');

function toAbsUrl(url: string) {
  const u = String(url || '').trim();
  if (!u) return u;
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  if (!BASE) return u;
  return u.startsWith('/') ? `${BASE}${u}` : `${BASE}/${u}`;
}

function filesToPreviews(files: File[]) {
  return files.map((f) => ({
    name: f.name,
    size: f.size,
    url: URL.createObjectURL(f),
  }));
}

export default function RestaurantMenuPage() {
  const { id } = useParams();

  const [data, setData] = useState<MenuResponse | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingAction, setLoadingAction] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // modal: create category
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryTitleRu, setNewCategoryTitleRu] = useState('');

  // modal: create item
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [newItemTitleRu, setNewItemTitleRu] = useState('');
  const [newItemWeight, setNewItemWeight] = useState('');
  const [newItemComposition, setNewItemComposition] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemIsDrink, setNewItemIsDrink] = useState(false);
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>('');

  // ✅ create item images (FILES)
  const [newMainFile, setNewMainFile] = useState<File | null>(null);
  const [newOtherFiles, setNewOtherFiles] = useState<File[]>([]);
  const [newMainPreview, setNewMainPreview] = useState<string>('');
  const [newOtherPreviews, setNewOtherPreviews] = useState<
    { name: string; size: number; url: string }[]
  >([]);

  const newMainInputRef = useRef<HTMLInputElement | null>(null);
  const newOtherInputRef = useRef<HTMLInputElement | null>(null);

  // modal: edit category
  const [isEditCategoryModalOpen, setIsEditCategoryModalOpen] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [editCategoryTitleRu, setEditCategoryTitleRu] = useState('');
  const [editCategorySortOrder, setEditCategorySortOrder] = useState('0');

  // modal: edit item
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editItemTitleRu, setEditItemTitleRu] = useState('');
  const [editItemWeight, setEditItemWeight] = useState('');
  const [editItemComposition, setEditItemComposition] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editItemIsDrink, setEditItemIsDrink] = useState(false);
  const [editItemIsAvailable, setEditItemIsAvailable] = useState(true);
  const [editItemCategoryId, setEditItemCategoryId] = useState<string>('');

  // ✅ edit item images manager
  const [editItemImages, setEditItemImages] = useState<ProductImage[]>([]);
  const [editReplaceMainFile, setEditReplaceMainFile] = useState<File | null>(null);
  const [editReplaceOtherFiles, setEditReplaceOtherFiles] = useState<File[]>([]);
  const [editReplaceMainPreview, setEditReplaceMainPreview] = useState<string>('');
  const [editReplaceOtherPreviews, setEditReplaceOtherPreviews] = useState<
    { name: string; size: number; url: string }[]
  >([]);

  const [editAddFiles, setEditAddFiles] = useState<File[]>([]);
  const [editAddPreviews, setEditAddPreviews] = useState<
    { name: string; size: number; url: string }[]
  >([]);

  const editReplaceMainInputRef = useRef<HTMLInputElement | null>(null);
  const editReplaceOtherInputRef = useRef<HTMLInputElement | null>(null);
  const editAddInputRef = useRef<HTMLInputElement | null>(null);

  // ==========================
  // UI SCALE (tuned)
  // ==========================
  const ui = useMemo(() => {
    // было 2 (слишком огромно). Делаем комфортный размер как на “аналитике”
    const k = 1.15;

    const baseFontSize = 16 * k;

    return {
      baseFontSize,

      // left sidebar
      sidebarWidth: 280,
      sidebarPad: 14,

      // top bar
      topBarHeight: 64,

      // buttons / inputs
      btnHeight: Math.round(42 * k),
      btnFont: Math.round(14 * k),
      chipFont: Math.round(12 * k),
      inputFont: Math.round(14 * k),
      inputPadY: Math.round(10 * k),
      inputPadX: Math.round(12 * k),

      // cards grid
      cardSize: 250,
      cardGap: 18,
      cardRadius: 16,

      // icon buttons
      iconBtn: Math.round(34 * k),
      iconBtnRadius: 12,

      // titles
      titleFont: Math.round(18 * k),
      sectionTitleFont: Math.round(18 * k),
    };
  }, []);

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError(null);

      const json = (await apiFetch(`/restaurants/${id}/menu?includeUnavailable=1`, {
        cache: 'no-store',
      })) as MenuResponse;

      setData(json);

      if (activeCategory && !json.categories.some((c) => c.id === activeCategory)) {
        setActiveCategory(null);
      }
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки меню');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const activeCategoryTitle = useMemo(() => {
    if (!data) return '';
    if (!activeCategory) return 'Все товары';
    return data.categories.find((c) => c.id === activeCategory)?.titleRu || 'Категория';
  }, [data, activeCategory]);

  const items = useMemo(() => {
    if (!data) return [];
    if (!activeCategory) return data.items;
    return data.items.filter((i) => i.categoryId === activeCategory);
  }, [data, activeCategory]);

  const totalItemsCount = data?.items?.length ?? 0;
  const activeItemsCount = items.length;

  const normalizePrice = (raw: string) => {
    const cleaned = raw.replace(/\s/g, '').replace(/,/g, '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const openCreateCategoryModal = () => {
    setNewCategoryTitleRu('');
    setIsCategoryModalOpen(true);
  };

  const createCategory = async () => {
    const titleRu = newCategoryTitleRu.trim();
    if (!titleRu) return;

    try {
      setLoadingAction(true);
      setError(null);

      const payload = {
        restaurantId: String(id),
        titleRu,
        titleKk: titleRu,
      };

      await apiFetch(`/food-categories`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setIsCategoryModalOpen(false);
      await loadMenu();
    } catch (e: any) {
      setError(e?.message || 'Ошибка создания категории');
    } finally {
      setLoadingAction(false);
    }
  };

  const resetCreateImages = () => {
    if (newMainPreview) URL.revokeObjectURL(newMainPreview);
    newOtherPreviews.forEach((p) => URL.revokeObjectURL(p.url));

    setNewMainFile(null);
    setNewOtherFiles([]);
    setNewMainPreview('');
    setNewOtherPreviews([]);

    if (newMainInputRef.current) newMainInputRef.current.value = '';
    if (newOtherInputRef.current) newOtherInputRef.current.value = '';
  };

  const openCreateItemModal = () => {
    setError(null);

    setNewItemTitleRu('');
    setNewItemWeight('');
    setNewItemComposition('');
    setNewItemPrice('');
    setNewItemDescription('');
    setNewItemIsDrink(false);

    setNewItemCategoryId(activeCategory ?? '');

    resetCreateImages();
    setIsItemModalOpen(true);
  };

  const canCreateItem = useMemo(() => {
    const titleOk = !!newItemTitleRu.trim();
    const priceOk =
      Number.isFinite(normalizePrice(newItemPrice)) && normalizePrice(newItemPrice) > 0;
    const categoryOk = !!(activeCategory || newItemCategoryId);
    const compositionOk = newItemIsDrink ? true : !!newItemComposition.trim();

    const othersOk = newOtherFiles.length <= 10;

    return titleOk && priceOk && categoryOk && compositionOk && othersOk && !loadingAction;
  }, [
    newItemTitleRu,
    newItemPrice,
    newItemCategoryId,
    activeCategory,
    newItemComposition,
    newItemIsDrink,
    newOtherFiles.length,
    loadingAction,
  ]);

  const createItem = async () => {
    const titleRu = newItemTitleRu.trim();
    const price = normalizePrice(newItemPrice);

    const categoryId = (activeCategory || newItemCategoryId || '').trim();
    const composition = newItemComposition.trim();
    const weight = newItemWeight.trim();
    const description = newItemDescription.trim();

    if (!titleRu) return;
    if (!Number.isFinite(price) || price <= 0) return;
    if (!categoryId) return;
    if (!newItemIsDrink && !composition) return;
    if (newOtherFiles.length > 10) return;

    try {
      setLoadingAction(true);
      setError(null);

      const payload: any = {
        categoryId,
        titleRu,
        titleKk: titleRu,
        price: Number(price),

        weight: weight || null,
        composition: composition || null,
        description: description || null,
        isDrink: newItemIsDrink,

        mainImageUrl: null,
        additionalImageUrls: null,
      };

      const created = (await apiFetch(`/restaurants/${id}/menu/products`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })) as any;

      const productId = created?.id;
      if (!productId) throw new Error('Create product: response without id');

      if (newMainFile || newOtherFiles.length) {
        if (newMainFile) {
          const fd = new FormData();
          fd.append('main', newMainFile);
          newOtherFiles.forEach((f) => fd.append('others', f));

          await apiFetch(`/restaurants/${id}/menu/products/${productId}/images`, {
            method: 'POST',
            body: fd,
          });
        } else {
          const fd = new FormData();
          newOtherFiles.forEach((f) => fd.append('files', f));

          await apiFetch(`/restaurants/${id}/menu/products/${productId}/images/add`, {
            method: 'POST',
            body: fd,
          });
        }
      }

      setIsItemModalOpen(false);
      resetCreateImages();
      await loadMenu();
    } catch (e: any) {
      setError(e?.message || 'Ошибка создания товара');
    } finally {
      setLoadingAction(false);
    }
  };

  // ==========================
  // CATEGORY EDIT/DELETE
  // ==========================
  const openEditCategoryModal = (category: MenuCategory) => {
    setError(null);
    setEditCategoryId(category.id);
    setEditCategoryTitleRu(category.titleRu || '');
    setEditCategorySortOrder(String(category.sortOrder ?? 0));
    setIsEditCategoryModalOpen(true);
  };

  const canSaveCategory = useMemo(() => {
    return !!editCategoryTitleRu.trim() && !loadingAction;
  }, [editCategoryTitleRu, loadingAction]);

  const saveCategory = async () => {
    if (!editCategoryId) return;

    const titleRu = editCategoryTitleRu.trim();
    if (!titleRu) return;

    const sortOrder = Number(editCategorySortOrder);
    const sortOrderValue = Number.isFinite(sortOrder) ? Math.trunc(sortOrder) : 0;

    try {
      setLoadingAction(true);
      setError(null);

      await apiFetch(`/restaurants/${id}/categories/${editCategoryId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          titleRu,
          titleKk: titleRu,
          sortOrder: sortOrderValue,
        }),
      });

      setIsEditCategoryModalOpen(false);
      setEditCategoryId(null);
      await loadMenu();
    } catch (e: any) {
      setError(e?.message || 'Ошибка обновления категории');
    } finally {
      setLoadingAction(false);
    }
  };

  const deleteCategory = async (category: MenuCategory) => {
    const baseConfirm = window.confirm(`Удалить категорию "${category.titleRu}"?`);
    if (!baseConfirm) return;

    try {
      setLoadingAction(true);
      setError(null);

      try {
        await apiFetch(`/restaurants/${id}/categories/${category.id}`, { method: 'DELETE' });
      } catch (e: any) {
        if (String(e?.message || '').includes('409')) throw e;
        throw e;
      }

      if (activeCategory === category.id) setActiveCategory(null);
      await loadMenu();
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('409')) {
        try {
          const r = await fetch(`${BASE}/restaurants/${id}/categories/${category.id}`, {
            method: 'DELETE',
          });
          if (r.status === 409) {
            const json = await r.json().catch(() => null);
            const productsCount = json?.productsCount ?? 0;

            const forceConfirm = window.confirm(
              `В категории ${productsCount} товаров.\nУдалить категорию вместе со всеми товарами?`,
            );

            if (!forceConfirm) return;

            await apiFetch(`/restaurants/${id}/categories/${category.id}?force=true`, {
              method: 'DELETE',
            });

            if (activeCategory === category.id) setActiveCategory(null);
            await loadMenu();
            return;
          }
        } catch {}
      }

      setError(e?.message || 'Ошибка удаления категории');
    } finally {
      setLoadingAction(false);
    }
  };

  // ==========================
  // ITEM EDIT/DELETE + IMAGES
  // ==========================
  const resetEditImagesState = () => {
    if (editReplaceMainPreview) URL.revokeObjectURL(editReplaceMainPreview);
    editReplaceOtherPreviews.forEach((p) => URL.revokeObjectURL(p.url));
    editAddPreviews.forEach((p) => URL.revokeObjectURL(p.url));

    setEditReplaceMainFile(null);
    setEditReplaceOtherFiles([]);
    setEditReplaceMainPreview('');
    setEditReplaceOtherPreviews([]);

    setEditAddFiles([]);
    setEditAddPreviews([]);

    if (editReplaceMainInputRef.current) editReplaceMainInputRef.current.value = '';
    if (editReplaceOtherInputRef.current) editReplaceOtherInputRef.current.value = '';
    if (editAddInputRef.current) editAddInputRef.current.value = '';
  };

  const openEditItemModal = (item: MenuItem) => {
    setError(null);
    setEditItemId(item.id);
    setEditItemTitleRu(item.titleRu || '');
    setEditItemPrice(String(item.price ?? ''));
    setEditItemWeight(item.weight || '');
    setEditItemComposition(item.composition || '');
    setEditItemDescription(item.description || '');
    setEditItemIsDrink(Boolean(item.isDrink));
    setEditItemIsAvailable(Boolean(item.isAvailable));
    setEditItemCategoryId(item.categoryId || '');

    const imgs = (item.images || [])
      .slice()
      .sort((a, b) => {
        if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });

    setEditItemImages(imgs);

    resetEditImagesState();
    setIsEditItemModalOpen(true);
  };

  const canSaveItem = useMemo(() => {
    const titleOk = !!editItemTitleRu.trim();
    const price = normalizePrice(editItemPrice);
    const priceOk = Number.isFinite(price) && price > 0;
    const categoryOk = !!editItemCategoryId.trim();
    const compositionOk = editItemIsDrink ? true : !!editItemComposition.trim();

    return titleOk && priceOk && categoryOk && compositionOk && !loadingAction;
  }, [
    editItemTitleRu,
    editItemPrice,
    editItemCategoryId,
    editItemComposition,
    editItemIsDrink,
    loadingAction,
  ]);

  const saveItem = async () => {
    if (!editItemId) return;

    const titleRu = editItemTitleRu.trim();
    const price = normalizePrice(editItemPrice);
    const categoryId = editItemCategoryId.trim();

    const weight = editItemWeight.trim();
    const composition = editItemComposition.trim();
    const description = editItemDescription.trim();

    if (!titleRu) return;
    if (!Number.isFinite(price) || price <= 0) return;
    if (!categoryId) return;
    if (!editItemIsDrink && !composition) return;

    try {
      setLoadingAction(true);
      setError(null);

      const payload: any = {
        categoryId,
        titleRu,
        titleKk: titleRu,
        price: Number(price),
        weight: weight || null,
        composition: composition || null,
        description: description || null,
        isDrink: editItemIsDrink,
        isAvailable: editItemIsAvailable,
      };

      await apiFetch(`/restaurants/${id}/menu/products/${editItemId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });

      setIsEditItemModalOpen(false);
      setEditItemId(null);
      resetEditImagesState();
      await loadMenu();
    } catch (e: any) {
      setError(e?.message || 'Ошибка обновления товара');
    } finally {
      setLoadingAction(false);
    }
  };

  const deleteItem = async (item: MenuItem) => {
    const ok = window.confirm(`Удалить товар "${item.titleRu}"?`);
    if (!ok) return;

    try {
      setLoadingAction(true);
      setError(null);

      await apiFetch(`/restaurants/${id}/menu/products/${item.id}`, {
        method: 'DELETE',
      });

      await loadMenu();
    } catch (e: any) {
      setError(e?.message || 'Ошибка удаления товара');
    } finally {
      setLoadingAction(false);
    }
  };

  const refreshEditImagesFromMenu = async (productId: string) => {
    const next = (await apiFetch(`/restaurants/${id}/menu?includeUnavailable=1`, {
      cache: 'no-store',
    })) as MenuResponse;

    setData(next);

    const item = next.items.find((x) => x.id === productId);
    setEditItemImages(
      (item?.images || [])
        .slice()
        .sort((a, b) => {
          if (a.isMain !== b.isMain) return a.isMain ? -1 : 1;
          return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        }),
    );
  };

  const replaceImages = async () => {
    if (!editItemId) return;
    if (!editReplaceMainFile) {
      setError('Для replace нужен main файл (1 шт)');
      return;
    }
    if (editReplaceOtherFiles.length > 10) {
      setError('Максимум 10 дополнительных фото');
      return;
    }

    try {
      setLoadingAction(true);
      setError(null);

      const fd = new FormData();
      fd.append('main', editReplaceMainFile);
      editReplaceOtherFiles.forEach((f) => fd.append('others', f));

      await apiFetch(`/restaurants/${id}/menu/products/${editItemId}/images`, {
        method: 'POST',
        body: fd,
      });

      resetEditImagesState();
      await refreshEditImagesFromMenu(editItemId);
    } catch (e: any) {
      setError(e?.message || 'Ошибка загрузки фото');
    } finally {
      setLoadingAction(false);
    }
  };

  const addImages = async () => {
    if (!editItemId) return;
    if (!editAddFiles.length) return;
    if (editAddFiles.length > 10) {
      setError('Максимум 10 файлов за раз');
      return;
    }

    try {
      setLoadingAction(true);
      setError(null);

      const fd = new FormData();
      editAddFiles.forEach((f) => fd.append('files', f));

      await apiFetch(`/restaurants/${id}/menu/products/${editItemId}/images/add`, {
        method: 'POST',
        body: fd,
      });

      resetEditImagesState();
      await refreshEditImagesFromMenu(editItemId);
    } catch (e: any) {
      setError(e?.message || 'Ошибка добавления фото');
    } finally {
      setLoadingAction(false);
    }
  };

  const setMainImage = async (imageId: string) => {
    if (!editItemId) return;

    try {
      setLoadingAction(true);
      setError(null);

      await apiFetch(`/restaurants/${id}/menu/products/${editItemId}/images/${imageId}/main`, {
        method: 'PATCH',
      });

      await refreshEditImagesFromMenu(editItemId);
    } catch (e: any) {
      setError(e?.message || 'Ошибка установки главного фото');
    } finally {
      setLoadingAction(false);
    }
  };

  const deleteImage = async (imageId: string) => {
    if (!editItemId) return;
    const ok = window.confirm('Удалить фото?');
    if (!ok) return;

    try {
      setLoadingAction(true);
      setError(null);

      await apiFetch(`/restaurants/${id}/menu/products/${editItemId}/images/${imageId}`, {
        method: 'DELETE',
      });

      await refreshEditImagesFromMenu(editItemId);
    } catch (e: any) {
      setError(e?.message || 'Ошибка удаления фото');
    } finally {
      setLoadingAction(false);
    }
  };

  // картинка на карточке: берём главное из images, иначе imageUrl
  const resolveCardImage = (item: MenuItem) => {
    const main = item.images?.find((x) => x.isMain)?.url;
    return toAbsUrl(main || item.imageUrl || 'https://via.placeholder.com/600x600?text=No+Image');
  };

  const goCreateItem = () => {
    openCreateItemModal();
  };

  const goEditItem = (itemId: string) => {
    const item = data?.items.find((x) => x.id === itemId) || null;
    if (!item) return;
    openEditItemModal(item);
  };

  if (loading && !data) return <div style={{ padding: 24, fontSize: ui.baseFontSize }}>Loading...</div>;

  if (!data) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontSize: ui.sectionTitleFont, fontWeight: 900, marginBottom: 8 }}>
          Меню не загружено
        </div>
        <div style={{ color: '#666', marginBottom: 14, fontSize: ui.inputFont }}>
          {error || '—'}
        </div>
        <button
          onClick={loadMenu}
          style={{
            background: '#ff6b2c',
            border: 'none',
            height: ui.btnHeight,
            padding: '0 18px',
            color: '#fff',
            borderRadius: 12,
            fontWeight: 900,
            fontSize: ui.btnFont,
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  const FieldLabel = ({ children }: { children: React.ReactNode }) => (
    <label
      style={{
        fontSize: ui.btnFont,
        fontWeight: 950 as any,
        color: '#2b2b3a',
      }}
    >
      {children}
    </label>
  );

  const TextInputStyle: React.CSSProperties = {
    width: '100%',
    padding: `${ui.inputPadY}px ${ui.inputPadX}px`,
    borderRadius: 12,
    border: '1.5px solid #e3e5ee',
    outline: 'none',
    fontSize: ui.inputFont,
    fontWeight: 800,
    background: '#fafbff',
  };

  const TwoCol: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(360px, 460px)',
    gap: 18,
    alignItems: 'start',
  };

  const StickyRightCard: React.CSSProperties = {
    position: 'sticky',
    top: 0,
    alignSelf: 'start',
    border: '1.5px solid #e7e9f2',
    borderRadius: 16,
    background: '#fafbff',
    padding: 14,
    maxHeight: '72vh',
    overflow: 'auto',
    WebkitOverflowScrolling: 'touch',
  };

  return (
    <div
      style={{
        display: 'flex',
        height: '100%',
        fontSize: ui.baseFontSize,
        lineHeight: 1.35,
      }}
    >
      {/* LEFT SIDEBAR */}
      <div
        style={{
          width: ui.sidebarWidth,
          background: '#1e1e2d',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #2a2a3d',
        }}
      >
        {/* Sidebar header */}
        <div style={{ padding: ui.sidebarPad, borderBottom: '1px solid #2a2a3d' }}>
          <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.2 }}>
            {data.restaurant?.nameRu || 'Ресторан'}
          </div>

          <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
            <button
              onClick={openCreateCategoryModal}
              style={{
                flex: 1,
                background: '#ff6b2c',
                border: 'none',
                height: ui.btnHeight,
                padding: '0 12px',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 900,
                fontSize: ui.btnFont,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
              }}
              title="Создать категорию"
            >
              + Категория
            </button>

            <button
              onClick={goCreateItem}
              style={{
                flex: 1,
                background: '#2d2d44',
                border: '1px solid rgba(255,255,255,0.12)',
                height: ui.btnHeight,
                padding: '0 12px',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 900,
                fontSize: ui.btnFont,
                cursor: 'pointer',
              }}
              title="Создать товар"
            >
              + Товар
            </button>
          </div>
        </div>

        {/* Categories list */}
        <div style={{ padding: 14, overflow: 'auto' }}>
          <CategoryItem
            ui={ui}
            active={!activeCategory}
            title="Все"
            badge={String(totalItemsCount)}
            onClick={() => setActiveCategory(null)}
          />

          {data.categories.map((c) => {
            const count = data.items.filter((i) => i.categoryId === c.id).length;
            return (
              <CategoryItem
                ui={ui}
                key={c.id}
                active={activeCategory === c.id}
                title={c.titleRu}
                badge={String(count)}
                onClick={() => setActiveCategory(c.id)}
                onEdit={() => openEditCategoryModal(c)}
                onDelete={() => deleteCategory(c)}
                disabledActions={loadingAction}
              />
            );
          })}
        </div>
      </div>

      {/* RIGHT CONTENT */}
      <div style={{ flex: 1, background: '#f3f4f8', display: 'flex', flexDirection: 'column' }}>
        {/* TOP BAR */}
        <div
          style={{
            height: ui.topBarHeight,
            background: '#1f2130',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            padding: '0 18px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, minWidth: 0 }}>
            <div
              style={{
                fontSize: ui.titleFont,
                fontWeight: 950 as any,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 680,
              }}
              title={activeCategoryTitle}
            >
              {activeCategoryTitle}
            </div>

            <div
              style={{
                fontSize: ui.chipFont,
                fontWeight: 900,
                padding: '5px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              title="Количество товаров в текущем списке"
            >
              {activeItemsCount} шт.
            </div>

            {error ? (
              <div
                style={{
                  fontSize: ui.btnFont,
                  color: '#ffb4b4',
                  marginLeft: 8,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 680,
                  fontWeight: 800,
                }}
                title={error}
              >
                {error}
              </div>
            ) : null}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
            <button
              onClick={openCreateCategoryModal}
              style={{
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.18)',
                height: ui.btnHeight,
                padding: '0 14px',
                borderRadius: 12,
                fontWeight: 900,
                fontSize: ui.btnFont,
                cursor: 'pointer',
              }}
            >
              + Категория
            </button>

            <button
              onClick={goCreateItem}
              style={{
                background: '#ff6b2c',
                border: 'none',
                height: ui.btnHeight,
                padding: '0 16px',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 950 as any,
                fontSize: ui.btnFont,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
              }}
            >
              + Товар
            </button>
          </div>
        </div>

        {/* CONTENT BODY */}
        <div style={{ flex: 1, padding: '18px 18px 22px 18px', overflow: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(auto-fill, minmax(${ui.cardSize}px, ${ui.cardSize}px))`,
              justifyContent: 'flex-start',
              gap: ui.cardGap,
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => goEditItem(item.id)}
                style={{
                  background: '#fff',
                  borderRadius: ui.cardRadius,
                  overflow: 'hidden',
                  boxShadow: '0 12px 34px rgba(0,0,0,0.07)',
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 18px 44px rgba(0,0,0,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 12px 34px rgba(0,0,0,0.07)';
                }}
                title="Открыть редактирование"
              >
                {/* ACTIONS */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    display: 'flex',
                    gap: 8,
                    zIndex: 5,
                  }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditItemModal(item);
                    }}
                    disabled={loadingAction}
                    style={{
                      width: ui.iconBtn,
                      height: ui.iconBtn,
                      borderRadius: ui.iconBtnRadius,
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: 'rgba(255,255,255,0.96)',
                      cursor: loadingAction ? 'not-allowed' : 'pointer',
                      fontWeight: 950 as any,
                      fontSize: ui.btnFont,
                    }}
                    title="Редактировать товар"
                    aria-label="Edit item"
                  >
                    ✎
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteItem(item);
                    }}
                    disabled={loadingAction}
                    style={{
                      width: ui.iconBtn,
                      height: ui.iconBtn,
                      borderRadius: ui.iconBtnRadius,
                      border: '1px solid rgba(0,0,0,0.12)',
                      background: 'rgba(255,255,255,0.96)',
                      cursor: loadingAction ? 'not-allowed' : 'pointer',
                      fontWeight: 950 as any,
                      fontSize: ui.btnFont,
                      color: '#f1416c',
                    }}
                    title="Удалить товар"
                    aria-label="Delete item"
                  >
                    🗑
                  </button>
                </div>

                <div
                  style={{
                    position: 'relative',
                    width: ui.cardSize,
                    height: ui.cardSize,
                    backgroundImage: `url(${resolveCardImage(item)})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      background: '#fff',
                      padding: '6px 10px',
                      borderRadius: 999,
                      fontWeight: 950 as any,
                      fontSize: 13,
                      boxShadow: '0 6px 16px rgba(0,0,0,0.12)',
                    }}
                  >
                    {item.price} ₸
                  </div>

                  <div
                    style={{
                      position: 'absolute',
                      left: 12,
                      bottom: 12,
                      padding: '6px 10px',
                      borderRadius: 999,
                      fontSize: 12,
                      fontWeight: 900,
                      color: '#fff',
                      background: item.isAvailable ? 'rgba(27,197,189,0.95)' : 'rgba(246,78,96,0.95)',
                      boxShadow: '0 8px 18px rgba(0,0,0,0.20)',
                    }}
                  >
                    {item.isAvailable ? 'Доступен' : 'Недоступен'}
                  </div>
                </div>

                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      fontWeight: 950 as any,
                      fontSize: 15,
                      marginBottom: 8,
                      lineHeight: 1.25,
                      minHeight: 40,
                      color: '#1f2130',
                    }}
                  >
                    {item.titleRu}
                  </div>

                  <div style={{ fontSize: 12, color: '#7a7d85', fontWeight: 800 }}>
                    Нажми для редактирования
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 ? (
            <div
              style={{
                marginTop: 18,
                background: '#fff',
                borderRadius: 16,
                padding: 16,
                boxShadow: '0 12px 34px rgba(0,0,0,0.07)',
                color: '#555',
                fontWeight: 800,
                fontSize: ui.inputFont,
              }}
            >
              Товары не найдены. Добавь товар или выбери другую категорию.
            </div>
          ) : null}
        </div>
      </div>

      {/* MODAL: Create Category */}
      <Modal
        ui={ui}
        open={isCategoryModalOpen}
        title="Создать категорию"
        onClose={() => (loadingAction ? null : setIsCategoryModalOpen(false))}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldLabel>Название категории</FieldLabel>
          <input
            value={newCategoryTitleRu}
            onChange={(e) => setNewCategoryTitleRu(e.target.value)}
            placeholder="Например: Бургеры"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') createCategory();
              if (e.key === 'Escape' && !loadingAction) setIsCategoryModalOpen(false);
            }}
            style={TextInputStyle}
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              disabled={loadingAction}
              style={{
                background: 'transparent',
                color: '#1f2130',
                border: '1.5px solid rgba(31,33,48,0.18)',
                height: ui.btnHeight,
                padding: '0 18px',
                borderRadius: 12,
                fontWeight: 900,
                fontSize: ui.btnFont,
                cursor: loadingAction ? 'not-allowed' : 'pointer',
                opacity: loadingAction ? 0.6 : 1,
              }}
            >
              Отмена
            </button>

            <button
              onClick={createCategory}
              disabled={loadingAction || !newCategoryTitleRu.trim()}
              style={{
                background: '#ff6b2c',
                border: 'none',
                height: ui.btnHeight,
                padding: '0 20px',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 950 as any,
                fontSize: ui.btnFont,
                cursor: loadingAction || !newCategoryTitleRu.trim() ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
                opacity: loadingAction || !newCategoryTitleRu.trim() ? 0.65 : 1,
              }}
            >
              {loadingAction ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          <div style={{ fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 700, marginTop: 6 }}>
            После сохранения категория появится слева автоматически.
          </div>
        </div>
      </Modal>

      {/* MODAL: Edit Category */}
      <Modal
        ui={ui}
        open={isEditCategoryModalOpen}
        title="Редактировать категорию"
        onClose={() => (loadingAction ? null : setIsEditCategoryModalOpen(false))}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <FieldLabel>Название категории</FieldLabel>
          <input
            value={editCategoryTitleRu}
            onChange={(e) => setEditCategoryTitleRu(e.target.value)}
            placeholder="Например: Бургеры"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSaveCategory) saveCategory();
              if (e.key === 'Escape' && !loadingAction) setIsEditCategoryModalOpen(false);
            }}
            style={TextInputStyle}
          />

          <FieldLabel>Порядок сортировки</FieldLabel>
          <input
            value={editCategorySortOrder}
            onChange={(e) => setEditCategorySortOrder(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            style={TextInputStyle}
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              onClick={() => setIsEditCategoryModalOpen(false)}
              disabled={loadingAction}
              style={{
                background: 'transparent',
                color: '#1f2130',
                border: '1.5px solid rgba(31,33,48,0.18)',
                height: ui.btnHeight,
                padding: '0 18px',
                borderRadius: 12,
                fontWeight: 900,
                fontSize: ui.btnFont,
                cursor: loadingAction ? 'not-allowed' : 'pointer',
                opacity: loadingAction ? 0.6 : 1,
              }}
            >
              Отмена
            </button>

            <button
              onClick={saveCategory}
              disabled={!canSaveCategory}
              style={{
                background: '#ff6b2c',
                border: 'none',
                height: ui.btnHeight,
                padding: '0 20px',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 950 as any,
                fontSize: ui.btnFont,
                cursor: !canSaveCategory ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
                opacity: !canSaveCategory ? 0.65 : 1,
              }}
            >
              {loadingAction ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          <div style={{ fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 700, marginTop: 6 }}>
            Редактирование применяется сразу после сохранения.
          </div>
        </div>
      </Modal>

      {/* MODAL: Create Item (2 columns) */}
      <Modal
        ui={ui}
        open={isItemModalOpen}
        title="Создать товар"
        onClose={() => (loadingAction ? null : setIsItemModalOpen(false))}
        maxWidth={1100}
      >
        <div style={TwoCol}>
          {/* LEFT: info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {!activeCategory ? (
              <>
                <FieldLabel>Категория</FieldLabel>
                <select
                  value={newItemCategoryId}
                  onChange={(e) => setNewItemCategoryId(e.target.value)}
                  style={TextInputStyle}
                >
                  <option value="">Выбери категорию</option>
                  {data.categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.titleRu}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <FieldLabel>Название (RU)</FieldLabel>
            <input
              value={newItemTitleRu}
              onChange={(e) => setNewItemTitleRu(e.target.value)}
              placeholder="Например: Чизбургер"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canCreateItem) createItem();
                if (e.key === 'Escape' && !loadingAction) setIsItemModalOpen(false);
              }}
              style={TextInputStyle}
            />

            <FieldLabel>Граммовка / Литраж</FieldLabel>
            <input
              value={newItemWeight}
              onChange={(e) => setNewItemWeight(e.target.value)}
              placeholder="Например: 350 г / 0.5 л"
              style={TextInputStyle}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
              <input
                id="isDrinkCreate"
                type="checkbox"
                checked={newItemIsDrink}
                onChange={(e) => setNewItemIsDrink(e.target.checked)}
                style={{ transform: 'scale(1.25)' }}
              />
              <label htmlFor="isDrinkCreate" style={{ fontSize: ui.inputFont, fontWeight: 900, color: '#1f2130' }}>
                Это напиток (состав необязателен)
              </label>
            </div>

            <FieldLabel>Состав {newItemIsDrink ? '(опционально)' : '(обязательно)'}</FieldLabel>
            <textarea
              value={newItemComposition}
              onChange={(e) => setNewItemComposition(e.target.value)}
              placeholder="Например: говядина, сыр, соус, булочка..."
              rows={4}
              style={{
                ...TextInputStyle,
                resize: 'vertical',
              }}
            />

            <FieldLabel>Цена (₸)</FieldLabel>
            <input
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              placeholder="Например: 1290"
              inputMode="numeric"
              style={TextInputStyle}
            />

            <FieldLabel>Описание (опционально)</FieldLabel>
            <textarea
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              placeholder="Короткое описание для клиента..."
              rows={4}
              style={{
                ...TextInputStyle,
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => {
                  setIsItemModalOpen(false);
                  resetCreateImages();
                }}
                disabled={loadingAction}
                style={{
                  background: 'transparent',
                  color: '#1f2130',
                  border: '1.5px solid rgba(31,33,48,0.18)',
                  height: ui.btnHeight,
                  padding: '0 18px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: ui.btnFont,
                  cursor: loadingAction ? 'not-allowed' : 'pointer',
                  opacity: loadingAction ? 0.6 : 1,
                }}
              >
                Отмена
              </button>

              <button
                onClick={createItem}
                disabled={!canCreateItem}
                style={{
                  background: '#ff6b2c',
                  border: 'none',
                  height: ui.btnHeight,
                  padding: '0 20px',
                  color: '#fff',
                  borderRadius: 12,
                  fontWeight: 950 as any,
                  fontSize: ui.btnFont,
                  cursor: !canCreateItem ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
                  opacity: !canCreateItem ? 0.65 : 1,
                }}
              >
                {loadingAction ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>

            <div style={{ fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 700, marginTop: 6 }}>
              После сохранения товар появится в списке автоматически.
            </div>
          </div>

          {/* RIGHT: images */}
          <div style={StickyRightCard}>
            <div style={{ fontSize: ui.sectionTitleFont, fontWeight: 950 as any, color: '#1f2130' }}>
              Фото товара
            </div>
            <div style={{ fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 800, marginTop: 6 }}>
              Главное + до 10 дополнительных
            </div>

            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* MAIN */}
              <div style={{ border: '1.5px solid #e7e9f2', borderRadius: 14, padding: 12, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 950 as any, color: '#1f2130', fontSize: ui.inputFont }}>Главное фото</div>
                  <div style={{ marginLeft: 'auto', fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 800 }}>
                    1 файл
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <input
                    ref={newMainInputRef}
                    type="file"
                    accept="image/*"
                    disabled={loadingAction}
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null;
                      if (newMainPreview) URL.revokeObjectURL(newMainPreview);
                      if (!f) {
                        setNewMainFile(null);
                        setNewMainPreview('');
                        return;
                      }
                      setNewMainFile(f);
                      setNewMainPreview(URL.createObjectURL(f));
                    }}
                    style={{ fontSize: ui.inputFont }}
                  />
                </div>

                {newMainPreview ? (
                  <div
                    style={{
                      marginTop: 12,
                      width: '100%',
                      height: 220,
                      borderRadius: 12,
                      backgroundImage: `url(${newMainPreview})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      border: '1px solid rgba(0,0,0,0.06)',
                    }}
                  />
                ) : (
                  <div style={{ marginTop: 10, fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 800 }}>
                    Можно не выбирать: если добавишь только доп. фото, сервер сделает первое главным.
                  </div>
                )}
              </div>

              {/* OTHERS */}
              <div style={{ border: '1.5px solid #e7e9f2', borderRadius: 14, padding: 12, background: '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ fontWeight: 950 as any, color: '#1f2130', fontSize: ui.inputFont }}>Доп. фото</div>
                  <div style={{ marginLeft: 'auto', fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 800 }}>
                    до 10 файлов
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <input
                    ref={newOtherInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={loadingAction}
                    onChange={(e) => {
                      newOtherPreviews.forEach((p) => URL.revokeObjectURL(p.url));
                      const files = Array.from(e.target.files || []);
                      setNewOtherFiles(files);
                      setNewOtherPreviews(filesToPreviews(files));
                    }}
                    style={{ fontSize: ui.inputFont }}
                  />
                </div>

                {newOtherPreviews.length ? (
                  <div
                    style={{
                      marginTop: 12,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: 10,
                    }}
                  >
                    {newOtherPreviews.slice(0, 10).map((p) => (
                      <div
                        key={p.url}
                        title={p.name}
                        style={{
                          width: '100%',
                          aspectRatio: '1 / 1',
                          borderRadius: 12,
                          backgroundImage: `url(${p.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          border: '1px solid rgba(0,0,0,0.06)',
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <div style={{ marginTop: 10, fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 800 }}>
                    Опционально
                  </div>
                )}

                {newOtherFiles.length > 10 ? (
                  <div style={{ marginTop: 12, color: '#d32f2f', fontWeight: 900, fontSize: ui.inputFont }}>
                    Ошибка: максимум 10 дополнительных фото
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* MODAL: Edit Item (2 columns, scroll + sticky photos) */}
      <Modal
        ui={ui}
        open={isEditItemModalOpen}
        title="Редактировать товар"
        onClose={() => (loadingAction ? null : setIsEditItemModalOpen(false))}
        maxWidth={1100}
      >
        <div style={TwoCol}>
          {/* LEFT: info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FieldLabel>Категория</FieldLabel>
            <select
              value={editItemCategoryId}
              onChange={(e) => setEditItemCategoryId(e.target.value)}
              style={TextInputStyle}
            >
              <option value="">Выбери категорию</option>
              {data.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.titleRu}
                </option>
              ))}
            </select>

            <FieldLabel>Название (RU)</FieldLabel>
            <input
              value={editItemTitleRu}
              onChange={(e) => setEditItemTitleRu(e.target.value)}
              placeholder="Например: Чизбургер"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && canSaveItem) saveItem();
                if (e.key === 'Escape' && !loadingAction) setIsEditItemModalOpen(false);
              }}
              style={TextInputStyle}
            />

            <FieldLabel>Граммовка / Литраж</FieldLabel>
            <input
              value={editItemWeight}
              onChange={(e) => setEditItemWeight(e.target.value)}
              placeholder="Например: 350 г / 0.5 л"
              style={TextInputStyle}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
              <input
                id="isDrinkEdit"
                type="checkbox"
                checked={editItemIsDrink}
                onChange={(e) => setEditItemIsDrink(e.target.checked)}
                style={{ transform: 'scale(1.25)' }}
              />
              <label htmlFor="isDrinkEdit" style={{ fontSize: ui.inputFont, fontWeight: 900, color: '#1f2130' }}>
                Это напиток (состав необязателен)
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
              <input
                id="isAvailableEdit"
                type="checkbox"
                checked={editItemIsAvailable}
                onChange={(e) => setEditItemIsAvailable(e.target.checked)}
                style={{ transform: 'scale(1.25)' }}
              />
              <label htmlFor="isAvailableEdit" style={{ fontSize: ui.inputFont, fontWeight: 900, color: '#1f2130' }}>
                Доступен (isAvailable)
              </label>
            </div>

            <FieldLabel>Состав {editItemIsDrink ? '(опционально)' : '(обязательно)'}</FieldLabel>
            <textarea
              value={editItemComposition}
              onChange={(e) => setEditItemComposition(e.target.value)}
              placeholder="Например: говядина, сыр, соус, булочка..."
              rows={4}
              style={{
                ...TextInputStyle,
                resize: 'vertical',
              }}
            />

            <FieldLabel>Цена (₸)</FieldLabel>
            <input
              value={editItemPrice}
              onChange={(e) => setEditItemPrice(e.target.value)}
              placeholder="Например: 1290"
              inputMode="numeric"
              style={TextInputStyle}
            />

            <FieldLabel>Описание (опционально)</FieldLabel>
            <textarea
              value={editItemDescription}
              onChange={(e) => setEditItemDescription(e.target.value)}
              placeholder="Короткое описание для клиента..."
              rows={4}
              style={{
                ...TextInputStyle,
                resize: 'vertical',
              }}
            />

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                onClick={() => {
                  setIsEditItemModalOpen(false);
                  resetEditImagesState();
                }}
                disabled={loadingAction}
                style={{
                  background: 'transparent',
                  color: '#1f2130',
                  border: '1.5px solid rgba(31,33,48,0.18)',
                  height: ui.btnHeight,
                  padding: '0 18px',
                  borderRadius: 12,
                  fontWeight: 900,
                  fontSize: ui.btnFont,
                  cursor: loadingAction ? 'not-allowed' : 'pointer',
                  opacity: loadingAction ? 0.6 : 1,
                }}
              >
                Отмена
              </button>

              <button
                onClick={saveItem}
                disabled={!canSaveItem}
                style={{
                  background: '#ff6b2c',
                  border: 'none',
                  height: ui.btnHeight,
                  padding: '0 20px',
                  color: '#fff',
                  borderRadius: 12,
                  fontWeight: 950 as any,
                  fontSize: ui.btnFont,
                  cursor: !canSaveItem ? 'not-allowed' : 'pointer',
                  boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
                  opacity: !canSaveItem ? 0.65 : 1,
                }}
              >
                {loadingAction ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>

            <div style={{ fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 700, marginTop: 6 }}>
              Редактирование применяется сразу после сохранения.
            </div>
          </div>

          {/* RIGHT: images */}
          <div style={StickyRightCard}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <div style={{ fontSize: ui.sectionTitleFont, fontWeight: 950 as any, color: '#1f2130' }}>Фото</div>
              <div style={{ fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 800 }}>
                Всего: {editItemImages.length} (main: {editItemImages.some((x) => x.isMain) ? 'есть' : 'нет'})
              </div>
            </div>

            {/* existing images */}
            {editItemImages.length ? (
              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 10,
                }}
              >
                {editItemImages.map((img) => (
                  <div
                    key={img.id}
                    style={{
                      border: img.isMain ? '2px solid #1bc5bd' : '1.5px solid rgba(0,0,0,0.10)',
                      borderRadius: 14,
                      padding: 10,
                      background: '#fff',
                      boxShadow: '0 10px 26px rgba(0,0,0,0.06)',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: 12,
                        backgroundImage: `url(${toAbsUrl(img.url)})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                    <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
                      <button
                        onClick={() => setMainImage(img.id)}
                        disabled={loadingAction || img.isMain}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: 12,
                          border: '1.5px solid rgba(31,33,48,0.14)',
                          background: img.isMain ? 'rgba(27,197,189,0.12)' : '#fff',
                          cursor: loadingAction || img.isMain ? 'not-allowed' : 'pointer',
                          fontWeight: 900,
                          fontSize: ui.inputFont,
                          color: '#1f2130',
                          opacity: loadingAction ? 0.6 : 1,
                        }}
                        title="Сделать главным"
                      >
                        Main
                      </button>

                      <button
                        onClick={() => deleteImage(img.id)}
                        disabled={loadingAction}
                        style={{
                          width: 50,
                          height: 40,
                          borderRadius: 12,
                          border: '1.5px solid rgba(31,33,48,0.14)',
                          background: '#fff',
                          cursor: loadingAction ? 'not-allowed' : 'pointer',
                          fontWeight: 900,
                          color: '#f1416c',
                          opacity: loadingAction ? 0.6 : 1,
                          fontSize: ui.inputFont,
                        }}
                        title="Удалить фото"
                        aria-label="Delete image"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 12, fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 800 }}>
                Фото отсутствуют. Добавь через “Add” или “Replace”.
              </div>
            )}

            {/* add images */}
            <div style={{ marginTop: 14, border: '1.5px solid #e7e9f2', borderRadius: 14, padding: 12, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 950 as any, color: '#1f2130', fontSize: ui.inputFont }}>Add фото</div>
                <div style={{ marginLeft: 'auto', fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 800 }}>
                  до 10 файлов
                </div>
              </div>

              <div style={{ marginTop: 10, display: 'flex', gap: 10, alignItems: 'center' }}>
                <input
                  ref={editAddInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={loadingAction}
                  onChange={(e) => {
                    editAddPreviews.forEach((p) => URL.revokeObjectURL(p.url));
                    const files = Array.from(e.target.files || []);
                    setEditAddFiles(files);
                    setEditAddPreviews(filesToPreviews(files));
                  }}
                  style={{ fontSize: ui.inputFont }}
                />

                <button
                  onClick={addImages}
                  disabled={loadingAction || !editAddFiles.length}
                  style={{
                    background: '#2d2d44',
                    border: '1px solid rgba(255,255,255,0.12)',
                    height: ui.btnHeight,
                    padding: '0 14px',
                    color: '#fff',
                    borderRadius: 12,
                    fontWeight: 900,
                    fontSize: ui.btnFont,
                    cursor: loadingAction || !editAddFiles.length ? 'not-allowed' : 'pointer',
                    opacity: loadingAction || !editAddFiles.length ? 0.6 : 1,
                  }}
                >
                  Add
                </button>
              </div>

              {editAddPreviews.length ? (
                <div
                  style={{
                    marginTop: 12,
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: 10,
                  }}
                >
                  {editAddPreviews.slice(0, 10).map((p) => (
                    <div
                      key={p.url}
                      title={p.name}
                      style={{
                        width: '100%',
                        aspectRatio: '1 / 1',
                        borderRadius: 12,
                        backgroundImage: `url(${p.url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {/* replace images */}
            <div style={{ marginTop: 14, border: '1.5px solid #e7e9f2', borderRadius: 14, padding: 12, background: '#fff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontWeight: 950 as any, color: '#1f2130', fontSize: ui.inputFont }}>
                  Replace (полная замена)
                </div>
                <div style={{ marginLeft: 'auto', fontSize: ui.inputFont, color: '#7a7d85', fontWeight: 800 }}>
                  main + до 10 others
                </div>
              </div>

              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                <div style={{ border: '1.5px solid #e7e9f2', borderRadius: 12, padding: 12, background: '#fafbff' }}>
                  <div style={{ fontWeight: 950 as any, fontSize: ui.inputFont, color: '#1f2130' }}>Main</div>
                  <div style={{ marginTop: 10 }}>
                    <input
                      ref={editReplaceMainInputRef}
                      type="file"
                      accept="image/*"
                      disabled={loadingAction}
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        if (editReplaceMainPreview) URL.revokeObjectURL(editReplaceMainPreview);
                        if (!f) {
                          setEditReplaceMainFile(null);
                          setEditReplaceMainPreview('');
                          return;
                        }
                        setEditReplaceMainFile(f);
                        setEditReplaceMainPreview(URL.createObjectURL(f));
                      }}
                      style={{ fontSize: ui.inputFont }}
                    />
                  </div>

                  {editReplaceMainPreview ? (
                    <div
                      style={{
                        marginTop: 12,
                        width: '100%',
                        height: 200,
                        borderRadius: 12,
                        backgroundImage: `url(${editReplaceMainPreview})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    />
                  ) : null}
                </div>

                <div style={{ border: '1.5px solid #e7e9f2', borderRadius: 12, padding: 12, background: '#fafbff' }}>
                  <div style={{ fontWeight: 950 as any, fontSize: ui.inputFont, color: '#1f2130' }}>Others (до 10)</div>
                  <div style={{ marginTop: 10 }}>
                    <input
                      ref={editReplaceOtherInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={loadingAction}
                      onChange={(e) => {
                        editReplaceOtherPreviews.forEach((p) => URL.revokeObjectURL(p.url));
                        const files = Array.from(e.target.files || []);
                        setEditReplaceOtherFiles(files);
                        setEditReplaceOtherPreviews(filesToPreviews(files));
                      }}
                      style={{ fontSize: ui.inputFont }}
                    />
                  </div>

                  {editReplaceOtherPreviews.length ? (
                    <div
                      style={{
                        marginTop: 12,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: 10,
                      }}
                    >
                      {editReplaceOtherPreviews.slice(0, 10).map((p) => (
                        <div
                          key={p.url}
                          title={p.name}
                          style={{
                            width: '100%',
                            aspectRatio: '1 / 1',
                            borderRadius: 12,
                            backgroundImage: `url(${p.url})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            border: '1px solid rgba(0,0,0,0.06)',
                          }}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 12 }}>
                <button
                  onClick={replaceImages}
                  disabled={loadingAction || !editReplaceMainFile}
                  style={{
                    background: '#ff6b2c',
                    border: 'none',
                    height: ui.btnHeight,
                    padding: '0 20px',
                    color: '#fff',
                    borderRadius: 12,
                    fontWeight: 950 as any,
                    fontSize: ui.btnFont,
                    cursor: loadingAction || !editReplaceMainFile ? 'not-allowed' : 'pointer',
                    boxShadow: '0 6px 18px rgba(255,107,44,0.28)',
                    opacity: loadingAction || !editReplaceMainFile ? 0.6 : 1,
                  }}
                >
                  Replace
                </button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CategoryItem({
  ui,
  title,
  active,
  badge,
  onClick,
  onEdit,
  onDelete,
  disabledActions,
}: {
  ui: {
    btnFont: number;
    chipFont: number;
    iconBtnRadius: number;
  };
  title: string;
  active: boolean;
  badge?: string;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disabledActions?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 12px',
        borderRadius: 12,
        marginBottom: 10,
        background: active ? '#2d2d44' : 'transparent',
        cursor: 'pointer',
        transition: '0.18s',
        border: active ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div
        style={{
          fontWeight: active ? 950 : 800,
          fontSize: 13,
          color: '#fff',
          flex: 1,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis',
        }}
        title={title}
      >
        {title}
      </div>

      {badge ? (
        <div
          style={{
            fontSize: ui.chipFont,
            fontWeight: 950 as any,
            padding: '5px 10px',
            borderRadius: 999,
            background: active ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.12)',
          }}
          title="Количество товаров"
        >
          {badge}
        </div>
      ) : null}

      {onEdit ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          disabled={disabledActions}
          style={{
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'transparent',
            color: '#fff',
            width: 32,
            height: 32,
            borderRadius: ui.iconBtnRadius,
            cursor: disabledActions ? 'not-allowed' : 'pointer',
            opacity: disabledActions ? 0.55 : 1,
            fontWeight: 900,
          }}
          title="Редактировать"
          aria-label="Edit category"
        >
          ✎
        </button>
      ) : null}

      {onDelete ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={disabledActions}
          style={{
            border: '1px solid rgba(255,255,255,0.18)',
            background: 'transparent',
            color: '#ffb4c3',
            width: 32,
            height: 32,
            borderRadius: ui.iconBtnRadius,
            cursor: disabledActions ? 'not-allowed' : 'pointer',
            opacity: disabledActions ? 0.55 : 1,
            fontWeight: 900,
          }}
          title="Удалить"
          aria-label="Delete category"
        >
          🗑
        </button>
      ) : null}
    </div>
  );
}

function Modal({
  ui,
  open,
  title,
  onClose,
  children,
  maxWidth = 640,
}: {
  ui: { baseFontSize: number };
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  if (!open) return null;

  return (
    <div
      onMouseDown={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 16,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 18px 60px rgba(0,0,0,0.22)',
          overflow: 'hidden',
          fontSize: ui.baseFontSize,

          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderBottom: '1px solid #eceef6',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontWeight: 950 as any, color: '#1f2130', flex: 1 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              border: '1px solid rgba(31,33,48,0.14)',
              background: 'transparent',
              borderRadius: 12,
              width: 40,
              height: 40,
              cursor: 'pointer',
              fontWeight: 900,
              color: '#1f2130',
              fontSize: 16,
            }}
            aria-label="Close modal"
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        <div
          style={{
            padding: 16,
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}