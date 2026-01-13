import Link from 'next/link'
import { ArrowRight, TrendingUp, Target, PiggyBank, BarChart3 } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900 dark:text-white">FinanPlus</span>
          </div>
          <div className="space-x-4">
            <Link
              href="/login"
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Começar Agora
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
          Controle Total das Suas
          <span className="text-blue-600 block">Finanças Pessoais</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
          Gerencie seus gastos, investimentos e metas financeiras em um só lugar.
          Simples, intuitivo e poderoso.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/register"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-lg"
          >
            Começar Gratuitamente
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
          Tudo que você precisa para suas finanças
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8 text-blue-600" />}
            title="Dashboard Inteligente"
            description="Visualize todas suas finanças em gráficos e relatórios personalizáveis"
          />
          <FeatureCard
            icon={<PiggyBank className="h-8 w-8 text-blue-600" />}
            title="Contas e Cartões"
            description="Gerencie múltiplas contas bancárias e cartões de crédito"
          />
          <FeatureCard
            icon={<Target className="h-8 w-8 text-blue-600" />}
            title="Metas Financeiras"
            description="Defina e acompanhe suas metas com previsões automáticas"
          />
          <FeatureCard
            icon={<TrendingUp className="h-8 w-8 text-blue-600" />}
            title="Análises Detalhadas"
            description="Entenda para onde vai seu dinheiro com análises por categoria"
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para assumir o controle?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Junte-se a milhares de pessoas que já estão transformando suas finanças
          </p>
          <Link
            href="/register"
            className="inline-block px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
          >
            Criar Conta Grátis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-600 dark:text-gray-400">
          <p>&copy; 2026 FinanPlus. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-300">
        {description}
      </p>
    </div>
  )
}
