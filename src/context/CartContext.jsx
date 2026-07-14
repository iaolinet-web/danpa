import { createContext, useContext, useState, useEffect } from 'react'

const CartContext = createContext()

const CART_KEY = 'danpa_cart'

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(CART_KEY)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  const addItem = (producto, cantidad = 1) => {
    setItems(prev => {
      const exists = prev.find(i => i.id === producto.id)
      if (exists) {
        return prev.map(i =>
          i.id === producto.id ? { ...i, cantidad: i.cantidad + cantidad } : i
        )
      }
      return [...prev, { ...producto, cantidad }]
    })
  }

  const removeItem = (productoId) => {
    setItems(prev => prev.filter(i => i.id !== productoId))
  }

  const updateQuantity = (productoId, cantidad) => {
    if (cantidad <= 0) {
      removeItem(productoId)
      return
    }
    setItems(prev =>
      prev.map(i => (i.id === productoId ? { ...i, cantidad } : i))
    )
  }

  const clearCart = () => setItems([])

  const total = items.reduce((sum, i) => sum + i.precio * i.cantidad, 0)

  const itemCount = items.reduce((sum, i) => sum + i.cantidad, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, total, itemCount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  return useContext(CartContext)
}
