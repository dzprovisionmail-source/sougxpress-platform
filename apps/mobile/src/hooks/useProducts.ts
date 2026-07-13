
import { useState, useEffect } from 'react';
import { Product, ProductImage } from '../types/schema-03-core';
import { getProductsByStore, getProductImages, searchProducts } from '../services/product.service';

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
