'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, Plus, Edit, Trash2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'

interface Category {
    id: string
    name: string
    type: string
    userId: string | null
    icon?: string
}

export default function CategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingCategory, setEditingCategory] = useState<Category | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        type: 'EXPENSE',
        icon: '',
    })

    const loadCategories = async () => {
        try {
            const res = await fetch('/api/categories')
            if (res.ok) setCategories(await res.json())
        } catch (error) {
            console.error('Erro ao carregar categorias:', error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCategories()
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
            const method = editingCategory ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (res.ok) {
                setShowModal(false)
                setEditingCategory(null)
                setFormData({ name: '', type: 'EXPENSE', icon: '' })
                loadCategories()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao salvar categoria')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao salvar categoria')
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta categoria?')) return

        try {
            const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
            if (res.ok) {
                loadCategories()
            } else {
                const error = await res.json()
                alert(error.error || 'Erro ao excluir categoria')
            }
        } catch (error) {
            console.error('Erro:', error)
            alert('Erro ao excluir categoria')
        }
    }

    const openEditModal = (category: Category) => {
        setEditingCategory(category)
        setFormData({
            name: category.name,
            type: category.type,
            icon: category.icon || '',
        })
        setShowModal(true)
    }

    if (loading) return <LoadingSpinner />

    const userCategories = categories.filter(c => c.userId !== null)
    const systemCategories = categories.filter(c => c.userId === null)

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Categorias</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Organize suas transações</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="h-5 w-5" />
                    Nova Categoria
                </button>
            </div>

            
            <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Minhas Categorias</h2>
                {userCategories.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                        <p className="text-gray-600 dark:text-gray-400">Nenhuma categoria personalizada</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userCategories.map((category) => (
                            <div key={category.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${category.type === 'INCOME' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                                        <TrendingUp className={`h-5 w-5 ${category.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`} />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{category.name}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {category.type === 'INCOME' ? 'Receita' : 'Despesa'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => openEditModal(category)}
                                        className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(category.id)}
                                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            
            <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Categorias do Sistema</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {systemCategories.map((category) => (
                        <div key={category.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${category.type === 'INCOME' ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                                <TrendingUp className={`h-5 w-5 ${category.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`} />
                            </div>
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">{category.name}</p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    {category.type === 'INCOME' ? 'Receita' : 'Despesa'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                            {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Nome
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Tipo
                                </label>
                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                >
                                    <option value="INCOME">Receita</option>
                                    <option value="EXPENSE">Despesa</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowModal(false)
                                        setEditingCategory(null)
                                    }}
                                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    {editingCategory ? 'Salvar' : 'Criar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
