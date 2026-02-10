"use client"

import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { ProductCard } from "@/components/product-card"
import { ProductModal, OrderItem } from "@/components/product-modal"
import { CartSidebar } from "@/components/cart-sidebar"
import { CheckoutDialog } from "@/components/checkout-dialog"
import { Button } from "@/components/ui/button"
import { ShoppingBag, Loader2, Search, Utensils, ChevronLeft, ChevronRight } from "lucide-react"
import { Product } from "@/types"
import { Input } from "@/components/ui/input"

// --- TIPOS ---
interface Modifier {
  id: string
  name: string
  price: number
}

interface ModifierGroup {
  id: string
  name: string
  minSelection: number
  maxSelection: number
  modifiers: Modifier[]
}

interface SupabaseProduct {
  id: string
  name: string
  description: string | null
  price: number
  image_url: string | null
  is_popular: boolean
  category: string
  ingredients: ModifierGroup[] | null
}

const CATEGORIES = [
  "hamburguers", "hot-dog", "smashes", "entradas", "pizzas", "pizzas doce", "bebidas", "sobremesas", "milkshake"
]

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState("todos")
  const [searchTerm, setSearchTerm] = useState("")

  // Estados de Interface
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [cartItems, setCartItems] = useState<OrderItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Scroll Refs
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)

  // 1. BUSCAR PRODUTOS
  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name')
      
      if (data) {
        const rawData = data as unknown as SupabaseProduct[]
        const formattedProducts: Product[] = rawData.map(item => ({
          id: item.id,
          name: item.name,
          description: item.description || "",
          price: Number(item.price),
          imageUrl: item.image_url || "",
          isPopular: item.is_popular,
          category: item.category,
          modifierGroups: item.ingredients || []
        }))
        setProducts(formattedProducts)
      } else {
        console.error("Erro ao buscar produtos:", error)
      }
      setLoadingProducts(false)
    }

    fetchProducts()
  }, [])

  // --- LÓGICA DE SCROLL DO MENU ---
  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setShowLeftArrow(scrollLeft > 0)
      // Pequena margem de erro (1px) para garantir que funcione em telas de alta densidade
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  useEffect(() => {
    checkScroll()
    window.addEventListener('resize', checkScroll)
    return () => window.removeEventListener('resize', checkScroll)
  }, [])

  const scrollMenu = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200 // Quantidade de pixels para rolar
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat)
    // Opcional: Centralizar o botão clicado se desejar lógica complexa, 
    // mas o scroll manual já ajuda muito.
  }

  // --- LÓGICA DE FILTRAGEM ---
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "todos" || product.category === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // --- CARRINHO ---
  const handleOpenModal = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleAddToCart = (orderItem: OrderItem) => {
    setCartItems([...cartItems, orderItem])
    setIsModalOpen(false)
  }

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cartItems]
    newCart.splice(index, 1)
    setCartItems(newCart)
  }

  const handleProceedToCheckout = () => {
    setIsCartOpen(false)
    setIsCheckoutOpen(true)
  }

  const cartTotal = cartItems.reduce((acc, item) => acc + item.totalPrice, 0)

  return (
    <main className="min-h-screen bg-slate-50 pb-32">
      
      {/* HEADER */}
      <header className="bg-white p-6 pb-4 shadow-sm">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold text-slate-800 mb-1">
            Abell&apos;s <span className="text-red-600">Gastroburger</span> 🍔
          </h1>
          <p className="text-sm text-slate-500 mb-4">O verdadeiro sabor artesanal.</p>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
                placeholder="O que você quer comer hoje?" 
                className="pl-10 bg-slate-100 border-none h-12 rounded-xl"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </header>

      {/* MENU DE CATEGORIAS INTELIGENTE */}
      <div className="sticky top-0 z-30 bg-white border-b shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
         <div className="max-w-5xl mx-auto relative group">
            
            {/* Seta Esquerda (Com degradê) */}
            {showLeftArrow && (
              <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center bg-gradient-to-r from-white via-white/80 to-transparent pl-2 pr-6">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="h-8 w-8 rounded-full shadow-md bg-white hover:bg-slate-100"
                  onClick={() => scrollMenu('left')}
                >
                  <ChevronLeft className="h-4 w-4 text-slate-700" />
                </Button>
              </div>
            )}

            {/* Container de Scroll (Escondendo a barra nativa) */}
            <div 
              ref={scrollContainerRef}
              onScroll={checkScroll}
              className="flex space-x-2 overflow-x-auto py-3 px-4 scrollbar-hide scroll-smooth"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} // Esconde scrollbar no Firefox/IE
            >
                <Button 
                    variant={selectedCategory === "todos" ? "default" : "outline"}
                    onClick={() => handleCategoryClick("todos")}
                    className={`rounded-full px-6 shrink-0 transition-all ${selectedCategory === "todos" ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                    Todos
                </Button>
                {CATEGORIES.map((cat) => (
                    <Button
                        key={cat}
                        variant={selectedCategory === cat ? "default" : "outline"}
                        onClick={() => handleCategoryClick(cat)}
                        className={`capitalize rounded-full px-6 shrink-0 transition-all ${selectedCategory === cat ? 'bg-red-600 hover:bg-red-700 text-white border-red-600 shadow-md' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                    >
                        {cat}
                    </Button>
                ))}
            </div>

            {/* Seta Direita (Com degradê) */}
            {showRightArrow && (
              <div className="absolute right-0 top-0 bottom-0 z-10 flex items-center justify-end bg-gradient-to-l from-white via-white/80 to-transparent pr-2 pl-6">
                <Button 
                  size="icon" 
                  variant="secondary" 
                  className="h-8 w-8 rounded-full shadow-md bg-white hover:bg-slate-100"
                  onClick={() => scrollMenu('right')}
                >
                  <ChevronRight className="h-4 w-4 text-slate-700" />
                </Button>
              </div>
            )}

         </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Loading */}
        {loadingProducts ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-red-500" />
            <p>Carregando cardápio...</p>
          </div>
        ) : (
          <>
            {/* Título da Seção */}
            <div className="flex items-center gap-2 mb-6 mt-2">
                <h2 className="text-xl font-bold capitalize text-slate-800">
                    {selectedCategory === 'todos' ? 'Destaques' : selectedCategory}
                </h2>
                <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-bold">
                    {filteredProducts.length}
                </span>
            </div>

            {/* Grid de Produtos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {filteredProducts.map(product => (
                <ProductCard 
                    key={product.id} 
                    product={product} 
                    onAdd={handleOpenModal} 
                />
                ))}
            </div>

            {/* Estado Vazio */}
            {filteredProducts.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                    <Utensils className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-lg font-medium text-slate-600">Ops! Nenhum item encontrado.</p>
                    <Button variant="link" onClick={() => {setSelectedCategory("todos"); setSearchTerm("")}} className="mt-2 text-red-600">
                        Limpar filtros
                    </Button>
                </div>
            )}
          </>
        )}

        {/* MODAIS */}
        <ProductModal 
          key={selectedProduct?.id} 
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddToCart={handleAddToCart}
        />

        <CartSidebar 
          items={cartItems}
          onRemoveItem={handleRemoveFromCart}
          open={isCartOpen}
          onOpenChange={setIsCartOpen}
          onCheckout={handleProceedToCheckout}
        />

        <CheckoutDialog 
          open={isCheckoutOpen}
          onOpenChange={setIsCheckoutOpen}
          cartItems={cartItems}
          cartTotal={cartTotal}
        />

        {/* BARRA FLUTUANTE INFERIOR */}
        {cartItems.length > 0 && (
          <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 shadow-[0_-5px_10px_rgba(0,0,0,0.05)] z-40 animate-in slide-in-from-bottom-5 duration-300">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total sem entrega</p>
                <p className="text-xl font-bold text-slate-900">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cartTotal)}
                </p>
                <p className="text-xs text-slate-400">
                  {cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}
                </p>
              </div>
              
              <Button 
                onClick={() => setIsCartOpen(true)}
                className="bg-green-600 hover:bg-green-700 text-white h-12 px-8 rounded-full font-semibold shadow-lg shadow-green-200"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Ver Sacola
              </Button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}