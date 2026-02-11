"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
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

// --- TIPAGEM ---
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

// --- COMPONENTE DE COLUNA KANBAN ---
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
                    <Button size="sm" variant="outline" className="h-8 text-xs text-red-600 border-red-200" onClick={() => onUpdateStatus(order.id, 'cancelled')}>Rejeitar</Button>
                    <Button size="sm" className="h-8 text-xs bg-orange-500 text-white" onClick={() => onUpdateStatus(order.id, 'preparing')}>Aceitar</Button>
                  </>
                )}
                {status === 'preparing' && (
                  <Button size="sm" className="h-8 text-xs bg-blue-600 text-white w-full" onClick={() => onUpdateStatus(order.id, 'delivering')}>
                    Pronto para {order.type === 'delivery' ? 'Entrega' : 'Retirada'}
                  </Button>
                )}
                {status === 'delivering' && (
                  <Button size="sm" className="h-8 text-xs bg-green-600 text-white w-full" onClick={() => onUpdateStatus(order.id, 'completed')}>Concluir</Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [selectedCategory, setSelectedCategory] = useState("todos")
  
  const [isProductModalOpen, setIsProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "", price: "", category: "hamburguers", image_url: "" })

  const mapSupabaseOrder = useCallback((dbOrder: SupabaseOrder): AdminOrder => {
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
  }, [])

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('*').order('name')
    if (data) setProducts(data as unknown as Product[])
  }, [])

  const fetchOrders = useCallback(async () => {
      const { data } = await supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false })
      if (data) {
        const rawData = data as unknown as SupabaseOrder[]
        setOrders(rawData.map(mapSupabaseOrder))
      }
  }, [mapSupabaseOrder])

  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) router.push("/login")
        else setLoadingAuth(false)
    }
    checkUser()
  }, [router])

  useEffect(() => {
    if (loadingAuth) return

    fetchOrders()
    fetchProducts()

    const channel = supabase.channel('admin_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          // CORREÇÃO LINHA 197: IIFE para evitar erro de retorno de Promise
          (async () => {
              await fetchOrders();
          })();
      })
      .subscribe()
      
    return () => { supabase.removeChannel(channel) }
  }, [loadingAuth, fetchOrders, fetchProducts])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push("/login")
  }

  const handleUpdateStatus = async (id: number, newStatus: OrderStatus) => {
    await supabase.from('orders').update({ status: newStatus }).eq('id', id)
    void fetchOrders()
  }

  const handleSaveProduct = async () => {
    const priceValue = formData.price.toString().replace(',', '.')
    const productData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(priceValue),
        category: formData.category,
        image_url: formData.image_url
    }

    if (editingProduct) await supabase.from('products').update(productData).eq('id', editingProduct.id)
    else await supabase.from('products').insert([productData])

    setIsProductModalOpen(false)
    setEditingProduct(null)
    setFormData({ name: "", description: "", price: "", category: "hamburguers", image_url: "" })
    void fetchProducts()
  }

  const handleDeleteProduct = async (id: string) => {
    if (confirm("Deseja excluir este produto?")) {
        await supabase.from('products').delete().eq('id', id)
        void fetchProducts()
    }
  }

  const filteredProducts = selectedCategory === "todos" ? products : products.filter(p => p.category === selectedCategory)

  if (loadingAuth) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 text-slate-400">
            <Loader2 className="animate-spin mr-2" /> Verificando acesso...
        </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="bg-white border-b h-16 px-6 flex items-center justify-between shadow-sm z-10">
        <h1 className="text-xl font-bold text-slate-800">🔥 Abell&apos;s Admin</h1>
        <Button variant="ghost" size="sm" onClick={handleLogout} className="text-slate-500 hover:text-red-600">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </Button>
      </header>

      <main className="flex-1 p-6 overflow-hidden flex flex-col">
        <Tabs defaultValue="menu" className="flex-1 flex flex-col">
            <TabsList className="mb-4 w-fit">
                <TabsTrigger value="menu">Cardápio</TabsTrigger>
                <TabsTrigger value="orders">Pedidos</TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="flex-1 h-full mt-0">
                <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-180px)] overflow-x-auto">
                    <OrderColumn title="Novos" status="pending" icon={Clock} color="bg-orange-500" orders={orders.filter(o => o.status === 'pending')} onUpdateStatus={handleUpdateStatus} />
                    <OrderColumn title="Preparo" status="preparing" icon={ChefHat} color="bg-blue-500" orders={orders.filter(o => o.status === 'preparing')} onUpdateStatus={handleUpdateStatus} />
                    <OrderColumn title="Entrega" status="delivering" icon={Bike} color="bg-green-600" orders={orders.filter(o => o.status === 'delivering')} onUpdateStatus={handleUpdateStatus} />
                </div>
            </TabsContent>

            <TabsContent value="menu" className="flex-1 flex flex-col mt-0 h-full overflow-hidden">
                <div className="flex flex-col gap-4 bg-white p-4 rounded-lg border mb-4">
                  <div className="flex justify-between items-center">
                    <ScrollArea className="w-full whitespace-nowrap mr-4">
                      <div className="flex space-x-2">
                        <Button variant={selectedCategory === "todos" ? "default" : "secondary"} size="sm" onClick={() => setSelectedCategory("todos")}>Todos</Button>
                        {CATEGORIES.map(cat => (
                          <Button key={cat} variant={selectedCategory === cat ? "default" : "ghost"} size="sm" className="capitalize" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
                        ))}
                      </div>
                      <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    <Dialog open={isProductModalOpen} onOpenChange={setIsProductModalOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => {setEditingProduct(null); setFormData({name: "", description: "", price: "", category: "hamburguers", image_url: ""})}}>
                                <Plus className="w-4 h-4 mr-1" /> Novo
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>{editingProduct ? "Editar" : "Novo"} Produto</DialogTitle></DialogHeader>
                            <div className="grid gap-3 py-4">
                                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Nome" />
                                <Textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Descrição" />
                                <div className="grid grid-cols-2 gap-2">
                                    <Input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="Preço" />
                                    <Select value={formData.category} onValueChange={(val: string) => setFormData(prev => ({...prev, category: val}))}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <Input value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} placeholder="URL Imagem" />
                            </div>
                            <Button onClick={handleSaveProduct} className="w-full">Salvar</Button>
                        </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-20">
                    {filteredProducts.map(product => (
                      <Card key={product.id} className="overflow-hidden border-slate-200">
                        <div className="h-32 bg-slate-100">
                          {product.image_url && <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />}
                        </div>
                        <CardHeader className="p-3">
                          <CardTitle className="text-sm line-clamp-1">{product.name}</CardTitle>
                          <p className="text-green-600 font-bold text-sm">R$ {product.price.toFixed(2)}</p>
                        </CardHeader>
                        <CardFooter className="p-3 pt-0 flex gap-2">
                          <Button variant="outline" size="sm" className="flex-1 h-8" onClick={() => {
                            setEditingProduct(product);
                            setFormData({name: product.name, description: product.description, price: product.price.toString(), category: product.category, image_url: product.image_url || ""});
                            setIsProductModalOpen(true);
                          }}>Editar</Button>
                          <Button variant="destructive" size="icon" className="h-8 w-8" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="h-4 w-4" /></Button>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
            </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}