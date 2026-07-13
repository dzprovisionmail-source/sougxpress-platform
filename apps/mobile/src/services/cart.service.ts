
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product } from '../types/schema-03-core';

const CART_STORAGE_KEY = '@sougxpress_cart';

export interface CartItem {
  product: Product;
  quantity: number;
}

export const getCart = async (): Promise<CartItem[]> => {
  try {
    const cartJson = await AsyncStorage.getItem(CART_STORAGE_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
  } catch (error) {
    console.error('Error getting cart:', error);
    return [];
  }
};

export const saveCart = async (cart: CartItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  } catch (error) {
    console.error('Error saving cart:', error);
  }
};

export const addToCart = async (product: Product, quantity: number = 1): Promise<CartItem[]> => {
  const cart = await getCart();
  const existingItemIndex = cart.findIndex(item => item.product.id === product.id);

  if (existingItemIndex > -1) {
    cart[existingItemIndex].quantity += quantity;
  } else {
    cart.push({ product, quantity });
  }

  await saveCart(cart);
  return cart;
};

export const removeFromCart = async (productId: string): Promise<CartItem[]> => {
  const cart = await getCart();
  const updatedCart = cart.filter(item => item.product.id !== productId);
  await saveCart(updatedCart);
  return updatedCart;
};

export const updateCartItemQuantity = async (productId: string, quantity: number): Promise<CartItem[]> => {
  const cart = await getCart();
  const itemIndex = cart.findIndex(item => item.product.id === productId);

  if (itemIndex > -1) {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }
    cart[itemIndex].quantity = quantity;
    await saveCart(cart);
  }

  return cart;
};

export const clearCart = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing cart:', error);
  }
};
