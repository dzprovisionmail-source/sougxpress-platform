
import { useState, useEffect, useCallback } from 'react';
import { Product, ProductImage, ProductStatus } from '../types/schema-03-core';
import { getProductsByStore, getProductImages, searchProducts } from '../services/product.service';
import {
  getProductsByStoreForMerchant,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/product.service';

/**
 * Full product management (all statuses, CRUD) for the merchant's own store.
 * Unlike useStoreProducts (customer-facing, active-only), this powers the
 * Merchant workspace's product list, add/edit/delete/hide-show actions.
 */
export const useMerchantProducts = (storeId: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const data = await getProductsByStoreForMerchant(storeId);
      setProducts(data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const addProduct = async (input: {
    name: string;
    description?: string | null;
    price_minor: number;
    stock_quantity?: number | null;
  }) => {
    const created = await createProduct({ store_id: storeId, ...input });
    if (created) await fetchProducts();
    return !!created;
  };

  const editProduct = async (
    productId: string,
    updates: Partial<Pick<Product, 'name' | 'description' | 'price_minor' | 'stock_quantity'>>
  ) => {
    const updated = await updateProduct(productId, updates);
    if (updated) await fetchProducts();
    return !!updated;
  };

  const removeProduct = async (productId: string) => {
    const success = await deleteProduct(productId);
    if (success) await fetchProducts();
    return success;
  };

  const setVisibility = async (productId: string, visible: boolean) => {
    const nextStatus: ProductStatus = visible ? 'active' : 'archived';
    const updated = await updateProduct(productId, { status: nextStatus });
    if (updated) await fetchProducts();
    return !!updated;
  };

  return {
    products,
    loading,
    error,
    refresh: fetchProducts,
    addProduct,
    editProduct,
    removeProduct,
    setVisibility,
  };
};

export const useStoreProducts = (storeId: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!storeId) return;
      setLoading(true);
      try {
        const data = await getProductsByStore(storeId);
        setProducts(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [storeId]);

  return { products, loading, error };
};

export const useProductDetails = (productId: string) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!productId) return;
      setLoading(true);
      try {
        const { getProduct } = await import('../services/product.service');
        const productData = await getProduct(productId);
        const imageData = await getProductImages(productId);
        setProduct(productData);
        setImages(imageData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [productId]);

  return { product, images, loading, error };
};
