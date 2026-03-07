'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

type MenuCategory = {
  id: string;
  titleRu: string;
  sortOrder?: number;
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
};

type MenuResponse = {
  restaurant: { id: string; nameRu: string };
  categories: MenuCategory[];
  items: MenuItem[];
};

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

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
  const [newItemWeight, setNewItemWeight] = useState(''); // граммовка/литраж (текст)
  const [newItemComposition, setNewItemComposition] = useState(''); // состав
  const [newItemPrice, setNewItemPrice] = useState(''); // строкой, потом Number()
  const [newItemDescription, setNewItemDescription] = useState(''); // опционально
  const [newItemIsDrink, setNewItemIsDrink] = useState(false); // если напиток — состав не обязателен
  const [newItemCategoryId, setNewItemCategoryId] = useState<string>(''); // если не выбрана активная

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

  const loadMenu = async () => {
    try {
      setLoading(true);
      setError(null);

      const r = await fetch(`${API}/restaurants/${id}/menu?includeUnavailable=1`, {
        cache: 'no-store',
      });

      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`Menu fetch failed: ${r.status} ${t}`);
      }

      const json = (await r.json()) as MenuResponse;
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

      const r = await fetch(`${API}/food-categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`Create category failed: ${r.status} ${t}`);
      }

      setIsCategoryModalOpen(false);
      await loadMenu();
    } catch (e: any) {
      setError(e?.message || 'Ошибка создания категории');
    } finally {
      setLoadingAction(false);
    }
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
    setIsItemModalOpen(true);
  };

  const normalizePrice = (raw: string) => {
    const cleaned = raw.replace(/\s/g, '').replace(/,/g, '.');
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : NaN;
  };

  const canCreateItem = useMemo(() => {
    const titleOk = !!newItemTitleRu.trim();
    const priceOk = Number.isFinite(normalizePrice(newItemPrice)) && normalizePrice(newItemPrice) > 0;

    const categoryOk = !!(activeCategory || newItemCategoryId);
    const compositionOk = newItemIsDrink ? true : !!newItemComposition.trim();

    return titleOk && priceOk && categoryOk && compositionOk && !loadingAction;
  }, [
    newItemTitleRu,
    newItemPrice,
    newItemCategoryId,
    activeCategory,
    newItemComposition,
    newItemIsDrink,
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

    try {
      setLoadingAction(true);
      setError(null);

      // ✅ ВАЖНО: правильный endpoint бэка:
      // POST /restaurants/:id/menu/products
      const payload: any = {
        categoryId,
        titleRu,
        titleKk: titleRu,
        price: Number(price),

        weight: weight || null,
        composition: composition || null,
        description: description || null,
        isDrink: newItemIsDrink,
      };

      const r = await fetch(`${API}/restaurants/${id}/menu/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`Create item failed: ${r.status} ${t}`);
      }

      setIsItemModalOpen(false);
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

      const r = await fetch(`${API}/restaurants/${id}/categories/${editCategoryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titleRu,
          titleKk: titleRu,
          sortOrder: sortOrderValue,
        }),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`Update category failed: ${r.status} ${t}`);
      }

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

      const r = await fetch(`${API}/restaurants/${id}/categories/${category.id}`, {
        method: 'DELETE',
      });

      if (r.status === 409) {
        const json = await r.json().catch(() => null);
        const productsCount = json?.productsCount ?? 0;

        const forceConfirm = window.confirm(
          `В категории ${productsCount} товаров.\nУдалить категорию вместе со всеми товарами?`,
        );

        if (!forceConfirm) return;

        const r2 = await fetch(`${API}/restaurants/${id}/categories/${category.id}?force=true`, {
          method: 'DELETE',
        });

        if (!r2.ok) {
          const t2 = await r2.text().catch(() => '');
          throw new Error(`Force delete category failed: ${r2.status} ${t2}`);
        }
      } else if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`Delete category failed: ${r.status} ${t}`);
      }

      if (activeCategory === category.id) setActiveCategory(null);
      await loadMenu();
    } catch (e: any) {
      setError(e?.message || 'Ошибка удаления категории');
    } finally {
      setLoadingAction(false);
    }
  };

  // ==========================
  // ITEM EDIT/DELETE
  // ==========================
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

      const r = await fetch(`${API}/restaurants/${id}/menu/products/${editItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`Update item failed: ${r.status} ${t}`);
      }

      setIsEditItemModalOpen(false);
      setEditItemId(null);
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

      const r = await fetch(`${API}/restaurants/${id}/menu/products/${item.id}`, {
        method: 'DELETE',
      });

      if (!r.ok) {
        const t = await r.text().catch(() => '');
        throw new Error(`Delete item failed: ${r.status} ${t}`);
      }

      await loadMenu();
    } catch (e: any) {
      setError(e?.message || 'Ошибка удаления товара');
    } finally {
      setLoadingAction(false);
    }
  };

  const goCreateItem = () => {
    openCreateItemModal();
  };

  const goEditItem = (itemId: string) => {
    const item = data?.items.find((x) => x.id === itemId) || null;
    if (!item) return;
    openEditItemModal(item);
  };

  if (loading && !data) return <div className="p-10">Loading...</div>;

  if (!data) {
    return (
      <div className="p-10">
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Меню не загружено</div>
        <div style={{ color: '#666', marginBottom: 14 }}>{error || '—'}</div>
        <button
          onClick={loadMenu}
          style={{
            background: '#ff6b2c',
            border: 'none',
            padding: '10px 16px',
            color: '#fff',
            borderRadius: 10,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(255,107,44,0.35)',
          }}
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      {/* LEFT SIDEBAR */}
      <div
        style={{
          width: 280,
          background: '#1e1e2d',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #2a2a3d',
        }}
      >
        {/* Sidebar header */}
        <div style={{ padding: 18, borderBottom: '1px solid #2a2a3d' }}>
          <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 0.2 }}>
            {data.restaurant?.nameRu || 'Ресторан'}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 10 }}>
            <button
              onClick={openCreateCategoryModal}
              style={{
                flex: 1,
                background: '#ff6b2c',
                border: 'none',
                padding: '10px 12px',
                color: '#fff',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255,107,44,0.35)',
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
                padding: '10px 12px',
                color: '#fff',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
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
            active={!activeCategory}
            title="Все"
            badge={String(totalItemsCount)}
            onClick={() => setActiveCategory(null)}
          />

          {data.categories.map((c) => {
            const count = data.items.filter((i) => i.categoryId === c.id).length;
            return (
              <CategoryItem
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
        {/* TOP THIN BAR */}
        <div
          style={{
            height: 56,
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
                fontSize: 16,
                fontWeight: 900,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: 520,
              }}
              title={activeCategoryTitle}
            >
              {activeCategoryTitle}
            </div>

            <div
              style={{
                fontSize: 12,
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.10)',
                border: '1px solid rgba(255,255,255,0.10)',
              }}
              title="Количество товаров в текущем списке"
            >
              {activeItemsCount} шт.
            </div>

            {error ? (
              <div
                style={{
                  fontSize: 12,
                  color: '#ffb4b4',
                  marginLeft: 8,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: 520,
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
                border: '1px solid rgba(255,255,255,0.14)',
                padding: '8px 12px',
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13,
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
                padding: '8px 14px',
                color: '#fff',
                borderRadius: 10,
                fontWeight: 900,
                fontSize: 13,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255,107,44,0.35)',
              }}
            >
              + Товар
            </button>
          </div>
        </div>

        {/* CONTENT BODY */}
        <div style={{ flex: 1, padding: '18px 18px 26px 18px', overflow: 'auto' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 240px))',
              justifyContent: 'flex-start',
              gap: 18,
            }}
          >
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => goEditItem(item.id)}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  overflow: 'hidden',
                  boxShadow: '0 10px 28px rgba(0,0,0,0.06)',
                  cursor: 'pointer',
                  transition: 'transform 0.18s ease, box-shadow 0.18s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-6px)';
                  e.currentTarget.style.boxShadow = '0 14px 34px rgba(0,0,0,0.10)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.06)';
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
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.10)',
                      background: 'rgba(255,255,255,0.95)',
                      cursor: loadingAction ? 'not-allowed' : 'pointer',
                      fontWeight: 900,
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
                      width: 34,
                      height: 34,
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.10)',
                      background: 'rgba(255,255,255,0.95)',
                      cursor: loadingAction ? 'not-allowed' : 'pointer',
                      fontWeight: 900,
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
                    width: 240,
                    height: 240,
                    backgroundImage: `url(${
                      item.imageUrl || 'https://via.placeholder.com/500x500?text=No+Image'
                    })`,
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
                      padding: '7px 12px',
                      borderRadius: 999,
                      fontWeight: 900,
                      fontSize: 13,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.10)',
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
                      fontWeight: 800,
                      color: '#fff',
                      background: item.isAvailable
                        ? 'rgba(27,197,189,0.95)'
                        : 'rgba(246,78,96,0.95)',
                      boxShadow: '0 6px 16px rgba(0,0,0,0.18)',
                    }}
                  >
                    {item.isAvailable ? 'Доступен' : 'Недоступен'}
                  </div>
                </div>

                <div style={{ padding: 14 }}>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: 14,
                      marginBottom: 6,
                      lineHeight: 1.25,
                      minHeight: 36,
                      color: '#1f2130',
                    }}
                  >
                    {item.titleRu}
                  </div>

                  <div style={{ fontSize: 12, color: '#7a7d85', fontWeight: 700 }}>
                    Нажми для редактирования
                  </div>
                </div>
              </div>
            ))}
          </div>

          {items.length === 0 ? (
            <div
              style={{
                marginTop: 22,
                background: '#fff',
                borderRadius: 14,
                padding: 16,
                boxShadow: '0 10px 28px rgba(0,0,0,0.06)',
                color: '#555',
                fontWeight: 700,
              }}
            >
              Товары не найдены. Добавь товар или выбери другую категорию.
            </div>
          ) : null}
        </div>
      </div>

      {/* MODAL: Create Category */}
      <Modal
        open={isCategoryModalOpen}
        title="Создать категорию"
        onClose={() => (loadingAction ? null : setIsCategoryModalOpen(false))}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>
            Название категории
          </label>
          <input
            value={newCategoryTitleRu}
            onChange={(e) => setNewCategoryTitleRu(e.target.value)}
            placeholder="Например: Бургеры"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') createCategory();
              if (e.key === 'Escape' && !loadingAction) setIsCategoryModalOpen(false);
            }}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              disabled={loadingAction}
              style={{
                background: 'transparent',
                color: '#1f2130',
                border: '1px solid rgba(31,33,48,0.18)',
                padding: '10px 14px',
                borderRadius: 12,
                fontWeight: 900,
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
                padding: '10px 14px',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 900,
                cursor: loadingAction || !newCategoryTitleRu.trim() ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
                opacity: loadingAction || !newCategoryTitleRu.trim() ? 0.65 : 1,
              }}
            >
              {loadingAction ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#7a7d85', fontWeight: 700, marginTop: 6 }}>
            После сохранения категория появится слева автоматически.
          </div>
        </div>
      </Modal>

      {/* MODAL: Edit Category */}
      <Modal
        open={isEditCategoryModalOpen}
        title="Редактировать категорию"
        onClose={() => (loadingAction ? null : setIsEditCategoryModalOpen(false))}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Название категории</label>
          <input
            value={editCategoryTitleRu}
            onChange={(e) => setEditCategoryTitleRu(e.target.value)}
            placeholder="Например: Бургеры"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSaveCategory) saveCategory();
              if (e.key === 'Escape' && !loadingAction) setIsEditCategoryModalOpen(false);
            }}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          />

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Порядок сортировки</label>
          <input
            value={editCategorySortOrder}
            onChange={(e) => setEditCategorySortOrder(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              onClick={() => setIsEditCategoryModalOpen(false)}
              disabled={loadingAction}
              style={{
                background: 'transparent',
                color: '#1f2130',
                border: '1px solid rgba(31,33,48,0.18)',
                padding: '10px 14px',
                borderRadius: 12,
                fontWeight: 900,
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
                padding: '10px 14px',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 900,
                cursor: !canSaveCategory ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
                opacity: !canSaveCategory ? 0.65 : 1,
              }}
            >
              {loadingAction ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#7a7d85', fontWeight: 700, marginTop: 6 }}>
            Редактирование применяется сразу после сохранения.
          </div>
        </div>
      </Modal>

      {/* MODAL: Create Item */}
      <Modal
        open={isItemModalOpen}
        title="Создать товар"
        onClose={() => (loadingAction ? null : setIsItemModalOpen(false))}
        maxWidth={720}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!activeCategory ? (
            <>
              <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Категория</label>
              <select
                value={newItemCategoryId}
                onChange={(e) => setNewItemCategoryId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 12px',
                  borderRadius: 12,
                  border: '1px solid #e3e5ee',
                  outline: 'none',
                  fontSize: 14,
                  fontWeight: 800,
                  background: '#fafbff',
                }}
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

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Название (RU)</label>
          <input
            value={newItemTitleRu}
            onChange={(e) => setNewItemTitleRu(e.target.value)}
            placeholder="Например: Чизбургер"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canCreateItem) createItem();
              if (e.key === 'Escape' && !loadingAction) setIsItemModalOpen(false);
            }}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          />

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Граммовка / Литраж</label>
          <input
            value={newItemWeight}
            onChange={(e) => setNewItemWeight(e.target.value)}
            placeholder="Например: 350 г / 0.5 л"
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input
              id="isDrinkCreate"
              type="checkbox"
              checked={newItemIsDrink}
              onChange={(e) => setNewItemIsDrink(e.target.checked)}
              style={{ transform: 'scale(1.05)' }}
            />
            <label htmlFor="isDrinkCreate" style={{ fontSize: 13, fontWeight: 900, color: '#1f2130' }}>
              Это напиток (состав необязателен)
            </label>
          </div>

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>
            Состав {newItemIsDrink ? '(опционально)' : '(обязательно)'}
          </label>
          <textarea
            value={newItemComposition}
            onChange={(e) => setNewItemComposition(e.target.value)}
            placeholder="Например: говядина, сыр, соус, булочка..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
              resize: 'vertical',
            }}
          />

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Цена (₸)</label>
          <input
            value={newItemPrice}
            onChange={(e) => setNewItemPrice(e.target.value)}
            placeholder="Например: 1290"
            inputMode="numeric"
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          />

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Описание (опционально)</label>
          <textarea
            value={newItemDescription}
            onChange={(e) => setNewItemDescription(e.target.value)}
            placeholder="Короткое описание для клиента..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              onClick={() => setIsItemModalOpen(false)}
              disabled={loadingAction}
              style={{
                background: 'transparent',
                color: '#1f2130',
                border: '1px solid rgba(31,33,48,0.18)',
                padding: '10px 14px',
                borderRadius: 12,
                fontWeight: 900,
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
                padding: '10px 14px',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 900,
                cursor: !canCreateItem ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
                opacity: !canCreateItem ? 0.65 : 1,
              }}
            >
              {loadingAction ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#7a7d85', fontWeight: 700, marginTop: 6 }}>
            После сохранения товар появится в списке автоматически.
          </div>
        </div>
      </Modal>

      {/* MODAL: Edit Item */}
      <Modal
        open={isEditItemModalOpen}
        title="Редактировать товар"
        onClose={() => (loadingAction ? null : setIsEditItemModalOpen(false))}
        maxWidth={720}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Категория</label>
          <select
            value={editItemCategoryId}
            onChange={(e) => setEditItemCategoryId(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          >
            <option value="">Выбери категорию</option>
            {data.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.titleRu}
              </option>
            ))}
          </select>

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Название (RU)</label>
          <input
            value={editItemTitleRu}
            onChange={(e) => setEditItemTitleRu(e.target.value)}
            placeholder="Например: Чизбургер"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canSaveItem) saveItem();
              if (e.key === 'Escape' && !loadingAction) setIsEditItemModalOpen(false);
            }}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          />

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Граммовка / Литраж</label>
          <input
            value={editItemWeight}
            onChange={(e) => setEditItemWeight(e.target.value)}
            placeholder="Например: 350 г / 0.5 л"
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input
              id="isDrinkEdit"
              type="checkbox"
              checked={editItemIsDrink}
              onChange={(e) => setEditItemIsDrink(e.target.checked)}
              style={{ transform: 'scale(1.05)' }}
            />
            <label htmlFor="isDrinkEdit" style={{ fontSize: 13, fontWeight: 900, color: '#1f2130' }}>
              Это напиток (состав необязателен)
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <input
              id="isAvailableEdit"
              type="checkbox"
              checked={editItemIsAvailable}
              onChange={(e) => setEditItemIsAvailable(e.target.checked)}
              style={{ transform: 'scale(1.05)' }}
            />
            <label htmlFor="isAvailableEdit" style={{ fontSize: 13, fontWeight: 900, color: '#1f2130' }}>
              Доступен (isAvailable)
            </label>
          </div>

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>
            Состав {editItemIsDrink ? '(опционально)' : '(обязательно)'}
          </label>
          <textarea
            value={editItemComposition}
            onChange={(e) => setEditItemComposition(e.target.value)}
            placeholder="Например: говядина, сыр, соус, булочка..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
              resize: 'vertical',
            }}
          />

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Цена (₸)</label>
          <input
            value={editItemPrice}
            onChange={(e) => setEditItemPrice(e.target.value)}
            placeholder="Например: 1290"
            inputMode="numeric"
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
            }}
          />

          <label style={{ fontSize: 12, fontWeight: 900, color: '#2b2b3a' }}>Описание (опционально)</label>
          <textarea
            value={editItemDescription}
            onChange={(e) => setEditItemDescription(e.target.value)}
            placeholder="Короткое описание для клиента..."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 12px',
              borderRadius: 12,
              border: '1px solid #e3e5ee',
              outline: 'none',
              fontSize: 14,
              fontWeight: 800,
              background: '#fafbff',
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 6 }}>
            <button
              onClick={() => setIsEditItemModalOpen(false)}
              disabled={loadingAction}
              style={{
                background: 'transparent',
                color: '#1f2130',
                border: '1px solid rgba(31,33,48,0.18)',
                padding: '10px 14px',
                borderRadius: 12,
                fontWeight: 900,
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
                padding: '10px 14px',
                color: '#fff',
                borderRadius: 12,
                fontWeight: 900,
                cursor: !canSaveItem ? 'not-allowed' : 'pointer',
                boxShadow: '0 6px 18px rgba(255,107,44,0.35)',
                opacity: !canSaveItem ? 0.65 : 1,
              }}
            >
              {loadingAction ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>

          <div style={{ fontSize: 12, color: '#7a7d85', fontWeight: 700, marginTop: 6 }}>
            Редактирование применяется сразу после сохранения.
          </div>
        </div>
      </Modal>
    </div>
  );
}

function CategoryItem({
  title,
  active,
  badge,
  onClick,
  onEdit,
  onDelete,
  disabledActions,
}: {
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
        border: active ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <div
        style={{
          fontWeight: active ? 900 : 700,
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
            fontSize: 12,
            fontWeight: 900,
            padding: '4px 10px',
            borderRadius: 999,
            background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.10)',
            border: '1px solid rgba(255,255,255,0.10)',
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
            width: 30,
            height: 30,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(255,255,255,0.06)',
            color: '#fff',
            cursor: disabledActions ? 'not-allowed' : 'pointer',
            fontWeight: 900,
            opacity: disabledActions ? 0.5 : 1,
          }}
          title="Редактировать категорию"
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
            width: 30,
            height: 30,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(255,255,255,0.06)',
            color: '#ffb4b4',
            cursor: disabledActions ? 'not-allowed' : 'pointer',
            fontWeight: 900,
            opacity: disabledActions ? 0.5 : 1,
          }}
          title="Удалить категорию"
          aria-label="Delete category"
        >
          🗑
        </button>
      ) : null}
    </div>
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
  maxWidth,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
}) {
  if (!open) return null;

  return (
    <div
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 18,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: maxWidth ?? 520,
          background: '#ffffff',
          borderRadius: 18,
          boxShadow: '0 22px 60px rgba(0,0,0,0.28)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            background: '#1f2130',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 900, fontSize: 14 }}>{title}</div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.18)',
              color: '#fff',
              borderRadius: 10,
              padding: '6px 10px',
              fontWeight: 900,
              cursor: 'pointer',
            }}
            aria-label="Close"
            title="Закрыть"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 16 }}>{children}</div>
      </div>
    </div>
  );
}
