import { useEffect, useState } from 'react'
import { getAdminOverview } from '../api/client'
import {
  StoreIcon,
  UsersIcon,
  CalendarIcon,
  CheckCircleIcon,
  FlagIcon,
  BanIcon,
  DollarIcon,
  ChartIcon,
} from '../components/Icons'

const fmtMoney = (n) =>
  `$${Number(n ?? 0).toLocaleString('es', { minimumFractionDigits: 0 })}`

function Card({ label, value, sub, Icon, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs uppercase tracking-wide text-gray-500">{label}</span>
        <div className={`p-1.5 rounded-md ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function AdminOverview() {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)

  useEffect(() => {
    getAdminOverview().then(setData).catch((e) => setErr(e.message))
  }, [])

  if (err) return <div className="text-red-600 text-sm">{err}</div>
  if (!data) return <div className="text-gray-500">Cargando…</div>

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Plataforma</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Negocios" value={data.totalBusinesses} Icon={StoreIcon} color="bg-indigo-50 text-indigo-700" />
          <Card label="Usuarios" value={data.totalUsers} Icon={UsersIcon} color="bg-blue-50 text-blue-700" />
          <Card label="Citas totales" value={data.totalAppointments} Icon={CalendarIcon} color="bg-amber-50 text-amber-700" />
          <Card label="Ingresos totales" value={fmtMoney(data.totalRevenue)} Icon={DollarIcon} color="bg-purple-50 text-purple-700" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Estado de citas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Card label="Activas" value={data.activeAppointments} Icon={CheckCircleIcon} color="bg-green-50 text-green-700" />
          <Card label="Completadas" value={data.completedAppointments} Icon={FlagIcon} color="bg-emerald-50 text-emerald-700" />
          <Card label="Canceladas" value={data.cancelledAppointments} Icon={BanIcon} color="bg-red-50 text-red-600" />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Crecimiento reciente</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label="Negocios 7d" value={data.newBusinesses7d} Icon={StoreIcon} color="bg-indigo-50 text-indigo-700" />
          <Card label="Negocios 30d" value={data.newBusinesses30d} Icon={StoreIcon} color="bg-indigo-50 text-indigo-700" />
          <Card label="Citas 7d" value={data.appointments7d} Icon={ChartIcon} color="bg-amber-50 text-amber-700" />
          <Card label="Citas 30d" value={data.appointments30d} sub={`Ingresos: ${fmtMoney(data.revenue30d)}`} Icon={ChartIcon} color="bg-amber-50 text-amber-700" />
        </div>
      </section>
    </div>
  )
}
