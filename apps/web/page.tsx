import { createClient } from './src/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function Page() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { data: todos } = await supabase.from('todos').select()

  return (
    <ul className="p-10">
      <h2 className="text-2xl font-bold mb-4">Ma Liste Task Pilot</h2>
      {todos?.map((todo) => (
        <li key={todo.id} className="mb-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
          {todo.name}
        </li>
      ))}
    </ul>
  )
}
