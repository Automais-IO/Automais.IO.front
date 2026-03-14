import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function ActivityChart() {
  // TODO: Implementar busca de dados reais quando a API estiver disponível
  const data = []

  // Gerar dados vazios para os últimos 7 dias
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const emptyData = days.map(name => ({ name, mensagens: 0 }))

  return (
    <div className="card p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Atividade Semanal</h3>
        <p className="text-sm text-gray-600 mt-1">Mensagens recebidas por dia</p>
      </div>

      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px]">
          <p className="text-gray-600">Nenhum dado de atividade disponível</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data.length > 0 ? data : emptyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="name" 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fill: '#6b7280', fontSize: 12 }}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              cursor={{ fill: 'rgba(168, 85, 247, 0.1)' }}
            />
            <Bar 
              dataKey="mensagens" 
              fill="url(#colorGradient)" 
              radius={[8, 8, 0, 0]}
            />
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#7c3aed" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

