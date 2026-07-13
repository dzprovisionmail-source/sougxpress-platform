
import { useState, useEffect, useCallback } from 'react';
import { CartItem, getCart, addToCart, removeFromCart, updateCartItemQuantity, clearCart } from '../services/cart.service';
import { Product } from '../types/schema-03-core';

const useCart = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshCart = useCallback(async () => {
    setLoading(true);
    const items = await getCart();
    setCartItems(items);
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshCart();
  }, [refreshCart]);

  const handleAddToCart = async (product: Product, quantity: number = 1) => {
    const updatedCart = await addToCart(product, quantity);
    setCartItems(updatedCart);
  };

  const handleRemoveFromCart = async (productId: string) => {
    const updatedCart = await removeFromCart(productId);
    setCartItems(updatedCart);
  };

  const handleUpdateQuantity = async (productId: string, quantity: number) => {
    const updatedCart = await updateCartItemQuantity(productId, quantity);
    setCartItems(updatedCart);
  };

  const handleClearCart = async () => {
    await clearCart();
    setCartItems([]);
  };

  const subtotal = cartItems.reduce((acc, item) => acc + (item.product.price_minor * item.quantity), 0);
  const deliveryFee = 20000; // Placeholder: 200.00 DZD in minor units
  const total = subtotal + deliveryFee;

  return {
    cartItems,
    loading,
    addToCart: handleAddToCart,
    removeFromCart: handleRemoveFromCart,
    updateQuantity: handleUpdateQuantity,
    clearCart: handleClearCart,
    refreshCart,
    subtotal,
    deliveryFee,
    total,
    itemCount: cartItems.reduce((acc, item) => acc + item.quantity, 0),
  };
};

export default useCart;
