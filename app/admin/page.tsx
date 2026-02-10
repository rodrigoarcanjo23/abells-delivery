"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation" // Importante para redirecionar
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Clock, MapPin, ChefHat, Bike, CheckCircle, Plus, Pencil, Trash2, Utensils, LucideIcon, LogOut, Loader2 } from "lucide-react"

// --- TIPOS ---

type OrderStatus = 'pending' | 'preparing' | 'delivering' | 'completed' | 'cancelled'

const CATEGORIES = [
  "hamburguers", "hot-dog", "smashes", "entradas", "pizzas", "pizzas doce", "bebidas", "sobremesas", "milkshake"
]

interface AdminOrder {
  id: number
  customer: string
  items: string[]
  total: number
  status: OrderStatus
  time: string
  address?: string
  type: 'delivery' | 'pickup'
}

interface SupabaseOrder {
  id: number
  created_at: string
  customer_name: string
  total: number
  status: string
  delivery_address: string | null
  delivery_type: 'delivery' | 'pickup'
  order_items: {
    quantity: number
    product_name: string
  }[]
}

interface Product {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
}

interface OrderColumnProps {
  title: string
  status: OrderStatus
  icon: LucideIcon
  color: string
  orders: AdminOrder[]
  onUpdateStatus: (id: number, newStatus: OrderStatus) => void
}

// --- COMPONENTE DE COLUNA (KANBAN) ---
function OrderColumn({ title, status, icon: Icon, color, orders, onUpdateStatus }: OrderColumnProps) {
  return (
    <div className="flex flex-col h-full min-w-[300px] w-full md:w-1/3 bg-slate-50/50 rounded-xl border border-slate-200">
      <div className={`p-4 border-b flex items-center gap-2 ${color} bg-opacity-10`}>
        <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
        <h2 className="font-bold text-slate-700">{title}</h2>
        <Badge variant="secondary" className="ml-auto">{orders.length}</Badge>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-3">
          {orders.map((order) => (
            <Card key={order.id} className="bg-white hover:shadow-md border-slate-100">
              <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-sm font-bold">#{order.id}</CardTitle>
                  <span className="text-xs text-slate-400 font-mono">{order.time}</span>
                </div>
                <CardDescription className="font-medium text-slate-900 line-clamp-1">{order.customer}</CardDescription>
              </CardHeader>
              <CardContent className="p-4 py-2">
                 <div className="text-xs text-slate-500 space-y-1 mb-2">
                   {order.items.map((item, idx) => <p key={idx}>• {item}</p>)}
                 </div>
                 {order.type === 'delivery' && (
                   <div className="flex items-start gap-1 text-xs text-slate-400 mt-2">
                     <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
                     <span className="line-clamp-2">{order.address}</span>
                   </div>
                 )}
                 <div className="mt-2 text-right font-bold text-sm text-slate-700">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.total)}
                 </div>
              </CardContent>
              <Separator />
              <CardFooter className="p-3 bg-slate-50 flex gap-2 justify-end">
                {status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50" onClick={() => onUpdateStatus(order.id, 'cancelled')}>Rejeitar</Button>
                    <Button size="sm" className="h-8 text-xs bg-orange-500 hover:bg-orange-600 text-white" onClick={() => onUpdateStatus(order.id, 'preparing')}>Aceitar</Button>
                  </>
                )}
                {status === 'preparing' && (
                  <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 w-full text-white" onClick={() => onUpdateStatus(order.id, 'delivering')}>
                    <Bike className="w-3 h-3 mr-2" /> {order.type === 'delivery' ? 'Enviar' : 'Pronto'}
                  </Button>
                )}
                {status === 'delivering' && (
                  <Button size="sm" className="h-8 text-xs bg-green-600 hover:bg-green-700 w-full text-white" onClick={() => onUpdateStatus(order.id, 'completed')}>
                    <CheckCircle className="w-3 h-3 mr-2" /> Concluir
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
          {orders.length === 0 && <div className="text-center py-10 text-slate-400 text-sm border-2 border-dashed rounded-lg">Sem pedidos</div>}
        </div>
      </ScrollArea>
    </div>
  )
}

// --- PÁGINA ADMIN PRINCIPAL ---
export default function AdminPage() {
  const router = useRouter()
  const [loadingAuth, setLoadingAuth] = useState(true) // Estado de carregamento da Auth
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState("todos")
  
  // Estado do Formulário
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "", price: "", category: "hamburguers", image_url: "" })

  const mapSupabaseOrder = (dbOrder: SupabaseOrder): AdminOrder => {
    const items = dbOrder.order_items ? dbOrder.order_items.map((i) => `${i.quantity}x ${i.product_name}`) : []
    const date = new Date(dbOrder.created_at)
    return {
        id: dbOrder.id, 
        customer: dbOrder.customer_name, 
        items, 
        total: dbOrder.total,
        status: dbOrder.status as OrderStatus, 
        time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        address: dbOrder.delivery_address || undefined, 
        type: dbOrder.delivery_type
    }
  }

  // --- EFEITO 1: CHECAR LOGIN ---
  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
            router.push("/login")
        } else {
            setLoadingAuth(false)
        }
    }
    checkUser()
  }, [router])

  // --- EFEITO 2: CARREGAR DADOS (Só roda se estiver logado) ---
  useEffect(() => {
    if (loadingAuth) return // Não carrega dados enquanto não checar login

    const refreshOrders = async () => {
        const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
        if (data) {
          const rawData = data as unknown as SupabaseOrder[]
          setOrders(rawData.map(mapSupabaseOrder))
        }
    }

    const refreshProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('name')
        if (data) {
            setProducts(data as unknown as Product[])
        }
    }

    refreshOrders()
    refreshProducts()

    const channel = supabase.channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => { void refreshOrders() })
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [loadingAuth])

  // --- AÇÕES ---

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleUpdateStatus = async (id: number, newStatus: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o))
    await supabase.from('orders').update({ status: newStatus }).eq('id', id)
  }

  const reloadProductsList = async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    if (data) setProducts(data as unknown as Product[])
  }

  const handleSaveProduct = async () => {
    const priceValue = formData.price.toString().replace(',', '.')
    const productData = {
        name: formData.name, description: formData.description, price: parseFloat(priceValue), category: formData.category, image_url: formData.image_url
    }

    if (editingProduct) {
        await supabase.from('products').update(productData).eq('id', editingProduct.id)
    } else {
        await supabase.from('products').insert([productData])
    }

    setIsProductModalOpen(false)
    setEditingProduct(null)
    setFormData({ name: "", description: "", price: "", category: "hamburguers", image_url: "" })
    void reloadProductsList()
  }

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este produto?")) {
        await supabase.from('products').delete().eq('id', id)
        void reloadProductsList()
    }
  }

  const openEditModal = (product: Product) => {
    setEditingProduct(product)
    setFormData({
        name: product.name, description: product.description, price: product.price.toString(), category: product.category, image_url: product.image_url || ""
    })
    setIsProductModalOpen(true)
  }

  const filteredProducts = selectedCategory === "todos" ? products : products.filter(p => p.category === selectedCategory)

  // TELA DE LOADING (Enquanto verifica login)
  if (loadingAuth) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                <p className="text-slate-500 font-medium">Verificando acesso...</p>
            </div>
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b h-16 px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">🔥 Abell&apos;s Admin</h1>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Loja Aberta</Badge>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <Tabs defaultValue="menu" className="flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <TabsList>
                    <TabsTrigger value="menu">Gestão de Cardápio</TabsTrigger>
                    <TabsTrigger value="orders">Pedidos em Tempo Real</TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="orders" className="flex-1 h-full mt-0">
                <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-180px)] overflow-x-auto">
                    <OrderColumn title="Novos Pedidos" status="pending" icon={Clock} color="bg-orange-500" orders={orders.filter(o => o.status === 'pending')} onUpdateStatus={handleUpdateStatus} />
                    <OrderColumn title="Na Cozinha" status="preparing" icon={ChefHat} color="bg-blue-500" orders={orders.filter(o => o.status === 'preparing')} onUpdateStatus={handleUpdateStatus} />
                    <OrderColumn title="Saiu para Entrega" status="delivering" icon={Bike} color="bg-green-600" orders={orders.filter(o => o.status === 'delivering')} onUpdateStatus={handleUpdateStatus} />
                </div>
            </TabsContent>

            <TabsContent value="menu" className="flex-1 flex flex-col mt-0 h-full overflow-hidden">
                <div className="flex flex-col gap-4 h-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm shrink-0">
                        <div className="flex-1 w-full sm:w-auto overflow-hidden">
                             <ScrollArea className="w-full whitespace-nowrap">
                                <div className="flex space-x-2">
                                    <Button variant={selectedCategory === "todos" ? "default" : "secondary"} onClick={() => setSelectedCategory("todos")} className="h-8">Todos</Button>
                                    <Separator orientation="vertical" className="h-6" />
                                    {CATEGORIES.map((cat) => (
                                        <Button key={cat} variant={selectedCategory === cat ? "default" : "ghost"} onClick={() => setSelectedCategory(cat)} className="capitalize text-sm h-8">{cat}</Button>
                                    ))}
                                </div>
                                <ScrollBar orientation="horizontal" />
                            </ScrollArea>
                        </div>

                        <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full sm:w-auto bg-green-600 hover:bg-green-700 font-bold" onClick={() => { setEditingProduct(null); setFormData({ ...formData, category: "hamburguers" }) }}>
                                    <Plus className="w-4 h-4 mr-2" /> Adicionar Produto
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Nome do Produto</Label>
                                        <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Ex: X-Salada" />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Descrição</Label>
                                        <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Ingredientes..." />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="grid gap-2">
                                            <Label>Preço (R$)</Label>
                                            <Input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label>Categoria</Label>
                                            <Select value={formData.category} onValueChange={(val) => setFormData({...formData, category: val})}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>URL da Imagem</Label>
                                        <Input value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="https://..." />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleSaveProduct}>Salvar Produto</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <ScrollArea className="flex-1 h-full pb-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            {filteredProducts.map(product => (
                                <Card key={product.id} className="overflow-hidden flex flex-col h-full border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="relative h-40 bg-slate-100 group">
                                        {product.image_url ? (
                                            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="flex items-center justify-center h-full text-slate-400"><Utensils /></div>
                                        )}
                                        <Badge className="absolute top-2 right-2 capitalize bg-white/90 text-slate-800 hover:bg-white">{product.category}</Badge>
                                    </div>
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex justify-between items-start gap-2">
                                            <CardTitle className="text-base line-clamp-1" title={product.name}>{product.name}</CardTitle>
                                            <span className="font-bold text-green-600 whitespace-nowrap">R$ {product.price.toFixed(2)}</span>
                                        </div>
                                        <CardDescription className="line-clamp-2 text-xs h-8">{product.description}</CardDescription>
                                    </CardHeader>
                                    <CardFooter className="p-4 pt-0 mt-auto flex gap-2">
                                        <Button variant="outline" size="sm" className="flex-1" onClick={() => openEditModal(product)}>
                                            <Pencil className="w-3 h-3 mr-2" /> Editar
                                        </Button>
                                        <Button variant="destructive" size="icon" className="h-9 w-9 shrink-0" onClick={() => handleDeleteProduct(product.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                            {filteredProducts.length === 0 && (
                                <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                                    <Utensils className="h-12 w-12 mb-4 opacity-20" />
                                    <p>Nenhum produto encontrado.</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}