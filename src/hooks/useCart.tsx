import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      // verificar se existe estoque
      const response = await api.get<Stock>(`/stock/${productId}`);
      const productStock = response.data;
      const productExists = cart.find(item => item.id === productId);

      if (productExists) {
        if (productStock.amount < productExists.amount + 1) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const updatedCart = cart.map(item => {
          if (item.id === productId) {
            return {...item, amount: item.amount+1};
          }
          return item;
        });

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        await api.put(`/stock/${productId}`, { id: productId, amount: productExists.amount+1 });
      } else {
        const response = await api.get<Product>(`/products/${productId}`);
        const product = {...response.data, amount: 1};

        const updatedCart = [...cart, product];

        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        await api.post(`/stock/${productId}`, { id: productId, amount: 1 });
      }

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const productExists = cart.find(item => item.id === productId);

      if (productExists) {
        const updatedCart = cart.filter(item => item.id !== productId);
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        await api.delete(`/stock/${productId}`);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      // verificar se existe estoque
      const response = await api.get<Stock>(`/stock/${productId}`);
      const productStock = response.data;
      
      if (productStock) {
        if (productStock.amount < amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
  
        const updatedCart = cart.map(item => {
          if (item.id === productId) {
            return {...item, amount: amount};
          }
          return item;
        });
        
        setCart(updatedCart);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        await api.put(`/stock/${productId}`, { amount });
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
